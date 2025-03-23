// Node types
export interface Node {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

// Relationship types
export interface Relationship {
  id: string;
  type: string;
  properties: Record<string, any>;
  startNodeId: string;
  endNodeId: string;
}

// Graph types
export interface Graph {
  nodes: Node[];
  relationships: Relationship[];
}

// Query result types
export interface QueryResult {
  records: any[];
  summary: {
    query: string;
    parameters: Record<string, any>;
    counters: Record<string, number>;
  };
}

// Error types
export interface ApiError {
  message: string;
  name?: string;
  code?: string;
  status?: number;
  details?: any;
}

// Request query parameters
export interface QueryParams {
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filter?: string;
}