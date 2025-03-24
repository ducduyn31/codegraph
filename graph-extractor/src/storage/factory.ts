import type { GraphStorage } from './interface.js';
import { Neo4jStorage } from './neo4j.js';

/**
 * Storage type enum
 */
export enum StorageType {
  Neo4j = 'neo4j',
  Neptune = 'neptune',
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  type: StorageType;
  uri: string;
  username?: string;
  password?: string;
  region?: string; // For AWS Neptune
}

/**
 * Factory for creating storage instances
 */

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export  class StorageFactory {
  /**
   * Create a storage instance based on configuration
   */
  static createStorage(config: StorageConfig): GraphStorage {
    switch (config.type) {
      case StorageType.Neo4j:
        if (!config.username || !config.password) {
          throw new Error('Username and password are required for Neo4j');
        }
        return new Neo4jStorage(config.uri, config.username, config.password);
      case StorageType.Neptune:
        // Neptune implementation will be added later
        throw new Error('AWS Neptune storage not yet implemented');
      default:
        throw new Error(`Unknown storage type: ${config.type}`);
    }
  }
}