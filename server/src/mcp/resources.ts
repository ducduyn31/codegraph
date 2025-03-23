import {
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import neo4jService from '../services/neo4j';

/**
 * Set up resource handlers for the MCP server
 * 
 * @param server The MCP server instance
 */
export function setupResourceHandlers(server: Server): void {
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'graph://structure/overview',
        name: 'Code Structure Overview',
        mimeType: 'application/json',
        description: 'Overview of the code structure graph',
      },
    ],
  }));

  // List resource templates
  server.setRequestHandler(
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
  server.setRequestHandler(
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
          throw new McpError(ErrorCode.InvalidParams, `Node with ID ${id} not found`);
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