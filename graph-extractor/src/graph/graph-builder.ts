import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Edge, Graph, Node } from '../types/index.js';
import { ParseResult } from '../parsers/interface.js';
import { Parser } from '../parsers/interface.js';
import { ParserFactory, ParserType } from '../parsers/factory.js';
import { RelationshipExtractor } from '../extractors/relationship-extractor.js';
import { GraphStorage } from '../storage/interface.js';

/**
 * Graph builder
 * 
 * Builds a graph representation of the code by parsing files and extracting relationships
 */
export class GraphBuilder {
  private relationshipExtractor: RelationshipExtractor;
  private storage: GraphStorage;
  private fileIdMap: Map<string, string> = new Map();
  private parseResults: Map<string, ParseResult> = new Map();
  private allNodes: Node[] = [];
  private allEdges: Edge[] = [];

  /**
   * Create a new graph builder
   */
  constructor(storage: GraphStorage) {
    this.relationshipExtractor = new RelationshipExtractor();
    this.storage = storage;
  }

  /**
   * Build a graph from a list of files
   */
  async buildGraph(
    filePaths: string[],
    repositoryName: string,
  ): Promise<Graph> {
    try {
      // Connect to storage
      await this.storage.connect();

      // Clear existing data
      await this.storage.clearAll();

      // Process each file
      for (const filePath of filePaths) {
        await this.processFile(filePath, repositoryName);
      }

      // Extract cross-file relationships
      const crossFileEdges = this.relationshipExtractor.extractCrossFileRelationships(
        this.allNodes,
        this.parseResults,
        this.fileIdMap,
      );
      this.allEdges.push(...crossFileEdges);

      // Store all nodes and edges
      await this.storage.addNodes(this.allNodes);
      await this.storage.addEdges(this.allEdges);

      return {
        nodes: this.allNodes,
        edges: this.allEdges,
      };
    } catch (error) {
      console.error('Error building graph:', error);
      throw error;
    }
  }

  /**
   * Process a single file
   */
  private async processFile(
    filePath: string,
    repositoryName: string,
  ): Promise<void> {
    try {
      // Extract file hierarchy
      const { 
        nodes: hierarchyNodes, 
        edges: hierarchyEdges,
        repositoryId,
        directoryId,
        fileId,
      } = this.relationshipExtractor.extractFileHierarchy(filePath, repositoryName);

      // Add file ID to map
      this.fileIdMap.set(filePath, fileId);

      // Add nodes and edges to collections
      this.allNodes.push(...hierarchyNodes);
      this.allEdges.push(...hierarchyEdges);

      // Parse the file
      const extension = path.extname(filePath);
      const parser = ParserFactory.getParserForExtension(extension);
      
      if (parser) {
        // Parse the file
        const parseResult = await parser.parseFile(filePath);
        this.parseResults.set(filePath, parseResult);

        // Extract relationships
        const { nodes, edges } = this.relationshipExtractor.extractFromParseResult(
          parseResult,
          filePath,
          repositoryId,
          directoryId,
          fileId,
        );

        // Add nodes and edges to collections
        this.allNodes.push(...nodes);
        this.allEdges.push(...edges);
      } else {
        console.warn(`No parser available for file extension: ${extension}`);
      }
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
      // Continue with other files
    }
  }
}