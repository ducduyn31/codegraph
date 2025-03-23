/**
 * Configuration for the graph extractor
 */
export interface GraphExtractorConfig {
  /**
   * Neo4j configuration
   */
  neo4j: {
    /**
     * Neo4j URI
     */
    uri: string;
    
    /**
     * Neo4j username
     */
    username: string;
    
    /**
     * Neo4j password
     */
    password: string;
  };
  
  /**
   * AWS Neptune configuration (for production)
   */
  neptune?: {
    /**
     * Neptune URI
     */
    uri: string;
    
    /**
     * AWS region
     */
    region: string;
  };
  
  /**
   * Default repository path
   */
  defaultRepositoryPath?: string;
  
  /**
   * Default repository name
   */
  defaultRepositoryName?: string;
  
  /**
   * Default file patterns to include
   */
  defaultFilePatterns?: string[];
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): GraphExtractorConfig {
  return {
    neo4j: {
      uri: process.env.NEO4J_URI || 'neo4j://localhost:7687',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'password',
    },
    neptune: process.env.NEPTUNE_URI
      ? {
          uri: process.env.NEPTUNE_URI,
          region: process.env.AWS_REGION || 'us-east-1',
        }
      : undefined,
    defaultRepositoryPath: process.env.DEFAULT_REPOSITORY_PATH,
    defaultRepositoryName: process.env.DEFAULT_REPOSITORY_NAME,
    defaultFilePatterns: process.env.DEFAULT_FILE_PATTERNS
      ? process.env.DEFAULT_FILE_PATTERNS.split(',')
      : ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
  };
}