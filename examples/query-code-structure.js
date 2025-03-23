#!/usr/bin/env node

/**
 * This is an example script that demonstrates how to use the graph-extractor
 * module to query the code structure graph.
 * 
 * Usage:
 *   node query-code-structure.js <path-to-codebase>
 * 
 * Example:
 *   node query-code-structure.js ../server
 */

const path = require('path');
const { extractCodeStructure, queryGraph } = require('../graph-extractor');

async function main() {
  try {
    // Get the path to the codebase from command line arguments
    const codebasePath = process.argv[2];
    
    if (!codebasePath) {
      console.error('Please provide a path to the codebase');
      console.error('Usage: node query-code-structure.js <path-to-codebase>');
      process.exit(1);
    }
    
    const absolutePath = path.resolve(codebasePath);
    console.log(`Analyzing codebase at: ${absolutePath}`);
    
    // Extract code structure from the codebase
    console.log('Extracting code structure...');
    await extractCodeStructure(absolutePath);
    
    // Query the graph for different types of information
    console.log('\n--- Code Structure Overview ---');
    
    // Get all files
    const files = await queryGraph('MATCH (f:File) RETURN f.path AS path ORDER BY path');
    console.log(`\nFound ${files.length} files:`);
    files.slice(0, 5).forEach(file => console.log(`- ${file.path}`));
    if (files.length > 5) console.log(`... and ${files.length - 5} more`);
    
    // Get all classes
    const classes = await queryGraph('MATCH (c:Class) RETURN c.name AS name ORDER BY name');
    console.log(`\nFound ${classes.length} classes:`);
    classes.slice(0, 5).forEach(cls => console.log(`- ${cls.name}`));
    if (classes.length > 5) console.log(`... and ${classes.length - 5} more`);
    
    // Get all functions
    const functions = await queryGraph('MATCH (f:Function) RETURN f.name AS name ORDER BY name');
    console.log(`\nFound ${functions.length} functions:`);
    functions.slice(0, 5).forEach(func => console.log(`- ${func.name}`));
    if (functions.length > 5) console.log(`... and ${functions.length - 5} more`);
    
    // Get relationships between files
    const fileRelationships = await queryGraph(`
      MATCH (f1:File)-[r:IMPORTS]->(f2:File)
      RETURN f1.path AS source, f2.path AS target, count(r) AS count
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('\nTop file relationships:');
    fileRelationships.forEach(rel => {
      console.log(`- ${rel.source} imports ${rel.target} (${rel.count} times)`);
    });
    
    // Get complex relationships (function calls across files)
    const functionCalls = await queryGraph(`
      MATCH (f1:Function)-[r:CALLS]->(f2:Function)
      MATCH (f1)<-[:CONTAINS]-(file1:File)
      MATCH (f2)<-[:CONTAINS]-(file2:File)
      WHERE file1 <> file2
      RETURN f1.name AS caller, file1.path AS callerFile, 
             f2.name AS callee, file2.path AS calleeFile
      LIMIT 10
    `);
    
    console.log('\nCross-file function calls:');
    functionCalls.forEach(call => {
      console.log(`- ${call.caller} in ${call.callerFile} calls ${call.callee} in ${call.calleeFile}`);
    });
    
    console.log('\nAnalysis complete!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();