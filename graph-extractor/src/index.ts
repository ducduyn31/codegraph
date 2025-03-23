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
import fs from 'fs';
import path from 'path';

import { StorageFactory, StorageType } from './storage/factory.js';
import { ParserFactory } from './parsers/factory.js';
import { GraphBuilder } from './graph/graph-builder.js';
import { QueryEngine } from './query/query-engine.js';
import { McpTools } from './tools/index.js';
import { ContextFormat } from './query/context-assembler.js';
import { loadConfig } from './config.js';

/**
 * GraphExtractorServer
 *
 * MCP server that provides tools for code structure extraction and querying
 * based on a graph representation of the codebase.
 */
class GraphExtractorServer {
  private server: Server;
  private queryEngine: QueryEngine;
  private mcpTools: McpTools;
  private graphBuilder: GraphBuilder;

  constructor() {
    // Load configuration
    const config = loadConfig();
    
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
    this.graphBuilder = new GraphBuilder(storage);

    // Initialize query engine
    this.queryEngine = new QueryEngine(storage);

    // Initialize MCP tools
    this.mcpTools = new McpTools(this.queryEngine);

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'graph-extractor',
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

  /**
   * Set up resource handlers for the MCP server
   */
  private setupResourceHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'code-graph://structure',
          name: 'Code Graph Structure',
          mimeType: 'application/json',
          description: 'Graph representation of the code structure',
        },
      ],
    }));

    // List resource templates
    this.server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      async () => ({
        resourceTemplates: [
          {
            uriTemplate: 'code-graph://{repository}/structure',
            name: 'Repository Code Structure',
            mimeType: 'application/json',
            description: 'Graph representation of a specific repository',
          },
          {
            uriTemplate: 'code-graph://{repository}/file/{filePath}',
            name: 'File Code Structure',
            mimeType: 'application/json',
            description: 'Graph representation of a specific file',
          },
        ],
      })
    );

    // Read resource handler
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        try {
          const uri = request.params.uri;
          let text = '';

          // Handle static resources
          if (uri === 'code-graph://structure') {
            text = JSON.stringify({ message: 'Please specify a repository or file path' }, null, 2);
          }
          // Handle dynamic resources
          else if (uri.startsWith('code-graph://')) {
            const match = uri.match(/^code-graph:\/\/([^/]+)\/structure$/);
            if (match) {
              const repository = match[1];
              text = `Repository structure for ${repository} is not yet available`;
            } else {
              const fileMatch = uri.match(/^code-graph:\/\/([^/]+)\/file\/(.+)$/);
              if (fileMatch) {
                const repository = fileMatch[1];
                const filePath = fileMatch[2];
                text = `File structure for ${filePath} in repository ${repository} is not yet available`;
              } else {
                throw new McpError(
                  ErrorCode.InvalidRequest,
                  `Invalid URI format: ${uri}`
                );
              }
            }
          } else {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Invalid URI: ${uri}`
            );
          }

          return {
            contents: [
              {
                uri: request.params.uri,
                mimeType: 'application/json',
                text,
              },
            ],
          };
        } catch (error) {
          if (error instanceof McpError) {
            throw error;
          }
          throw new McpError(
            ErrorCode.InternalError,
            `Error reading resource: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    );
  }

  /**
   * Set up tool handlers for the MCP server
   */
  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'query_code_structure',
          description: 'Retrieve code structure information',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the file or directory',
              },
              functionName: {
                type: 'string',
                description: 'Optional function name to focus on',
              },
              className: {
                type: 'string',
                description: 'Optional class name to focus on',
              },
              depth: {
                type: 'number',
                description: 'Depth of relationships to traverse',
                default: 2,
              },
              format: {
                type: 'string',
                description: 'Output format (json, text, markdown)',
                default: 'markdown',
                enum: ['json', 'text', 'markdown'],
              },
            },
            required: ['filePath'],
          },
        },
        {
          name: 'trace_dependencies',
          description: 'Follow dependency chains across repositories',
          inputSchema: {
            type: 'object',
            properties: {
              sourcePath: {
                type: 'string',
                description: 'Path to the source file or directory',
              },
              direction: {
                type: 'string',
                description: 'Direction of dependencies to trace',
                default: 'both',
                enum: ['incoming', 'outgoing', 'both'],
              },
              dependencyTypes: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Types of dependencies to trace',
              },
              maxDepth: {
                type: 'number',
                description: 'Maximum depth to traverse',
                default: 3,
              },
              format: {
                type: 'string',
                description: 'Output format (json, text, markdown)',
                default: 'markdown',
                enum: ['json', 'text', 'markdown'],
              },
            },
            required: ['sourcePath'],
          },
        },
        {
          name: 'debug_error_paths',
          description: 'Identify potential error propagation paths',
          inputSchema: {
            type: 'object',
            properties: {
              errorMessage: {
                type: 'string',
                description: 'Error message to search for',
              },
              functionName: {
                type: 'string',
                description: 'Function name to focus on',
              },
              repositoryName: {
                type: 'string',
                description: 'Repository name to focus on',
              },
              format: {
                type: 'string',
                description: 'Output format (json, text, markdown)',
                default: 'markdown',
                enum: ['json', 'text', 'markdown'],
              },
            },
          },
        },
        {
          name: 'build_graph',
          description: 'Build a graph representation of the code',
          inputSchema: {
            type: 'object',
            properties: {
              repositoryPath: {
                type: 'string',
                description: 'Path to the repository',
              },
              repositoryName: {
                type: 'string',
                description: 'Name of the repository',
              },
              filePatterns: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'File patterns to include (e.g., ["**/*.ts", "**/*.js"])',
                default: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
              },
            },
            required: ['repositoryPath', 'repositoryName'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'query_code_structure': {
            const result = await this.mcpTools.queryCodeStructure(request.params.arguments);
            return {
              content: [
                {
                  type: 'text',
                  text: result,
                },
              ],
            };
          }
          case 'trace_dependencies': {
            const result = await this.mcpTools.traceDependencies(request.params.arguments);
            return {
              content: [
                {
                  type: 'text',
                  text: result,
                },
              ],
            };
          }
          case 'debug_error_paths': {
            const result = await this.mcpTools.debugErrorPaths(request.params.arguments);
            return {
              content: [
                {
                  type: 'text',
                  text: result,
                },
              ],
            };
          }
          case 'build_graph': {
            const { repositoryPath, repositoryName, filePatterns } = request.params.arguments;
            
            // Get all files matching the patterns
            const files: string[] = [];
            // This is a simplified implementation - in a real implementation, we would use glob patterns
            // For now, we'll just recursively scan the directory
            const scanDirectory = (dir: string) => {
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                  scanDirectory(fullPath);
                } else if (entry.isFile()) {
                  const ext = path.extname(entry.name).toLowerCase();
                  if (['.ts', '.js', '.tsx', '.jsx'].includes(ext)) {
                    files.push(fullPath);
                  }
                }
              }
            };
            
            try {
              scanDirectory(repositoryPath);
            } catch (error) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Error scanning directory: ${error instanceof Error ? error.message : String(error)}`,
                  },
                ],
                isError: true,
              };
            }
            
            // Build the graph
            try {
              await this.graphBuilder.buildGraph(files, repositoryName);
              return {
                content: [
                  {
                    type: 'text',
                    text: `Successfully built graph for ${repositoryName} with ${files.length} files`,
                  },
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Error building graph: ${error instanceof Error ? error.message : String(error)}`,
                  },
                ],
                isError: true,
              };
            }
          }
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Start the MCP server
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Graph Extractor MCP server running on stdio');
  }
}

// Create and run the server
const server = new GraphExtractorServer();
server.run().catch(console.error);