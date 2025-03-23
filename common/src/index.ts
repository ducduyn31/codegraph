/**
 * Common types and utilities for code structure analysis
 */

// Graph node types
export enum NodeType {
  File = 'File',
  Class = 'Class',
  Function = 'Function',
  Method = 'Method',
  Interface = 'Interface',
  Variable = 'Variable',
  Import = 'Import',
  Export = 'Export',
}

// Graph relationship types
export enum RelationshipType {
  CONTAINS = 'CONTAINS',
  IMPORTS = 'IMPORTS',
  EXPORTS = 'EXPORTS',
  EXTENDS = 'EXTENDS',
  IMPLEMENTS = 'IMPLEMENTS',
  CALLS = 'CALLS',
  REFERENCES = 'REFERENCES',
}

// Node properties
export interface NodeProperties {
  id: string;
  name: string;
  type: NodeType;
  path?: string;
  line?: number;
  column?: number;
  code?: string;
  [key: string]: any;
}

// Relationship properties
export interface RelationshipProperties {
  id: string;
  type: RelationshipType;
  sourceId: string;
  targetId: string;
  [key: string]: any;
}

// Graph structure
export interface Graph {
  nodes: NodeProperties[];
  relationships: RelationshipProperties[];
}

// Query result
export interface QueryResult {
  records: any[];
  summary: {
    query: string;
    parameters: Record<string, any>;
    counters: Record<string, number>;
  };
}

// Configuration
export interface Config {
  neo4j: {
    uri: string;
    user: string;
    password: string;
  };
  server: {
    port: number;
  };
}

// Utility functions
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatError(error: Error): string {
  return `Error: ${error.message}\n${error.stack || ''}`;
}