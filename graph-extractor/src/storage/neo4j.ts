import neo4j, { Driver, Session } from 'neo4j-driver';
import { Edge, Graph, Node } from '../types/index.js';
import { GraphStorage } from './interface.js';

/**
 * Neo4j implementation of the GraphStorage interface
 */
export class Neo4jStorage implements GraphStorage {
  private driver: Driver | null = null;
  private uri: string;
  private username: string;
  private password: string;

  /**
   * Create a new Neo4j storage instance
   */
  constructor(uri: string, username: string, password: string) {
    this.uri = uri;
    this.username = username;
    this.password = password;
  }

  /**
   * Connect to the Neo4j database
   */
  async connect(): Promise<void> {
    try {
      this.driver = neo4j.driver(
        this.uri,
        neo4j.auth.basic(this.username, this.password),
      );
      // Verify connection
      const session = this.driver.session();
      await session.run('RETURN 1');
      await session.close();
      console.log('Connected to Neo4j database');
    } catch (error) {
      console.error('Failed to connect to Neo4j:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the Neo4j database
   */
  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      console.log('Disconnected from Neo4j database');
    }
  }

  /**
   * Get a session for database operations
   */
  private getSession(): Session {
    if (!this.driver) {
      throw new Error('Not connected to Neo4j database');
    }
    return this.driver.session();
  }

  /**
   * Clear all data in the database
   */
  async clearAll(): Promise<void> {
    const session = this.getSession();
    try {
      await session.run('MATCH (n) DETACH DELETE n');
    } finally {
      await session.close();
    }
  }

  /**
   * Add a node to the database
   */
  async addNode(node: Node): Promise<Node> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        CREATE (n:${node.type} {id: $id, name: $name, properties: $properties})
        RETURN n
        `,
        {
          id: node.id,
          name: node.name,
          properties: JSON.stringify(node.properties),
        },
      );
      return node;
    } finally {
      await session.close();
    }
  }

  /**
   * Add multiple nodes to the database
   */
  async addNodes(nodes: Node[]): Promise<Node[]> {
    // For simplicity, we'll add nodes one by one
    // In a production implementation, this would use batch operations
    const results: Node[] = [];
    for (const node of nodes) {
      results.push(await this.addNode(node));
    }
    return results;
  }

  /**
   * Get a node by its ID
   */
  async getNode(id: string): Promise<Node | null> {
    const session = this.getSession();
    try {
      const result = await session.run('MATCH (n {id: $id}) RETURN n', { id });
      if (result.records.length === 0) {
        return null;
      }
      const nodeProps = result.records[0].get('n').properties;
      return {
        id: nodeProps.id,
        type: result.records[0].get('n').labels[0],
        name: nodeProps.name,
        properties: JSON.parse(nodeProps.properties),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get nodes by type
   */
  async getNodesByType(type: string, limit = 100): Promise<Node[]> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `MATCH (n:${type}) RETURN n LIMIT $limit`,
        { limit },
      );
      return result.records.map((record) => {
        const nodeProps = record.get('n').properties;
        return {
          id: nodeProps.id,
          type,
          name: nodeProps.name,
          properties: JSON.parse(nodeProps.properties),
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Add an edge to the database
   */
  async addEdge(edge: Edge): Promise<Edge> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (source {id: $sourceId})
        MATCH (target {id: $targetId})
        CREATE (source)-[r:${edge.type} {id: $id, properties: $properties}]->(target)
        RETURN r
        `,
        {
          id: edge.id,
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          properties: JSON.stringify(edge.properties),
        },
      );
      return edge;
    } finally {
      await session.close();
    }
  }

  /**
   * Add multiple edges to the database
   */
  async addEdges(edges: Edge[]): Promise<Edge[]> {
    // For simplicity, we'll add edges one by one
    // In a production implementation, this would use batch operations
    const results: Edge[] = [];
    for (const edge of edges) {
      results.push(await this.addEdge(edge));
    }
    return results;
  }

  /**
   * Get an edge by its ID
   */
  async getEdge(id: string): Promise<Edge | null> {
    const session = this.getSession();
    try {
      const result = await session.run(
        'MATCH ()-[r {id: $id}]->() RETURN r, type(r), startNode(r).id as sourceId, endNode(r).id as targetId',
        { id },
      );
      if (result.records.length === 0) {
        return null;
      }
      const record = result.records[0];
      const edgeProps = record.get('r').properties;
      return {
        id: edgeProps.id,
        type: record.get('type(r)'),
        sourceId: record.get('sourceId'),
        targetId: record.get('targetId'),
        properties: JSON.parse(edgeProps.properties),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get edges by type
   */
  async getEdgesByType(type: string, limit = 100): Promise<Edge[]> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `MATCH ()-[r:${type}]->() RETURN r, startNode(r).id as sourceId, endNode(r).id as targetId LIMIT $limit`,
        { limit },
      );
      return result.records.map((record) => {
        const edgeProps = record.get('r').properties;
        return {
          id: edgeProps.id,
          type,
          sourceId: record.get('sourceId'),
          targetId: record.get('targetId'),
          properties: JSON.parse(edgeProps.properties),
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Get edges between two nodes
   */
  async getEdgesBetween(sourceId: string, targetId: string): Promise<Edge[]> {
    const session = this.getSession();
    try {
      const result = await session.run(
        'MATCH (source {id: $sourceId})-[r]->(target {id: $targetId}) RETURN r, type(r)',
        { sourceId, targetId },
      );
      return result.records.map((record) => {
        const edgeProps = record.get('r').properties;
        return {
          id: edgeProps.id,
          type: record.get('type(r)'),
          sourceId,
          targetId,
          properties: JSON.parse(edgeProps.properties),
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Get outgoing edges from a node
   */
  async getOutgoingEdges(nodeId: string, types?: string[]): Promise<Edge[]> {
    const session = this.getSession();
    try {
      let query = 'MATCH (source {id: $nodeId})-[r]->(target) RETURN r, type(r), target.id as targetId';
      if (types && types.length > 0) {
        query = `MATCH (source {id: $nodeId})-[r:${types.join('|')}]->(target) RETURN r, type(r), target.id as targetId`;
      }
      const result = await session.run(query, { nodeId });
      return result.records.map((record) => {
        const edgeProps = record.get('r').properties;
        return {
          id: edgeProps.id,
          type: record.get('type(r)'),
          sourceId: nodeId,
          targetId: record.get('targetId'),
          properties: JSON.parse(edgeProps.properties),
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Get incoming edges to a node
   */
  async getIncomingEdges(nodeId: string, types?: string[]): Promise<Edge[]> {
    const session = this.getSession();
    try {
      let query = 'MATCH (source)-[r]->(target {id: $nodeId}) RETURN r, type(r), source.id as sourceId';
      if (types && types.length > 0) {
        query = `MATCH (source)-[r:${types.join('|')}]->(target {id: $nodeId}) RETURN r, type(r), source.id as sourceId`;
      }
      const result = await session.run(query, { nodeId });
      return result.records.map((record) => {
        const edgeProps = record.get('r').properties;
        return {
          id: edgeProps.id,
          type: record.get('type(r)'),
          sourceId: record.get('sourceId'),
          targetId: nodeId,
          properties: JSON.parse(edgeProps.properties),
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a custom Cypher query
   */
  async executeQuery(query: string, params?: Record<string, unknown>): Promise<unknown> {
    const session = this.getSession();
    try {
      const result = await session.run(query, params);
      return result.records;
    } finally {
      await session.close();
    }
  }

  /**
   * Get a subgraph starting from a node and traversing to a specified depth
   */
  async getSubgraph(startNodeId: string, depth = 2, edgeTypes?: string[]): Promise<Graph> {
    const session = this.getSession();
    try {
      let relationshipClause = '';
      if (edgeTypes && edgeTypes.length > 0) {
        relationshipClause = `:${edgeTypes.join('|')}`;
      }

      const result = await session.run(
        `
        MATCH path = (start {id: $startNodeId})-[r${relationshipClause}*1..${depth}]-(related)
        RETURN path
        `,
        { startNodeId },
      );

      const nodes: Record<string, Node> = {};
      const edges: Record<string, Edge> = {};

      // Process each path
      for (const record of result.records) {
        const path = record.get('path');
        
        // Process nodes in the path
        for (const segment of path.segments) {
          // Start node
          const startNode = segment.start;
          if (!nodes[startNode.properties.id]) {
            nodes[startNode.properties.id] = {
              id: startNode.properties.id,
              type: startNode.labels[0],
              name: startNode.properties.name,
              properties: JSON.parse(startNode.properties.properties),
            };
          }
          
          // End node
          const endNode = segment.end;
          if (!nodes[endNode.properties.id]) {
            nodes[endNode.properties.id] = {
              id: endNode.properties.id,
              type: endNode.labels[0],
              name: endNode.properties.name,
              properties: JSON.parse(endNode.properties.properties),
            };
          }
          
          // Relationship
          const relationship = segment.relationship;
          if (!edges[relationship.properties.id]) {
            edges[relationship.properties.id] = {
              id: relationship.properties.id,
              type: relationship.type,
              sourceId: startNode.properties.id,
              targetId: endNode.properties.id,
              properties: JSON.parse(relationship.properties.properties),
            };
          }
        }
      }

      return {
        nodes: Object.values(nodes),
        edges: Object.values(edges),
      };
    } finally {
      await session.close();
    }
  }
}