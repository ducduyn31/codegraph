#!/usr/bin/env node
/**
 * Example of programmatically using the graph-extractor
 * 
 * This example shows how to use the graph-extractor as a library in your own Node.js applications.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StorageFactory, StorageType } from '../build/storage/factory.js';
import { ParserFactory } from '../build/parsers/factory.js';
import { GraphBuilder } from '../build/graph/graph-builder.js';
import { QueryEngine } from '../build/query/query-engine.js';

// Get the current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Main function
 */
async function main() {
  try {
    // Configure Neo4j connection
    const storageConfig = {
      type: StorageType.Neo4j,
      uri: process.env.NEO4J_URI || 'neo4j://localhost:7687',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'password',
    };
    
    // Initialize storage
    const storage = StorageFactory.createStorage(storageConfig);
    
    // Initialize parsers
    ParserFactory.initialize();
    
    // Initialize graph builder
    const graphBuilder = new GraphBuilder(storage);
    
    // Initialize query engine
    const queryEngine = new QueryEngine(storage);
    
    // Define repository path and name
    const repositoryPath = path.resolve(__dirname, '../../sample-stacks/svc-user');
    const repositoryName = 'user-service';
    
    // Define file patterns
    const filePatterns = ['**/*.ts', '**/*.js'];
    
    console.log(`Analyzing repository: ${repositoryName}`);
    console.log(`Repository path: ${repositoryPath}`);
    
    // Find files matching patterns
    const glob = (await import('glob')).glob;
    const files = [];
    
    for (const pattern of filePatterns) {
      const matches = await glob(pattern, { cwd: repositoryPath, absolute: true });
      files.push(...matches);
    }
    
    console.log(`Found ${files.length} files matching patterns`);
    
    if (files.length === 0) {
      console.warn('No files found matching the specified patterns.');
      process.exit(0);
    }
    
    // Build the graph
    console.log('Building graph...');
    const graph = await graphBuilder.buildGraph(files, repositoryName, true);
    console.log(`Graph built successfully with ${graph.nodes.length} nodes and ${graph.edges.length} edges`);
    
    // Example: Query the graph
    console.log('\nQuerying the graph...');
    const result = await queryEngine.queryCodeStructure({
      filePath: files[0], // Query the first file
      depth: 2,
    });
    
    console.log(`Query result: ${result.nodes.length} nodes and ${result.edges.length} edges`);
    
    // Close the connection
    await storage.disconnect();
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);