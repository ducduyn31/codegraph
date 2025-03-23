import { Edge, Graph, Node, NodeType, EdgeType } from '../types/index.js';
import { GraphStorage } from '../storage/interface.js';
import { CodeStructureQuery, DependencyTraceQuery, ErrorPathQuery } from '../types/index.js';

/**
 * Query engine
 * 
 * Provides methods for querying the graph database
 */
export class QueryEngine {
  private storage: GraphStorage;

  /**
   * Create a new query engine
   */
  constructor(storage: GraphStorage) {
    this.storage = storage;
  }

  /**
   * Query code structure
   */
  async queryCodeStructure(query: CodeStructureQuery): Promise<Graph> {
    try {
      // Connect to storage if not already connected
      await this.ensureConnected();

      // Find the starting node
      let startNodeId: string | null = null;

      // If we have a function name, find the function node
      if (query.functionName) {
        const functionNodes = await this.findNodesByTypeAndName(NodeType.Function, query.functionName);
        if (functionNodes.length > 0) {
          startNodeId = functionNodes[0].id;
        }
      }
      // If we have a class name, find the class node
      else if (query.className) {
        const classNodes = await this.findNodesByTypeAndName(NodeType.Class, query.className);
        if (classNodes.length > 0) {
          startNodeId = classNodes[0].id;
        }
      }
      // Otherwise, find the file node
      else {
        const fileNodes = await this.findNodesByPath(NodeType.File, query.filePath);
        if (fileNodes.length > 0) {
          startNodeId = fileNodes[0].id;
        }
      }

      if (!startNodeId) {
        return { nodes: [], edges: [] };
      }

      // Get the subgraph starting from the node
      const depth = query.depth || 2;
      return await this.storage.getSubgraph(startNodeId, depth);
    } catch (error) {
      console.error('Error querying code structure:', error);
      throw error;
    }
  }

  /**
   * Trace dependencies
   */
  async traceDependencies(query: DependencyTraceQuery): Promise<Graph> {
    try {
      // Connect to storage if not already connected
      await this.ensureConnected();

      // Find the starting node
      const fileNodes = await this.findNodesByPath(NodeType.File, query.sourcePath);
      if (fileNodes.length === 0) {
        return { nodes: [], edges: [] };
      }

      const startNodeId = fileNodes[0].id;
      const maxDepth = query.maxDepth || 3;
      const edgeTypes = query.dependencyTypes || [EdgeType.Imports, EdgeType.DependsOn];

      // Get the subgraph
      return await this.storage.getSubgraph(startNodeId, maxDepth, edgeTypes);
    } catch (error) {
      console.error('Error tracing dependencies:', error);
      throw error;
    }
  }

  /**
   * Find error paths
   */
  async findErrorPaths(query: ErrorPathQuery): Promise<Graph> {
    try {
      // Connect to storage if not already connected
      await this.ensureConnected();

      // This is a more complex query that would typically use a custom Cypher query
      // For now, we'll implement a simplified version
      
      // Find error definition nodes
      let errorNodes: Node[] = [];
      if (query.errorMessage) {
        // Find error definitions that match the error message
        const allErrorNodes = await this.storage.getNodesByType(NodeType.ErrorDefinition);
        errorNodes = allErrorNodes.filter(node =>
          node.name.includes(query.errorMessage!) ||
          (typeof node.properties.message === 'string' &&
           node.properties.message.includes(query.errorMessage!))
        );
      } else {
        // Get all error definitions
        errorNodes = await this.storage.getNodesByType(NodeType.ErrorDefinition);
      }

      if (errorNodes.length === 0) {
        return { nodes: [], edges: [] };
      }

      // Collect all nodes and edges
      const nodes: Record<string, Node> = {};
      const edges: Record<string, Edge> = {};

      // For each error node, find paths to and from it
      for (const errorNode of errorNodes) {
        nodes[errorNode.id] = errorNode;

        // Find nodes that throw this error
        const incomingEdges = await this.storage.getIncomingEdges(errorNode.id, [EdgeType.Throws]);
        for (const edge of incomingEdges) {
          edges[edge.id] = edge;
          
          // Get the source node
          const sourceNode = await this.storage.getNode(edge.sourceId);
          if (sourceNode) {
            nodes[sourceNode.id] = sourceNode;
          }
        }

        // Find nodes that handle this error
        const outgoingEdges = await this.storage.getOutgoingEdges(errorNode.id, [EdgeType.HandledBy]);
        for (const edge of outgoingEdges) {
          edges[edge.id] = edge;
          
          // Get the target node
          const targetNode = await this.storage.getNode(edge.targetId);
          if (targetNode) {
            nodes[targetNode.id] = targetNode;
          }
        }
      }

      return {
        nodes: Object.values(nodes),
        edges: Object.values(edges),
      };
    } catch (error) {
      console.error('Error finding error paths:', error);
      throw error;
    }
  }

  /**
   * Find nodes by type and name
   */
  private async findNodesByTypeAndName(type: NodeType, name: string): Promise<Node[]> {
    try {
      const nodes = await this.storage.getNodesByType(type);
      return nodes.filter(node => node.name === name);
    } catch (error) {
      console.error(`Error finding nodes of type ${type} with name ${name}:`, error);
      return [];
    }
  }

  /**
   * Find nodes by path
   */
  private async findNodesByPath(type: NodeType, path: string): Promise<Node[]> {
    try {
      const nodes = await this.storage.getNodesByType(type);
      return nodes.filter(node => node.properties.path === path);
    } catch (error) {
      console.error(`Error finding nodes of type ${type} with path ${path}:`, error);
      return [];
    }
  }

  /**
   * Ensure the storage is connected
   */
  private async ensureConnected(): Promise<void> {
    try {
      // Simple test query to check if connected
      await this.storage.getNodesByType(NodeType.Repository, 1);
    } catch (error) {
      // If not connected, connect
      await this.storage.connect();
    }
  }
}