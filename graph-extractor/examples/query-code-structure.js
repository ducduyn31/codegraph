#!/usr/bin/env node
/**
 * Example script that demonstrates how to use the Graph Extractor MCP server
 * to query code structure.
 * 
 * Usage:
 * node query-code-structure.js <repository-path> <file-path>
 * 
 * Example:
 * node query-code-structure.js /path/to/repo src/index.ts
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the MCP server
const serverPath = join(__dirname, '..', 'build', 'index.js');

// Get command line arguments
const [, , repositoryPath, filePath] = process.argv;

if (!repositoryPath || !filePath) {
  console.error('Usage: node query-code-structure.js <repository-path> <file-path>');
  process.exit(1);
}

// Start the MCP server
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', process.stderr],
  env: {
    ...process.env,
    NEO4J_URI: 'neo4j://localhost:7687',
    NEO4J_USERNAME: 'neo4j',
    NEO4J_PASSWORD: 'password',
  },
});

// Handle server output
let buffer = '';
server.stdout.on('data', (data) => {
  buffer += data.toString();
  tryParseResponses();
});

// Handle server exit
server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Parse and handle MCP responses
function tryParseResponses() {
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    try {
      const message = JSON.parse(line);
      handleMessage(message);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }
}

// Handle MCP messages
function handleMessage(message) {
  if (message.type === 'response' && message.id === 'build-graph') {
    // If the build graph operation was successful, query the code structure
    if (!message.error) {
      sendQueryCodeStructure();
    } else {
      console.error('Error building graph:', message.error);
      server.kill();
    }
  } else if (message.type === 'response' && message.id === 'query-structure') {
    // Display the query result
    if (!message.error) {
      console.log('\nCode Structure:');
      console.log(message.result.content[0].text);
    } else {
      console.error('Error querying code structure:', message.error);
    }
    server.kill();
  }
}

// Send a request to build the graph
function sendBuildGraph() {
  const request = {
    type: 'request',
    id: 'build-graph',
    method: 'callTool',
    params: {
      name: 'build_graph',
      arguments: {
        repositoryPath,
        repositoryName: repositoryPath.split('/').pop(),
        filePatterns: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
      },
    },
  };

  console.log('Building graph...');
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Send a request to query the code structure
function sendQueryCodeStructure() {
  const request = {
    type: 'request',
    id: 'query-structure',
    method: 'callTool',
    params: {
      name: 'query_code_structure',
      arguments: {
        filePath: join(repositoryPath, filePath),
        depth: 2,
        format: 'markdown',
      },
    },
  };

  console.log('Querying code structure...');
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Start the process by building the graph
sendBuildGraph();