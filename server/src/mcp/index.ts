#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  NodeType,
  RelationshipType,
  Graph,
  QueryResult,
  formatError
} from 'common';
import neo4jService from '../services/neo4j';

class CodeStructureServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'code-structure-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupResourceHandlers();
    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupResourceHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: `graph://structure/overview`,
          name: `Code Structure Overview`,
          mimeType: 'application/json',
          description: 'Overview of the code structure graph',
        },
      ],
    }));

    // List resource templates
    this.server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      async () => ({
        resourceTemplates: [
          {
            uriTemplate: 'graph://structure/node/{id}',
            name: 'Node details',
            mimeType: 'application/json',
            description: 'Details of a specific node in the graph',
          },
          {
            uriTemplate: 'graph://structure/relationships/{type}',
            name: 'Relationships by type',
            mimeType: 'application/json',
            description: 'Relationships of a specific type in the graph',
          },
        ],
      })
    );

    // Handle resource reading
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const { uri } = request.params;
        
        // Handle overview resource
        if (uri === 'graph://structure/overview') {
          const nodeTypes = await neo4jService.executeQuery(
            'MATCH (n) RETURN DISTINCT labels(n) as type, count(n) as count'
          );
          
          const relationshipTypes = await neo4jService.executeQuery(
            'MATCH ()-[r]->() RETURN DISTINCT type(r) as type, count(r) as count'
          );
          
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  nodeTypes: nodeTypes.records.map(record => ({
                    type: record.get('type'),
                    count: record.get('count').toNumber(),
                  })),
                  relationshipTypes: relationshipTypes.records.map(record => ({
                    type: record.get('type'),
                    count: record.get('count').toNumber(),
                  })),
                  timestamp: new Date().toISOString(),
                }, null, 2),
              },
            ],
          };
        }
        
        // Handle node details
        const nodeMatch = uri.match(/^graph:\/\/structure\/node\/(.+)$/);
        if (nodeMatch) {
          const id = nodeMatch[1];
          const node = await neo4jService.getNodeById(id);
          
          if (!node) {
            throw new McpError(ErrorCode.NotFound, `Node with ID ${id} not found`);
          }
          
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(node, null, 2),
              },
            ],
          };
        }
        
        // Handle relationships by type
        const relMatch = uri.match(/^graph:\/\/structure\/relationships\/(.+)$/);
        if (relMatch) {
          const type = relMatch[1];
          const relationships = await neo4jService.getRelationshipsByType(type);
          
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(relationships, null, 2),
              },
            ],
          };
        }
        
        throw new McpError(ErrorCode.InvalidRequest, `Invalid URI: ${uri}`);
      }
    );
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'query_graph',
          description: 'Execute a Cypher query against the code structure graph',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Cypher query to execute',
              },
              params: {
                type: 'object',
                description: 'Query parameters',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'extract_code_structure',
          description: 'Extract code structure from a codebase',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the codebase',
              },
              language: {
                type: 'string',
                description: 'Programming language',
                enum: ['typescript', 'javascript', 'python', 'java'],
              },
            },
            required: ['path'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (name === 'query_graph') {
        if (!args.query || typeof args.query !== 'string') {
          throw new McpError(ErrorCode.InvalidParams, 'Query is required');
        }
        
        try {
          const result = await neo4jService.executeQuery(
            args.query,
            args.params || {}
          );
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  result.records.map(record => {
                    const obj: Record<string, any> = {};
                    record.keys.forEach(key => {
                      const value = record.get(key);
                      obj[key] = value;
                    });
                    return obj;
                  }),
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error executing query: ${(error as Error).message}`,
              },
            ],
            isError: true,
          };
        }
      } else if (name === 'extract_code_structure') {
        if (!args.path || typeof args.path !== 'string') {
          throw new McpError(ErrorCode.InvalidParams, 'Path is required');
        }
        
        // This would normally call the graph-extractor module
        // For now, we'll just return a placeholder response
        return {
          content: [
            {
              type: 'text',
              text: `Extracting code structure from ${args.path} (${args.language || 'auto-detect'})...`,
            },
            {
              type: 'text',
              text: 'This functionality will be implemented by integrating with the graph-extractor module.',
            },
          ],
        };
      }
      
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Code Structure MCP server running on stdio');
  }
}

// Create and run the server
const server = new CodeStructureServer();
server.run().catch(console.error);

export default server;