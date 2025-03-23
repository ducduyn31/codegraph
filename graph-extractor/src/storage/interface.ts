import { Edge, Graph, Node } from '../types/index.js';

/**
 * Interface for graph database operations
 */
export interface GraphStorage {
  /**
   * Connect to the graph database
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the graph database
   */
  disconnect(): Promise<void>;

  /**
   * Clear all data in the graph database
   */
  clearAll(): Promise<void>;

  /**
   * Add a node to the graph database
   */
  addNode(node: Node): Promise<Node>;

  /**
   * Add multiple nodes to the graph database
   */
  addNodes(nodes: Node[]): Promise<Node[]>;

  /**
   * Get a node by its ID
   */
  getNode(id: string): Promise<Node | null>;

  /**
   * Get nodes by type
   */
  getNodesByType(type: string, limit?: number): Promise<Node[]>;

  /**
   * Add an edge to the graph database
   */
  addEdge(edge: Edge): Promise<Edge>;

  /**
   * Add multiple edges to the graph database
   */
  addEdges(edges: Edge[]): Promise<Edge[]>;

  /**
   * Get an edge by its ID
   */
  getEdge(id: string): Promise<Edge | null>;

  /**
   * Get edges by type
   */
  getEdgesByType(type: string, limit?: number): Promise<Edge[]>;

  /**
   * Get edges between two nodes
   */
  getEdgesBetween(sourceId: string, targetId: string): Promise<Edge[]>;

  /**
   * Get outgoing edges from a node
   */
  getOutgoingEdges(nodeId: string, types?: string[]): Promise<Edge[]>;

  /**
   * Get incoming edges to a node
   */
  getIncomingEdges(nodeId: string, types?: string[]): Promise<Edge[]>;

  /**
   * Execute a custom Cypher query (Neo4j) or Gremlin query (Neptune)
   */
  executeQuery(query: string, params?: Record<string, unknown>): Promise<unknown>;

  /**
   * Get a subgraph starting from a node and traversing to a specified depth
   */
  getSubgraph(startNodeId: string, depth: number, edgeTypes?: string[]): Promise<Graph>;
}