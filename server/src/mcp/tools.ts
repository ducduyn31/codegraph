import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  listServicesSchema,
  listServiceFilesSchema,
  visualizeServiceInteractionsSchema,
  getCodeContextSchema,
  traceErrorPathSchema,
} from './tool-schemas';
import {
  listServices,
  listServiceFiles,
  visualizeServiceInteractions,
  getCodeContext,
  traceErrorPath,
} from './tools/index';

/**
 * Set up tool handlers for the MCP server
 * 
 * @param server The MCP server instance
 */
export function setupToolHandlers(server: Server): void {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'list_services',
        description: 'List all services in the microservices architecture with their key information',
        inputSchema: listServicesSchema,
      },
      {
        name: 'list_service_files',
        description: 'List files and folders within a specific service',
        inputSchema: listServiceFilesSchema,
      },
      {
        name: 'visualize_service_interactions',
        description: 'Visualize API calls and message events within a code context',
        inputSchema: visualizeServiceInteractionsSchema,
      },
      {
        name: 'get_code_context',
        description: 'Retrieve code context for a specific location',
        inputSchema: getCodeContextSchema,
      },
      {
        name: 'trace_error_path',
        description: 'Trace the execution path of an error across services',
        inputSchema: traceErrorPathSchema,
      },
    ],
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    
    switch (name) {
      case 'list_services':
        return await listServices(args as any);
      
      case 'list_service_files':
        if (!args.service || typeof args.service !== 'string') {
          throw new McpError(ErrorCode.InvalidParams, 'Service name is required');
        }
        return await listServiceFiles(args as any);
      
      case 'visualize_service_interactions':
        if (!args.context || typeof args.context !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, 'Context is required');
        }
        return await visualizeServiceInteractions(args as any);
      
      case 'get_code_context':
        if (!args.service || typeof args.service !== 'string') {
          throw new McpError(ErrorCode.InvalidParams, 'Service name is required');
        }
        if (!args.file || typeof args.file !== 'string') {
          throw new McpError(ErrorCode.InvalidParams, 'File path is required');
        }
        return await getCodeContext(args as any);
      
      case 'trace_error_path':
        if (!args.errorTrace || typeof args.errorTrace !== 'string') {
          throw new McpError(ErrorCode.InvalidParams, 'Error trace is required');
        }
        return await traceErrorPath(args as any);
      
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  });
}