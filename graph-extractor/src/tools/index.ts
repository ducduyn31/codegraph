import { QueryEngine } from '../query/query-engine.js';
import { ContextAssembler, ContextFormat } from '../query/context-assembler.js';
import { CodeStructureQuery, DependencyTraceQuery, ErrorPathQuery } from '../types/index.js';

/**
 * MCP Tool implementations
 */
export class McpTools {
  private queryEngine: QueryEngine;
  private contextAssembler: ContextAssembler;

  /**
   * Create a new MCP tools instance
   */
  constructor(queryEngine: QueryEngine) {
    this.queryEngine = queryEngine;
    this.contextAssembler = new ContextAssembler();
  }

  /**
   * Query code structure
   * 
   * Retrieves code structure information for a file, function, or class
   */
  async queryCodeStructure(params: {
    filePath: string;
    functionName?: string;
    className?: string;
    depth?: number;
    format?: string;
  }): Promise<string> {
    try {
      const query: CodeStructureQuery = {
        filePath: params.filePath,
        functionName: params.functionName,
        className: params.className,
        depth: params.depth,
      };

      const graph = await this.queryEngine.queryCodeStructure(query);
      
      // Format the result
      const format = this.getContextFormat(params.format);
      return this.contextAssembler.formatCodeStructure(graph, format);
    } catch (error) {
      console.error('Error in queryCodeStructure tool:', error);
      return `Error querying code structure: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Trace dependencies
   * 
   * Follows dependency chains across repositories
   */
  async traceDependencies(params: {
    sourcePath: string;
    direction?: 'incoming' | 'outgoing' | 'both';
    dependencyTypes?: string[];
    maxDepth?: number;
    format?: string;
  }): Promise<string> {
    try {
      const query: DependencyTraceQuery = {
        sourcePath: params.sourcePath,
        direction: params.direction || 'both',
        dependencyTypes: params.dependencyTypes?.map(type => type as any),
        maxDepth: params.maxDepth,
      };

      const graph = await this.queryEngine.traceDependencies(query);
      
      // Format the result
      const format = this.getContextFormat(params.format);
      return this.contextAssembler.formatDependencyTrace(graph, format);
    } catch (error) {
      console.error('Error in traceDependencies tool:', error);
      return `Error tracing dependencies: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Debug error paths
   * 
   * Identifies potential error propagation paths
   */
  async debugErrorPaths(params: {
    errorMessage?: string;
    functionName?: string;
    repositoryName?: string;
    format?: string;
  }): Promise<string> {
    try {
      const query: ErrorPathQuery = {
        errorMessage: params.errorMessage,
        functionName: params.functionName,
        repositoryName: params.repositoryName,
      };

      const graph = await this.queryEngine.findErrorPaths(query);
      
      // Format the result
      const format = this.getContextFormat(params.format);
      return this.contextAssembler.formatErrorPaths(graph, format);
    } catch (error) {
      console.error('Error in debugErrorPaths tool:', error);
      return `Error finding error paths: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Get context format from string
   */
  private getContextFormat(format?: string): ContextFormat {
    if (!format) {
      return ContextFormat.Markdown;
    }

    switch (format.toLowerCase()) {
      case 'json':
        return ContextFormat.JSON;
      case 'text':
        return ContextFormat.Text;
      case 'markdown':
      case 'md':
        return ContextFormat.Markdown;
      default:
        return ContextFormat.Markdown;
    }
  }
}