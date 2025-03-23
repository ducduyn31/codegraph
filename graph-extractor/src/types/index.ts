/**
 * Node types in the code graph
 */
export enum NodeType {
  Repository = 'Repository',
  Directory = 'Directory',
  File = 'File',
  Module = 'Module',
  Class = 'Class',
  Method = 'Method',
  Function = 'Function',
  Statement = 'Statement',
  Expression = 'Expression',
  Variable = 'Variable',
  APIEndpoint = 'APIEndpoint',
  MessageEvent = 'MessageEvent',
  DatabaseTable = 'DatabaseTable',
  ErrorDefinition = 'ErrorDefinition',
}

/**
 * Edge types in the code graph
 */
export enum EdgeType {
  Contains = 'CONTAINS',
  HasSource = 'HAS_SOURCE',
  Imports = 'IMPORTS',
  Exports = 'EXPORTS',
  Calls = 'CALLS',
  Publishes = 'PUBLISHES',
  Subscribes = 'SUBSCRIBES',
  Accesses = 'ACCESSES',
  Throws = 'THROWS',
  HandledBy = 'HANDLED_BY',
  DependsOn = 'DEPENDS_ON',
}

/**
 * Base interface for all graph nodes
 */
export interface Node {
  id: string;
  type: NodeType;
  name: string;
  gitHash?: string;
  properties: Record<string, unknown>;
}

/**
 * Base interface for all graph edges
 */
export interface Edge {
  id: string;
  type: EdgeType;
  sourceId: string;
  targetId: string;
  properties: Record<string, unknown>;
}

/**
 * Graph representation
 */
export interface Graph {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Code structure query parameters
 */
export interface CodeStructureQuery {
  filePath: string;
  functionName?: string;
  className?: string;
  depth?: number;
}

/**
 * Dependency trace query parameters
 */
export interface DependencyTraceQuery {
  sourcePath: string;
  direction: 'incoming' | 'outgoing' | 'both';
  dependencyTypes?: EdgeType[];
  maxDepth?: number;
}

/**
 * Error path query parameters
 */
export interface ErrorPathQuery {
  errorMessage?: string;
  functionName?: string;
  repositoryName?: string;
}