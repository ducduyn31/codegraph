#!/usr/bin/env node
import dotenv from 'dotenv';
import './mcp';

// Load environment variables
dotenv.config();

console.log('Code Structure MCP server starting...');

// The actual MCP server implementation is in ./mcp/index.ts

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});