import path, { parse } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { type Edge, EdgeType, type Node, NodeType } from '../types/index.js';
import type {
  ParseResult,
  ClassInfo,
  MethodInfo,
  FunctionInfo,
  VariableInfo,
  ImportInfo,
  ExpressionInfo
} from '../parsers/interface.js';

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
    _filePath: string, // Prefixed with underscore to indicate it's not used directly
    _repositoryId: string, // Prefixed with underscore to indicate it's not used directly
    _directoryId: string, // Prefixed with underscore to indicate it's not used directly
    fileId: string,
  ): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Extract different code elements
    this.extractClasses(parseResult.classes, fileId, nodes, edges);
    this.extractFunctions(parseResult.functions, fileId, nodes, edges);
    this.extractVariables(parseResult.variables, fileId, nodes, edges);
    this.extractImports(parseResult.imports, fileId, nodes);
    this.extractExpressions(parseResult.expressions, fileId, nodes, edges);
    
    // We'll handle exports later when we have more files parsed
    // for (const _exportInfo of parseResult.exports) { ... }

    return { nodes, edges };
  }

  /**
   * Extract classes and their methods
   */
  private extractClasses(
    classes: ClassInfo[],
    fileId: string,
    nodes: Node[],
    edges: Edge[]
  ): void {
    for (const classInfo of classes) {
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
      this.createContainsEdge(edges, fileId, classId);

      // Extract methods
      this.extractMethods(classInfo.methods, classId, nodes, edges);
    }
  }

  /**
   * Extract methods from a class
   */
  private extractMethods(
    methods: MethodInfo[],
    classId: string,
    nodes: Node[],
    edges: Edge[]
  ): void {
    for (const methodInfo of methods) {
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
      this.createContainsEdge(edges, classId, methodId);
    }
  }

  /**
   * Extract functions
   */
  private extractFunctions(
    functions: FunctionInfo[],
    fileId: string,
    nodes: Node[],
    edges: Edge[]
  ): void {
    for (const functionInfo of functions) {
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
      this.createContainsEdge(edges, fileId, functionId);
    }
  }

  /**
   * Extract variables
   */
  private extractVariables(
    variables: VariableInfo[],
    fileId: string,
    nodes: Node[],
    edges: Edge[]
  ): void {
    for (const variableInfo of variables) {
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
      this.createContainsEdge(edges, fileId, variableId);
    }
  }

  /**
   * Extract imports
   */
  private extractImports(
    imports: ImportInfo[],
    fileId: string,
    nodes: Node[]
  ): void {
    for (const importInfo of imports) {
      const importPath = importInfo.path;
      
      // Initialize imports array if needed
      this.initializeImportsArray(fileId, nodes);
      
      // Find the file node and add the import info
      const fileNode = nodes.find(n => n.id === fileId);
      if (fileNode && Array.isArray(fileNode.properties.imports)) {
        (fileNode.properties.imports as any[]).push({
          name: importInfo.name,
          path: importPath,
          isDefault: importInfo.isDefault,
          range: importInfo.range,
          // Flag to identify if this is a library import
          isLibrary: !importPath.startsWith('.') && !importPath.startsWith('/')
        });
      }
    }
  }

  /**
   * Initialize imports array for a file node
   */
  private initializeImportsArray(fileId: string, nodes: Node[]): void {
    if (!nodes.find(n => n.id === fileId)?.properties.imports) {
      // Find the file node and initialize imports array if needed
      const fileNode = nodes.find(n => n.id === fileId);
      if (fileNode) {
        fileNode.properties.imports = [];
      }
    }
  }

  /**
   * Extract expressions
   */
  private extractExpressions(
    expressions: ExpressionInfo[],
    fileId: string,
    nodes: Node[],
    edges: Edge[]
  ): void {
    for (const expressionInfo of expressions) {
      // Create expression node
      const expressionId = uuidv4();
      const expressionNode: Node = {
        id: expressionId,
        type: NodeType.Expression,
        name: expressionInfo.type,
        properties: {
          text: expressionInfo.text,
          range: expressionInfo.range,
          references: expressionInfo.references,
        },
      };
      nodes.push(expressionNode);

      // Create CONTAINS edge from file to expression
      this.createContainsEdge(edges, fileId, expressionId);

      // If the expression has a parent, create a relationship to it
      if (expressionInfo.parentId) {
        // Find the parent node (function, method, or variable)
        const parentNode = nodes.find(n =>
          (n.type === NodeType.Function || n.type === NodeType.Method || n.type === NodeType.Variable) &&
          n.name === expressionInfo.parentId
        );

        if (parentNode) {
          // Create CONTAINS edge from parent to expression
          this.createContainsEdge(edges, parentNode.id, expressionId);
        }
      }

      // Create relationships for references
      if (expressionInfo.references && expressionInfo.references.length > 0) {
        for (const reference of expressionInfo.references) {
          // Find the referenced node
          const referencedNode = nodes.find(n => n.name === reference);
          if (referencedNode) {
            // Create REFERENCES edge from expression to referenced node
            edges.push({
              id: uuidv4(),
              type: EdgeType.DependsOn,
              sourceId: expressionId,
              targetId: referencedNode.id,
              properties: {},
            });
          }
        }
      }
    }
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

    // Create repository, directory, and file nodes
    const repositoryId = this.createRepositoryNode(nodes, repositoryName, filePath);
    const directoryId = this.createDirectoryNode(nodes, filePath);
    const fileId = this.createFileNode(nodes, filePath);
    
    // Create relationships between nodes
    this.createContainsEdge(edges, repositoryId, directoryId);
    this.createContainsEdge(edges, directoryId, fileId);

    return {
      nodes,
      edges,
      repositoryId,
      directoryId,
      fileId,
    };
  }

  /**
   * Create a repository node
   */
  private createRepositoryNode(nodes: Node[], repositoryName: string, filePath: string): string {
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
    return repositoryId;
  }

  /**
   * Create a directory node
   */
  private createDirectoryNode(nodes: Node[], filePath: string): string {
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
    return directoryId;
  }

  /**
   * Create a file node
   */
  private createFileNode(nodes: Node[], filePath: string): string {
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
    return fileId;
  }

  /**
   * Create a CONTAINS edge between two nodes
   */
  private createContainsEdge(edges: Edge[], sourceId: string, targetId: string): void {
    edges.push({
      id: uuidv4(),
      type: EdgeType.Contains,
      sourceId,
      targetId,
      properties: {},
    });
  }

  /**
   * Extract cross-file relationships
   *
   * This should be called after all files have been parsed and initial nodes/edges extracted
   */
  extractCrossFileRelationships(
    allNodes: Node[],
    allEdges: Edge[],
    parseResults: Map<string, ParseResult>, // Removed underscore as we're now using this parameter
    fileIdMap: Map<string, string>,
  ): { nodes: Node[], edges: Edge[] } {
    const resultNodes: Node[] = [];
    const resultEdges: Edge[] = [];

    // Build maps of exported symbols
    const { fileExports } = this.buildExportMaps(allNodes, allEdges);
    
    // Process library imports using parseResults instead of allNodes
    const { moduleNodes } = this.processLibraryImportsFromParseResults(parseResults, resultNodes);
    
    // Process file imports and create relationships using parseResults
    this.processFileImportsFromParseResults(parseResults, fileIdMap, moduleNodes, fileExports, resultEdges);

    return { nodes: resultNodes, edges: resultEdges };
  }

  /**
   * Separate nodes and edges from the combined array
   */
  private separateNodesAndEdges(allNodes: Node[]): { graphNodes: Node[], graphEdges: Edge[] } {
    const graphNodes = allNodes.filter(item => !('sourceId' in item)) as Node[];
    const graphEdges = allNodes.filter(item => 'sourceId' in item && 'targetId' in item) as unknown as Edge[];
    return { graphNodes, graphEdges };
  }

  /**
   * Build maps of exported symbols and their containing files
   */
  private buildExportMaps(
    graphNodes: Node[],
    graphEdges: Edge[]
  ): { exportedSymbols: Map<string, string>, fileExports: Map<string, Map<string, string>> } {
    // Map of exported symbols to their node IDs
    const exportedSymbols = new Map<string, string>();
    // Map of files to their exported symbols
    const fileExports = new Map<string, Map<string, string>>();
    
    // Find all exported symbols
    for (const node of graphNodes) {
      if (
        (node.type === NodeType.Function || node.type === NodeType.Class || node.type === NodeType.Variable) &&
        node.properties.isExported
      ) {
        exportedSymbols.set(node.name, node.id);
        
        // Find the file that contains this node
        const containingEdges = graphEdges.filter(edge =>
          edge.type === EdgeType.Contains &&
          edge.targetId === node.id
        );
        
        // Then find the file node that is the source of one of these edges
        for (const edge of containingEdges) {
          const containingFile = graphNodes.find(n =>
            n.type === NodeType.File &&
            n.id === edge.sourceId
          );
          
          if (containingFile) {
            const containingFileId = containingFile.id;
            if (!fileExports.has(containingFileId)) {
              fileExports.set(containingFileId, new Map<string, string>());
            }
            fileExports.get(containingFileId)?.set(node.name, node.id);
            break; // Found the containing file, no need to continue
          }
        }
      }
    }
    
    return { exportedSymbols, fileExports };
  }

  /**
   * Process library imports and create module nodes using parse results
   */
  private processLibraryImportsFromParseResults(
    parseResults: Map<string, ParseResult>,
    resultNodes: Node[]
  ): { libraryImports: Map<string, { name: string, path: string }[]>, moduleNodes: Map<string, string> } {
    // Step 1: Collect all library imports
    const libraryImports = new Map<string, { name: string, path: string }[]>();
    
    // Iterate through all parse results
    for (const [_, parseResult] of parseResults.entries()) {
      // Process imports from the parse result
      for (const importInfo of parseResult.imports) {
        if (!importInfo.path.startsWith('.') && !importInfo.path.startsWith('/')) {
          // This is a library import
          const moduleName = this.getModuleName(importInfo.path);
          
          if (!libraryImports.has(moduleName)) {
            libraryImports.set(moduleName, []);
          }
          
          libraryImports.get(moduleName)?.push({
            name: importInfo.name,
            path: importInfo.path
          });
        }
      }
    }
    
    // Step 2: Create nodes for libraries
    const moduleNodes = new Map<string, string>(); // Map of module name to module node ID
    
    for (const [moduleName, imports] of libraryImports.entries()) {
      const moduleId = uuidv4();
      
      const moduleNode: Node = {
        id: moduleId,
        type: NodeType.Module,
        name: moduleName,
        properties: {
          isNodeModule: true,
          importPaths: [...new Set(imports.map(imp => imp.path))], // Unique paths
        },
      };
      
      resultNodes.push(moduleNode);
      moduleNodes.set(moduleName, moduleId);
    }
    
    return { libraryImports, moduleNodes };
  }

  /**
   * Process library imports and create module nodes (legacy method)
   */
  private processLibraryImports(
    graphNodes: Node[],
    resultNodes: Node[]
  ): { libraryImports: Map<string, { name: string, path: string }[]>, moduleNodes: Map<string, string> } {
    // Step 1: Collect all library imports
    const libraryImports = new Map<string, { name: string, path: string }[]>();
    
    for (const node of graphNodes) {
      if (node.type === NodeType.File && node.properties.imports) {
        const imports = node.properties.imports as any[];
                
        for (const importInfo of imports) {
          if (importInfo.isLibrary) {
            const moduleName = this.getModuleName(importInfo.path);
            
            if (!libraryImports.has(moduleName)) {
              libraryImports.set(moduleName, []);
            }
            
            libraryImports.get(moduleName)?.push({
              name: importInfo.name,
              path: importInfo.path
            });
          }
        }
      }
    }
    
    // Step 2: Create nodes for libraries
    const moduleNodes = new Map<string, string>(); // Map of module name to module node ID
    
    for (const [moduleName, imports] of libraryImports.entries()) {
      const moduleId = uuidv4();
      
      const moduleNode: Node = {
        id: moduleId,
        type: NodeType.Module,
        name: moduleName,
        properties: {
          isNodeModule: true,
          importPaths: [...new Set(imports.map(imp => imp.path))], // Unique paths
        },
      };
      
      resultNodes.push(moduleNode);
      moduleNodes.set(moduleName, moduleId);
    }
    
    return { libraryImports, moduleNodes };
  }

  /**
   * Get the module name from an import path
   */
  private getModuleName(importPath: string): string {
    // For scoped packages (@org/package), include both the org and package name
    if (importPath.startsWith('@') && importPath.includes('/')) {
      // Split by '/' and take the first two parts (@org/package)
      const parts = importPath.split('/');
      return `${parts[0]}/${parts[1]}`;
    }
    
    // For regular packages, just take the package name (before any '/')
    return importPath.includes('/')
      ? importPath.split('/')[0] // Get the package name from path like 'package/subpath'
      : importPath;
  }

  /**
   * Process file imports and create relationships
   */
  private processFileImports(
    graphNodes: Node[],
    fileIdMap: Map<string, string>,
    moduleNodes: Map<string, string>,
    fileExports: Map<string, Map<string, string>>,
    resultEdges: Edge[]
  ): void {
    for (const node of graphNodes) {
      if (node.type === NodeType.File && node.properties.imports) {
        const fileId = node.id;
        const imports = node.properties.imports as any[];
        
        for (const importInfo of imports) {
          if (importInfo.isLibrary) {
            this.processLibraryImport(importInfo, fileId, moduleNodes, resultEdges);
          } else {
            this.processFileImport(importInfo, node, fileId, fileIdMap, fileExports, resultEdges);
          }
        }
      }
    }
  }

  /**
   * Process file imports from parse results and create relationships
   */
  private processFileImportsFromParseResults(
    parseResults: Map<string, ParseResult>,
    fileIdMap: Map<string, string>,
    moduleNodes: Map<string, string>,
    fileExports: Map<string, Map<string, string>>,
    resultEdges: Edge[]
  ): void {
    // Iterate through all parse results
    for (const [filePath, parseResult] of parseResults.entries()) {
      // Get the file ID from the map
      const fileId = fileIdMap.get(filePath);
      if (!fileId) continue;
      
      // Process each import
      for (const importInfo of parseResult.imports) {
        if (!importInfo.path.startsWith('.') && !importInfo.path.startsWith('/')) {
          // This is a library import
          this.processLibraryImport({
            name: importInfo.name,
            path: importInfo.path,
            isDefault: importInfo.isDefault,
            range: importInfo.range,
            isLibrary: true
          }, fileId, moduleNodes, resultEdges);
        } else {
          // This is a file import
          // We need to find the node for this file
          const fileNode = {
            id: fileId,
            type: NodeType.File,
            name: path.basename(filePath),
            properties: {
              path: filePath
            }
          };
          
          this.processFileImport({
            name: importInfo.name,
            path: importInfo.path,
            isDefault: importInfo.isDefault,
            range: importInfo.range,
            isLibrary: false
          }, fileNode, fileId, fileIdMap, fileExports, resultEdges);
        }
      }
    }
  }

  /**
   * Process a library import and create an edge
   */
  private processLibraryImport(
    importInfo: any,
    fileId: string,
    moduleNodes: Map<string, string>,
    resultEdges: Edge[]
  ): void {
    const moduleName = this.getModuleName(importInfo.path);
    const moduleId = moduleNodes.get(moduleName);
    
    if (moduleId) {
      // Create IMPORTS edge from file to module
      resultEdges.push({
        id: uuidv4(),
        type: EdgeType.Imports,
        sourceId: fileId,
        targetId: moduleId,
        properties: {
          importName: importInfo.name,
          isDefault: importInfo.isDefault,
          importPath: importInfo.path,
          range: importInfo.range,
        },
      });
    }
  }

  /**
   * Process a file import and create edges
   */
  private processFileImport(
    importInfo: any,
    fileNode: Node,
    fileId: string,
    fileIdMap: Map<string, string>,
    fileExports: Map<string, Map<string, string>>,
    resultEdges: Edge[]
  ): void {
    const filePath = fileNode.properties.path as string;
    if (!filePath) return;
    
    // Resolve the imported file path
    let importedFilePath = importInfo.path;
    if (importInfo.path.startsWith('.')) {
      importedFilePath = path.resolve(path.dirname(filePath), importInfo.path);
    }
    
    // Try to find the file with extensions if needed
    const importedFileId = this.findImportedFileId(importedFilePath, fileIdMap);
    
    if (importedFileId) {
      // Create IMPORTS edge from file to imported file
      resultEdges.push({
        id: uuidv4(),
        type: EdgeType.Imports,
        sourceId: fileId,
        targetId: importedFileId,
        properties: {
          importName: importInfo.name,
          isDefault: importInfo.isDefault,
          importPath: importInfo.path,
        },
      });
      
      // If this is a named import, try to map it to the exported symbol
      this.processNamedImport(importInfo, fileId, importedFileId, fileExports, resultEdges);
    }
  }

  /**
   * Find the imported file ID with various extensions
   */
  private findImportedFileId(importedFilePath: string, fileIdMap: Map<string, string>): string | undefined {
    return fileIdMap.get(importedFilePath) ||
           fileIdMap.get(`${importedFilePath}.ts`) ||
           fileIdMap.get(`${importedFilePath}.js`) ||
           fileIdMap.get(`${importedFilePath}/index.ts`) ||
           fileIdMap.get(`${importedFilePath}/index.js`);
  }

  /**
   * Process a named import and create an edge to the exported symbol
   */
  private processNamedImport(
    importInfo: any,
    fileId: string,
    importedFileId: string,
    fileExports: Map<string, Map<string, string>>,
    resultEdges: Edge[]
  ): void {
    if (!importInfo.isDefault && fileExports.has(importedFileId)) {
      const fileExportedSymbols = fileExports.get(importedFileId);
      if (fileExportedSymbols?.has(importInfo.name)) {
        const targetSymbolId = fileExportedSymbols.get(importInfo.name);
        if (targetSymbolId) {
          // Create IMPORTS edge from file to the specific exported symbol
          resultEdges.push({
            id: uuidv4(),
            type: EdgeType.Imports,
            sourceId: fileId,
            targetId: targetSymbolId,
            properties: {
              importName: importInfo.name,
              isDefault: false,
              isNamedImport: true,
              importPath: importInfo.path,
            },
          });
        }
      }
    }
  }
}