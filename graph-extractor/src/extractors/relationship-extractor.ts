import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Edge, EdgeType, Node, NodeType } from '../types/index.js';
import { ParseResult } from '../parsers/interface.js';

/**
 * Relationship extractor
 * 
 * Analyzes parsed code and extracts relationships between different code elements
 */
export class RelationshipExtractor {
  /**
   * Extract nodes and edges from parsed code
   */
  extractFromParseResult(
    parseResult: ParseResult,
    filePath: string,
    repositoryId: string,
    directoryId: string,
    fileId: string,
  ): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Extract classes
    for (const classInfo of parseResult.classes) {
      // Create class node
      const classId = uuidv4();
      const classNode: Node = {
        id: classId,
        type: NodeType.Class,
        name: classInfo.name,
        properties: {
          superClass: classInfo.superClass,
          interfaces: classInfo.interfaces,
          range: classInfo.range,
        },
      };
      nodes.push(classNode);

      // Create CONTAINS edge from file to class
      edges.push({
        id: uuidv4(),
        type: EdgeType.Contains,
        sourceId: fileId,
        targetId: classId,
        properties: {},
      });

      // Extract methods
      for (const methodInfo of classInfo.methods) {
        // Create method node
        const methodId = uuidv4();
        const methodNode: Node = {
          id: methodId,
          type: NodeType.Method,
          name: methodInfo.name,
          properties: {
            returnType: methodInfo.returnType,
            isAsync: methodInfo.isAsync,
            isStatic: methodInfo.isStatic,
            visibility: methodInfo.visibility,
            range: methodInfo.range,
          },
        };
        nodes.push(methodNode);

        // Create CONTAINS edge from class to method
        edges.push({
          id: uuidv4(),
          type: EdgeType.Contains,
          sourceId: classId,
          targetId: methodId,
          properties: {},
        });
      }
    }

    // Extract functions
    for (const functionInfo of parseResult.functions) {
      // Create function node
      const functionId = uuidv4();
      const functionNode: Node = {
        id: functionId,
        type: NodeType.Function,
        name: functionInfo.name,
        properties: {
          returnType: functionInfo.returnType,
          isAsync: functionInfo.isAsync,
          isExported: functionInfo.isExported,
          range: functionInfo.range,
        },
      };
      nodes.push(functionNode);

      // Create CONTAINS edge from file to function
      edges.push({
        id: uuidv4(),
        type: EdgeType.Contains,
        sourceId: fileId,
        targetId: functionId,
        properties: {},
      });
    }

    // Extract variables
    for (const variableInfo of parseResult.variables) {
      // Create variable node
      const variableId = uuidv4();
      const variableNode: Node = {
        id: variableId,
        type: NodeType.Variable,
        name: variableInfo.name,
        properties: {
          type: variableInfo.type,
          isConst: variableInfo.isConst,
          isExported: variableInfo.isExported,
          range: variableInfo.range,
        },
      };
      nodes.push(variableNode);

      // Create CONTAINS edge from file to variable
      edges.push({
        id: uuidv4(),
        type: EdgeType.Contains,
        sourceId: fileId,
        targetId: variableId,
        properties: {},
      });
    }

    // Extract imports
    for (const importInfo of parseResult.imports) {
      // We'll handle imports later when we have more files parsed
      // For now, we'll just store the import information in the file node properties
    }

    // Extract exports
    for (const exportInfo of parseResult.exports) {
      // We'll handle exports later when we have more files parsed
      // For now, we'll just store the export information in the file node properties
    }

    return { nodes, edges };
  }

  /**
   * Extract file hierarchy nodes and edges
   */
  extractFileHierarchy(
    filePath: string,
    repositoryName: string,
  ): { nodes: Node[]; edges: Edge[]; repositoryId: string; directoryId: string; fileId: string } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create repository node
    const repositoryId = uuidv4();
    const repositoryNode: Node = {
      id: repositoryId,
      type: NodeType.Repository,
      name: repositoryName,
      properties: {
        path: path.dirname(filePath),
      },
    };
    nodes.push(repositoryNode);

    // Create directory node
    const directoryPath = path.dirname(filePath);
    const directoryId = uuidv4();
    const directoryNode: Node = {
      id: directoryId,
      type: NodeType.Directory,
      name: path.basename(directoryPath),
      properties: {
        path: directoryPath,
      },
    };
    nodes.push(directoryNode);

    // Create CONTAINS edge from repository to directory
    edges.push({
      id: uuidv4(),
      type: EdgeType.Contains,
      sourceId: repositoryId,
      targetId: directoryId,
      properties: {},
    });

    // Create file node
    const fileId = uuidv4();
    const fileNode: Node = {
      id: fileId,
      type: NodeType.File,
      name: path.basename(filePath),
      properties: {
        path: filePath,
        extension: path.extname(filePath),
      },
    };
    nodes.push(fileNode);

    // Create CONTAINS edge from directory to file
    edges.push({
      id: uuidv4(),
      type: EdgeType.Contains,
      sourceId: directoryId,
      targetId: fileId,
      properties: {},
    });

    return { 
      nodes, 
      edges,
      repositoryId,
      directoryId,
      fileId,
    };
  }

  /**
   * Extract cross-file relationships
   * 
   * This should be called after all files have been parsed and initial nodes/edges extracted
   */
  extractCrossFileRelationships(
    allNodes: Node[],
    parseResults: Map<string, ParseResult>,
    fileIdMap: Map<string, string>,
  ): Edge[] {
    const edges: Edge[] = [];

    // Map of exported symbols to their node IDs
    const exportedSymbols = new Map<string, string>();

    // Find all exported symbols
    for (const node of allNodes) {
      if (
        (node.type === NodeType.Function || node.type === NodeType.Class || node.type === NodeType.Variable) &&
        node.properties.isExported
      ) {
        exportedSymbols.set(node.name, node.id);
      }
    }

    // Process imports and create relationships
    for (const [filePath, parseResult] of parseResults.entries()) {
      const fileId = fileIdMap.get(filePath);
      if (!fileId) continue;

      for (const importInfo of parseResult.imports) {
        // For now, we'll only handle relative imports
        if (importInfo.path.startsWith('.')) {
          const importedFilePath = path.resolve(path.dirname(filePath), importInfo.path);
          const importedFileId = fileIdMap.get(importedFilePath);
          
          if (importedFileId) {
            // Create IMPORTS edge from file to imported file
            edges.push({
              id: uuidv4(),
              type: EdgeType.Imports,
              sourceId: fileId,
              targetId: importedFileId,
              properties: {
                importName: importInfo.name,
                isDefault: importInfo.isDefault,
              },
            });
          }
        }
      }
    }

    return edges;
  }
}