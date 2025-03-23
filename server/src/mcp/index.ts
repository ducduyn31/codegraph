#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setupResourceHandlers } from './resources';
import { setupToolHandlers } from './tools';

/**
 * Code Graph Server
 * 
 * This server provides tools for debugging microservices architectures:
 * - list_services: List all services in the microservices architecture
 * - list_service_files: List files and folders within a specific service
 * - visualize_service_interactions: Visualize API calls and message events
 * - get_code_context: Retrieve code context for a specific location
 * - trace_error_path: Trace the execution path of an error across services
 */
class CodeGraphServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'code-graph-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Set up resource and tool handlers
    setupResourceHandlers(this.server);
    setupToolHandlers(this.server);
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Code Structure MCP server running on stdio');
  }
}

// Create and run the server
const server = new CodeGraphServer();
server.run().catch(console.error);

export default server;