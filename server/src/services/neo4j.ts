import neo4j, { Driver, Session, Result } from 'neo4j-driver';
import {
  NodeType,
  RelationshipType,
  NodeProperties,
  RelationshipProperties,
  QueryResult as CommonQueryResult
} from 'common';

class Neo4jService {
  private driver: Driver;
  private static instance: Neo4jService;

  private constructor() {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }

  public static getInstance(): Neo4jService {
    if (!Neo4jService.instance) {
      Neo4jService.instance = new Neo4jService();
    }
    return Neo4jService.instance;
  }

  public getSession(): Session {
    return this.driver.session();
  }

  public async executeQuery(
    query: string,
    params: Record<string, any> = {}
  ): Promise<Result> {
    const session = this.getSession();
    try {
      return await session.run(query, params);
    } finally {
      await session.close();
    }
  }

  public async getAllNodes(): Promise<any[]> {
    const result = await this.executeQuery('MATCH (n) RETURN n LIMIT 100');
    return result.records.map(record => record.get('n').properties);
  }

  public async getNodeById(id: string): Promise<any> {
    const result = await this.executeQuery(
      'MATCH (n) WHERE id(n) = $id RETURN n',
      { id: parseInt(id, 10) }
    );
    return result.records.length > 0 ? result.records[0].get('n').properties : null;
  }

  public async getAllRelationships(): Promise<any[]> {
    const result = await this.executeQuery(
      'MATCH ()-[r]->() RETURN DISTINCT type(r) as type, count(r) as count'
    );
    return result.records.map(record => ({
      type: record.get('type'),
      count: record.get('count').toNumber(),
    }));
  }

  public async getRelationshipsByType(type: string): Promise<any[]> {
    const result = await this.executeQuery(
      'MATCH (a)-[r:$type]->(b) RETURN a, r, b LIMIT 100',
      { type }
    );
    return result.records.map(record => ({
      source: record.get('a').properties,
      relationship: record.get('r').properties,
      target: record.get('b').properties,
    }));
  }

  public async close(): Promise<void> {
    await this.driver.close();
  }
}

export default Neo4jService.getInstance();