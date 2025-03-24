import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import type { Edge, Graph, Node, NodeType } from '../types/index.js';
import type { ParseResult } from '../parsers/interface.js';
import { Parser } from '../parsers/interface.js';
import { ParserFactory, ParserType } from '../parsers/factory.js';
import { RelationshipExtractor } from '../extractors/relationship-extractor.js';
import type { GraphStorage } from '../storage/interface.js';
import { EdgeType } from '../types/index.js';

/**
 * Graph builder
 *
 * Builds a graph representation of the code by parsing files and extracting relationships
 * using a breadth-first search approach to traverse the directory structure
 */
export class GraphBuilder {
  private relationshipExtractor: RelationshipExtractor;
  private storage: GraphStorage;
  private fileIdMap: Map<string, string> = new Map();
  private directoryIdMap: Map<string, string> = new Map();
  private parseResults: Map<string, ParseResult> = new Map();
  private allNodes: Node[] = [];
  private allEdges: Edge[] = [];
  private repositoryId = '';

  /**
   * Create a new graph builder
   */
  constructor(storage: GraphStorage) {
    this.relationshipExtractor = new RelationshipExtractor();
    this.storage = storage;
  }

  /**
   * Build a graph from a list of files, starting with the root folder
   */
  async buildGraph(
    filePaths: string[],
    repositoryName: string,
    shouldReset = true,
  ): Promise<Graph> {
    try {
      // Connect to storage
      await this.storage.connect();

      // Clear existing data
      if (shouldReset) {
        await this.storage.clearAll();
      }

      // Find the root path (common base path for all files)
      const rootPath = this.findCommonBasePath(filePaths);
      console.log(`Root path identified: ${rootPath}`);

      // Create repository node
      this.repositoryId = uuidv4();
      const repositoryNode: Node = {
        id: this.repositoryId,
        type: 'Repository' as NodeType,
        name: repositoryName,
        properties: {
          path: rootPath,
        },
      };
      this.allNodes.push(repositoryNode);

      // Build directory structure using BFS, starting from the root folder
      await this.buildDirectoryStructure(filePaths);

      // Process each file's content
      for (const filePath of filePaths) {
        console.log(`Processing file content: ${filePath}`);
        await this.processFileContent(filePath);
      }

      // Extract cross-file relationships
      const crossFileRelationships = this.relationshipExtractor.extractCrossFileRelationships(
        this.allNodes,
        this.allEdges,
        this.parseResults,
        this.fileIdMap,
      );
      
      // Add the new nodes and edges
      this.allNodes.push(...crossFileRelationships.nodes);
      this.allEdges.push(...crossFileRelationships.edges);

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
   * Find the common base path for all files (root folder)
   */
  private findCommonBasePath(filePaths: string[]): string {
    if (filePaths.length === 0) return '';
    
    const paths = filePaths.map(p => path.dirname(p));
    let commonPath = paths[0];
    
    for (let i = 1; i < paths.length; i++) {
      while (!paths[i].startsWith(commonPath)) {
        commonPath = path.dirname(commonPath);
        if (commonPath === '/' || commonPath === '.') return commonPath;
      }
    }
    
    // Ensure we return a valid path
    return commonPath || '.';
  }

  /**
   * Build directory structure using BFS, starting from the root folder
   */
  private async buildDirectoryStructure(filePaths: string[]): Promise<void> {
    // Get the common base path (root folder)
    const rootPath = this.findCommonBasePath(filePaths);
    console.log(`Building directory structure from root: ${rootPath}`);
    
    // Create a map of directories to their files
    const directoryMap = this.buildDirectoryMap(filePaths, rootPath);
    
    // Process directories using BFS
    await this.traverseDirectoriesWithBFS(rootPath, directoryMap);
  }

  /**
   * Build a map of directories to their files
   */
  private buildDirectoryMap(filePaths: string[], rootPath: string): Map<string, Set<string>> {
    const directoryMap = new Map<string, Set<string>>();
    
    // Populate the directory map
    for (const filePath of filePaths) {
      const dirPath = path.dirname(filePath);
      if (!directoryMap.has(dirPath)) {
        directoryMap.set(dirPath, new Set<string>());
      }
      const fileSet = directoryMap.get(dirPath);
      if (fileSet) {
        fileSet.add(filePath);
      }
      
      // Also ensure all parent directories are in the map
      let currentDir = dirPath;
      while (currentDir !== rootPath && currentDir !== '/' && currentDir !== '.') {
        const parentDir = path.dirname(currentDir);
        if (!directoryMap.has(parentDir)) {
          directoryMap.set(parentDir, new Set<string>());
        }
        currentDir = parentDir;
      }
    }

    return directoryMap;
  }

  /**
   * Traverse directories using Breadth-First Search
   */
  private async traverseDirectoriesWithBFS(
    rootPath: string,
    directoryMap: Map<string, Set<string>>
  ): Promise<void> {
    // Create a queue for BFS, starting with the root folder
    const queue: { path: string; parentId: string }[] = [];
    
    // Start with the root directory
    queue.push({ path: rootPath, parentId: this.repositoryId });
    
    // Process the queue (BFS)
    while (queue.length > 0) {
      const queueItem = queue.shift();
      if (!queueItem) continue;
      
      const { path: currentPath, parentId } = queueItem;
      
      // Skip if this directory has already been processed
      if (this.directoryIdMap.has(currentPath)) {
        continue;
      }
      
      console.log(`Processing directory: ${currentPath}`);
      
      // Create directory node and get its ID
      const directoryId = this.createDirectoryNode(currentPath, parentId);
      
      // Process files in this directory
      this.processFilesInDirectory(currentPath, directoryId, directoryMap);
      
      // Find subdirectories and add them to the queue
      this.queueSubdirectories(currentPath, directoryId, directoryMap, queue);
    }
  }

  /**
   * Create a directory node and add it to the graph
   */
  private createDirectoryNode(dirPath: string, parentId: string): string {
    const directoryId = uuidv4();
    const directoryNode: Node = {
      id: directoryId,
      type: 'Directory' as NodeType,
      name: path.basename(dirPath) || dirPath, // Handle root path
      properties: {
        path: dirPath,
      },
    };
    
    this.allNodes.push(directoryNode);
    this.directoryIdMap.set(dirPath, directoryId);
    
    // Create CONTAINS edge from parent to directory
    this.createContainsEdge(parentId, directoryId);
    
    return directoryId;
  }

  /**
   * Process all files in a directory
   */
  private processFilesInDirectory(
    dirPath: string,
    directoryId: string,
    directoryMap: Map<string, Set<string>>
  ): void {
    const files = directoryMap.get(dirPath) || new Set<string>();
    for (const filePath of files) {
      this.createFileNode(filePath, directoryId);
    }
  }

  /**
   * Create a file node and add it to the graph
   */
  private createFileNode(filePath: string, directoryId: string): string {
    const fileId = uuidv4();
    const fileNode: Node = {
      id: fileId,
      type: 'File' as NodeType,
      name: path.basename(filePath),
      properties: {
        path: filePath,
        extension: path.extname(filePath),
      },
    };
    
    this.allNodes.push(fileNode);
    this.fileIdMap.set(filePath, fileId);
    
    // Create CONTAINS edge from directory to file
    this.createContainsEdge(directoryId, fileId);
    
    return fileId;
  }

  /**
   * Create a CONTAINS edge between nodes
   */
  private createContainsEdge(sourceId: string, targetId: string): string {
    const edgeId = uuidv4();
    this.allEdges.push({
      id: edgeId,
      type: EdgeType.Contains,
      sourceId: sourceId,
      targetId: targetId,
      properties: {},
    });
    return edgeId;
  }

  /**
   * Queue subdirectories for BFS processing
   */
  private queueSubdirectories(
    currentPath: string,
    directoryId: string,
    directoryMap: Map<string, Set<string>>,
    queue: { path: string; parentId: string }[]
  ): void {
    for (const dirPath of directoryMap.keys()) {
      const parent = path.dirname(dirPath);
      if (parent === currentPath) {
        queue.push({ path: dirPath, parentId: directoryId });
      }
    }
  }

  /**
   * Process a file's content
   */
  private async processFileContent(filePath: string): Promise<void> {
    try {
      const fileId = this.fileIdMap.get(filePath);
      if (!fileId) {
        console.warn(`File ID not found for ${filePath}`);
        return;
      }
      
      const directoryId = this.directoryIdMap.get(path.dirname(filePath));
      if (!directoryId) {
        console.warn(`Directory ID not found for ${path.dirname(filePath)}`);
        return;
      }
      
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
          this.repositoryId,
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
      console.error(`Error processing file content ${filePath}:`, error);
      // Continue with other files
    }
  }
}