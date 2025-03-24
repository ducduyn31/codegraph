#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { program } from 'commander';
import { glob } from 'glob';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import ignore from 'ignore';

import { StorageFactory, StorageType } from './storage/factory.js';
import { ParserFactory } from './parsers/factory.js';
import { GraphBuilder } from './graph/graph-builder.js';
// Import QueryEngine only when needed
// import { QueryEngine } from './query/query-engine.js';
// import { McpTools } from './tools/index.js';
// import { ContextFormat } from './query/context-assembler.js';
import { loadConfig } from './config.js';

const execAsync = promisify(exec);

/**
 * Create a readline interface for user input
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Ask for user confirmation
 */
async function askForConfirmation(question: string): Promise<boolean> {
  const rl = createReadlineInterface();
  
  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Extract repository name from GitHub URL
 */
function extractRepoNameFromUrl(url: string): string {
  // Handle both HTTPS and SSH URLs
  if (url.startsWith('https://')) {
    // https://github.com/username/repo.git or https://github.com/username/repo
    const parts = url.replace(/\.git$/, '').split('/');
    return parts[parts.length - 1];
  }
  
  if (url.startsWith('git@')) {
    // git@github.com:username/repo.git
    const parts = url.replace(/\.git$/, '').split(':')[1].split('/');
    return parts[parts.length - 1];
  }
  
  // Fallback: just use the last part of the URL
  const parts = url.replace(/\.git$/, '').split('/');
  return parts[parts.length - 1];
}

/**
 * Clone a GitHub repository
 */
async function cloneRepository(url: string, targetDir: string): Promise<string> {
  console.log(`Cloning repository from ${url}...`);
  
  try {
    await execAsync(`git clone ${url} ${targetDir}`);
    console.log(`Repository cloned successfully to ${targetDir}`);
    return targetDir;
  } catch (error) {
    if (error instanceof Error) {
      // Check if it's an authentication error
      if (error.message.includes('Authentication failed') || 
          error.message.includes('Permission denied')) {
        console.error('Authentication failed. This might be a private repository.');
        
        const useSSH = await askForConfirmation(
          'Would you like to try cloning with SSH? (Make sure your SSH key is set up with GitHub)'
        );
        
        if (useSSH) {
          // Convert HTTPS URL to SSH URL
          if (url.startsWith('https://github.com/')) {
            const sshUrl = `git@github.com:${url.replace('https://github.com/', '').replace(/\.git$/, '')}.git`;
            
            console.log(`Trying with SSH URL: ${sshUrl}`);
            return cloneRepository(sshUrl, targetDir);
          }
        }
      }
    }
    
    console.error('Failed to clone repository:', error);
    throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Find all .gitignore files in a directory and its subdirectories
 * @param dir Root directory to search in
 * @returns Map of directory paths to their corresponding .gitignore content
 */
async function findGitignoreFiles(dir: string): Promise<Map<string, string>> {
  const gitignoreFiles = await glob('**/.gitignore', {
    cwd: dir,
    absolute: true,
    dot: false
  });
  
  const gitignoreMap = new Map<string, string>();
  
  for (const gitignorePath of gitignoreFiles) {
    const gitignoreDir = path.dirname(gitignorePath);
    const content = fs.readFileSync(gitignorePath, 'utf8');
    gitignoreMap.set(gitignoreDir, content);
  }
  
  return gitignoreMap;
}

/**
 * Find files matching patterns in a directory, optionally respecting .gitignore files
 * in the root and subdirectories
 * @param dir Directory to search in
 * @param patterns Glob patterns to match
 * @param respectGitignore Whether to respect .gitignore files (default: true)
 */
async function findFiles(
  dir: string,
  patterns: string[],
  respectGitignore = true
): Promise<string[]> {
  try {
    // First, collect all files matching the patterns
    const allFiles: string[] = [];
    
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: dir,
        absolute: true,
        dot: false // Don't include dotfiles by default
      });
      allFiles.push(...matches);
    }
    
    // If not respecting .gitignore, return all files
    if (!respectGitignore) {
      console.log('Not respecting .gitignore files as configured');
      return allFiles;
    }
    
    // Find all .gitignore files in the repository
    console.log('Looking for .gitignore files in the repository...');
    const gitignoreMap = await findGitignoreFiles(dir);
    
    if (gitignoreMap.size === 0) {
      console.log('No .gitignore files found');
      return allFiles;
    }
    
    console.log(`Found ${gitignoreMap.size} .gitignore files`);
    
    // Create a map of directories to their ignore instances
    const ignoreMap = new Map<string, ReturnType<typeof ignore>>();
    
    for (const [dirPath, content] of gitignoreMap.entries()) {
      ignoreMap.set(dirPath, ignore().add(content));
    }
    
    // Filter files based on .gitignore rules
    const filteredFiles = allFiles.filter(file => {
      // For each file, find the closest .gitignore file that applies to it
      const fileDir = path.dirname(file);
      
      // Check each directory in the path, from the file's directory up to the root
      let currentDir = fileDir;
      
      while (currentDir.startsWith(dir)) {
        if (ignoreMap.has(currentDir)) {
          const ig = ignoreMap.get(currentDir);
          if (ig) {
            const relativePath = path.relative(currentDir, file);
            
            // If the file is ignored by this .gitignore, exclude it
            if (ig.ignores(relativePath)) {
              return false;
            }
          }
        }
        
        // Move up one directory
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
          // We've reached the root
          break;
        }
        currentDir = parentDir;
      }
      
      // If no .gitignore excludes this file, include it
      return true;
    });
    
    return filteredFiles;
  } catch (error) {
    console.error('Error finding files:', error);
    throw error;
  }
}

/**
 * Main function to run the graph extractor
 */
async function main() {
  // Define CLI options
  program
    .name('graph-extractor')
    .description('Extract code structure into a graph database')
    .version('0.1.0')
    .option('-r, --repo <url>', 'GitHub repository URL to clone and analyze')
    .option('-d, --dir <path>', 'Local directory to analyze (instead of cloning)')
    .option('-n, --name <name>', 'Repository name (defaults to extracted from URL or directory name)')
    .option('-p, --patterns <patterns>', 'File patterns to include (comma-separated, defaults to *.ts,*.js,*.tsx,*.jsx)')
    .option('-o, --output <format>', 'Output format (json, text, markdown)', 'markdown')
    .option('--neo4j-uri <uri>', 'Neo4j URI', 'neo4j://localhost:7687')
    .option('--neo4j-user <user>', 'Neo4j username', 'neo4j')
    .option('--neo4j-pass <password>', 'Neo4j password', 'bitnami1')
    .option('--reset', 'Reset the database before building the graph', true)
    .option('--no-gitignore', 'Disable respecting .gitignore files')
    .parse(process.argv);

  const options = program.opts();
  
  // Validate options
  if (!options.repo && !options.dir) {
    console.error('Error: Either --repo or --dir must be specified');
    program.help();
    process.exit(1);
  }
  
  try {
    // Load configuration with CLI overrides
    const config = {
      ...loadConfig(),
      neo4j: {
        uri: options.neo4jUri || process.env.NEO4J_URI || 'neo4j://localhost:7687',
        username: options.neo4jUser || process.env.NEO4J_USERNAME || 'neo4j',
        password: options.neo4jPass || process.env.NEO4J_PASSWORD || 'bitnami1',
      },
      respectGitignore: options.gitignore !== false // Use CLI option if provided, otherwise use config default
    };
    
    // Initialize storage
    const storageConfig = {
      type: StorageType.Neo4j,
      uri: config.neo4j.uri,
      username: config.neo4j.username,
      password: config.neo4j.password,
    };
    const storage = StorageFactory.createStorage(storageConfig);
    
    // Initialize parsers
    ParserFactory.initialize();
    
    // Initialize graph builder
    const graphBuilder = new GraphBuilder(storage);
    
    // Initialize query engine (commented out as not used in CLI mode, but kept for future use)
    // const queryEngine = new QueryEngine(storage);
    
    // Determine repository path
    let repositoryPath: string;
    let repositoryName: string;
    
    if (options.repo) {
      // Clone the repository if URL is provided
      const repoUrl = options.repo;
      const extractedName = extractRepoNameFromUrl(repoUrl);
      const tempDir = path.join(process.cwd(), 'temp', extractedName);
      
      // Check if directory already exists
      if (fs.existsSync(tempDir)) {
        const overwrite = await askForConfirmation(
          `Directory ${tempDir} already exists. Do you want to overwrite it?`
        );
        
        if (overwrite) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } else {
          console.log('Using existing directory...');
        }
      }
      
      // Clone the repository
      if (!fs.existsSync(tempDir)) {
        const confirmed = await askForConfirmation(
          `This will clone the repository ${repoUrl} to ${tempDir}. Continue?`
        );
        
        if (!confirmed) {
          console.log('Operation cancelled by user.');
          process.exit(0);
        }
        
        repositoryPath = await cloneRepository(repoUrl, tempDir);
      } else {
        repositoryPath = tempDir;
      }
      
      repositoryName = options.name || extractedName;
    } else {
      // Use local directory
      repositoryPath = path.resolve(options.dir);
      
      if (!fs.existsSync(repositoryPath)) {
        console.error(`Error: Directory ${repositoryPath} does not exist`);
        process.exit(1);
      }
      
      repositoryName = options.name || path.basename(repositoryPath);
    }
    
    // Determine file patterns
    const filePatterns = options.patterns
      ? options.patterns.split(',')
      : ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'];
    
    console.log(`Analyzing repository: ${repositoryName}`);
    console.log(`Repository path: ${repositoryPath}`);
    console.log(`File patterns: ${filePatterns.join(', ')}`);
    console.log(`Respecting .gitignore files: ${config.respectGitignore ? 'Yes' : 'No'}`);
    
    // Find files matching patterns
    const files = await findFiles(repositoryPath, filePatterns, config.respectGitignore);
    console.log(`Found ${files.length} files matching patterns`);
    
    if (files.length === 0) {
      console.warn('No files found matching the specified patterns.');
      process.exit(0);
    }
    
    // Build the graph
    console.log('Building graph...');
    const graph = await graphBuilder.buildGraph(files, repositoryName, options.reset);
    console.log(`Graph built successfully with ${graph.nodes.length} nodes and ${graph.edges.length} edges`);
    
    // Output summary
    console.log('\nGraph Summary:');
    console.log(`- Repository: ${repositoryName}`);
    console.log(`- Files analyzed: ${files.length}`);
    console.log(`- Nodes created: ${graph.nodes.length}`);
    console.log(`- Relationships created: ${graph.edges.length}`);
    console.log(`- Neo4j URI: ${config.neo4j.uri}`);
    console.log(`- Respected .gitignore: ${config.respectGitignore ? 'Yes' : 'No'}`);
    
    console.log('\nYou can now query the graph using the Neo4j browser or other tools.');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);