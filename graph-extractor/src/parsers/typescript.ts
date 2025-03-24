import fs from 'node:fs/promises';
import path from 'node:path';
import * as ts from 'typescript';
import type {
  AstNode,
  ClassInfo,
  ExportInfo,
  ExpressionInfo,
  FunctionInfo,
  ImportInfo,
  MethodInfo,
  ParameterInfo,
  ParseResult,
  Parser,
  PropertyInfo,
  VariableInfo,
} from './interface.js';

/**
 * TypeScript parser implementation using TypeScript's native compiler API
 */
export class TypeScriptParser implements Parser {
  /**
   * Find and load tsconfig.json for a given file path
   */
  private async findTsConfig(filePath: string): Promise<ts.ParsedCommandLine | undefined> {
    try {
      // Get the directory of the file
      const fileDir = path.dirname(filePath);
      
      // Find the tsconfig.json file by walking up the directory tree
      let currentDir = fileDir;
      let configPath: string | undefined;
      
      while (currentDir !== path.parse(currentDir).root) {
        const potentialConfigPath = path.join(currentDir, 'tsconfig.json');
        try {
          await fs.access(potentialConfigPath);
          configPath = potentialConfigPath;
          break;
        } catch {
          // Move up one directory
          currentDir = path.dirname(currentDir);
        }
      }
      
      if (!configPath) {
        console.log(`No tsconfig.json found for ${filePath}, using default compiler options`);
        return undefined;
      }
      
      // Read and parse the tsconfig.json file using TypeScript's API
      const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
      if (configFile.error) {
        console.error(`Error reading tsconfig.json: ${configFile.error.messageText}`);
        return undefined;
      }
      
      // Parse the tsconfig.json content
      const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        path.dirname(configPath)
      );
      
      return parsedConfig;
    } catch (error) {
      console.error(`Error finding or parsing tsconfig.json for ${filePath}:`, error);
      return undefined;
    }
  }

  /**
   * Parse a TypeScript file
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseSource(content, filePath);
    } catch (error) {
      console.error(`Error parsing file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Parse TypeScript source code
   */
  async parseSource(source: string, filePath: string): Promise<ParseResult> {
    try {
      // Find and load tsconfig.json
      const parsedConfig = await this.findTsConfig(filePath);
      
      // Create compiler options, using tsconfig.json if available
      const compilerOptions = parsedConfig?.options || {
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      };
      
      // Create a TypeScript program
      const host = ts.createCompilerHost(compilerOptions);
      
      // Override the readFile function to return our source for the current file
      const originalReadFile = host.readFile;
      host.readFile = (fileName) => {
        if (path.resolve(fileName) === path.resolve(filePath)) {
          return source;
        }
        return originalReadFile(fileName);
      };
      
      // Create a program with just this file
      const program = ts.createProgram([filePath], compilerOptions, host);
      const sourceFile = program.getSourceFile(filePath);
      const typeChecker = program.getTypeChecker();
      
      if (!sourceFile) {
        throw new Error(`Failed to get source file for ${filePath}`);
      }

      // Initialize result containers
      const ast: AstNode = {
        type: 'File',
        name: path.basename(filePath),
        children: [],
      };
      
      const imports: ImportInfo[] = [];
      const exports: ExportInfo[] = [];
      const classes: ClassInfo[] = [];
      const functions: FunctionInfo[] = [];
      const variables: VariableInfo[] = [];
      const expressions: ExpressionInfo[] = [];

      // Visit each node in the source file
      this.visitNode(sourceFile, {
        imports,
        exports,
        classes,
        functions,
        variables,
        expressions,
        sourceFile,
        typeChecker,
      });

      return {
        ast,
        imports,
        exports,
        classes,
        functions,
        variables,
        expressions,
      };
    } catch (error) {
      console.error(`Error parsing source for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Visit a TypeScript AST node and extract information
   */
  private visitNode(
    node: ts.Node,
    context: {
      imports: ImportInfo[];
      exports: ExportInfo[];
      classes: ClassInfo[];
      functions: FunctionInfo[];
      variables: VariableInfo[];
      expressions: ExpressionInfo[];
      sourceFile: ts.SourceFile;
      typeChecker?: ts.TypeChecker;
    }
  ): void {
    // Destructure context, but only include typeChecker if we're going to use it
    const { imports, exports, classes, functions, variables, expressions, sourceFile } = context;
    
    // Process imports
    if (ts.isImportDeclaration(node)) {
      this.processImport(node, imports, sourceFile);
    }
    
    // Process exports
    else if (ts.isExportDeclaration(node)) {
      this.processExport(node, exports, sourceFile);
    }
    
    // Process classes
    else if (ts.isClassDeclaration(node)) {
      this.processClass(node, classes, sourceFile, context.typeChecker);
    }
    
    // Process functions
    else if (ts.isFunctionDeclaration(node)) {
      this.processFunction(node, functions, sourceFile, context.typeChecker);
    }
    
    // Process variables
    else if (ts.isVariableStatement(node)) {
      this.processVariableStatement(node, variables, sourceFile, context.typeChecker);
    }
    
    // Process export assignments (export default, export =)
    else if (ts.isExportAssignment(node)) {
      const range: [number, number] = [
        node.getStart(sourceFile),
        node.getEnd(),
      ];
      
      const name = node.expression.getText(sourceFile);
      exports.push({
        name,
        isDefault: !node.isExportEquals,
        range,
      });
    }
    
    // Process expressions
    this.processExpression(node, expressions, sourceFile, context);
    
    // Recursively visit child nodes
    ts.forEachChild(node, (child) => this.visitNode(child, context));
  }

  /**
   * Process an import declaration
   */
  private processImport(
    node: ts.ImportDeclaration,
    imports: ImportInfo[],
    sourceFile: ts.SourceFile
  ): void {
    const moduleSpecifier = node.moduleSpecifier;
    if (ts.isStringLiteral(moduleSpecifier)) {
      const path = moduleSpecifier.text;
      const range: [number, number] = [
        node.getStart(sourceFile),
        node.getEnd(),
      ];
      
      // Default import
      if (node.importClause?.name) {
        imports.push({
          name: node.importClause.name.text,
          path,
          isDefault: true,
          range,
        });
      }
      
      // Named imports
      if (node.importClause?.namedBindings) {
        if (ts.isNamedImports(node.importClause.namedBindings)) {
          // Handle named imports like: import { x, y } from 'module'
          const elements = node.importClause.namedBindings.elements;
          for (const element of elements) {
            imports.push({
              name: element.name.text,
              path,
              isDefault: false,
              range,
            });
          }
        } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
          // Handle namespace imports like: import * as x from 'module'
          imports.push({
            name: node.importClause.namedBindings.name.text,
            path,
            isDefault: false,
            range,
          });
        }
      }
      
      // Handle bare imports like: import 'module'
      if (!node.importClause) {
        imports.push({
          name: path,
          path,
          range,
        });
      }
    }
  }

  /**
   * Process an export declaration
   */
  private processExport(
    node: ts.ExportDeclaration,
    exports: ExportInfo[],
    sourceFile: ts.SourceFile
  ): void {
    const range: [number, number] = [
      node.getStart(sourceFile),
      node.getEnd(),
    ];
    
    // Handle export * from 'module'
    if (node.moduleSpecifier && !node.exportClause) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        exports.push({
          name: node.moduleSpecifier.text,
          range,
        });
      }
      return;
    }
    
    // Handle named exports
    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) {
        exports.push({
          name: element.name.text,
          range,
        });
      }
    }
  }

  /**
   * Process a class declaration
   */
  private processClass(
    node: ts.ClassDeclaration,
    classes: ClassInfo[],
    sourceFile: ts.SourceFile,
    typeChecker?: ts.TypeChecker
  ): void {
    if (!node.name) return; // Skip anonymous classes
    
    const className = node.name.text;
    const range: [number, number] = [
      node.getStart(sourceFile),
      node.getEnd(),
    ];
    
    // Get superclass if any
    let superClass: string | undefined;
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword && clause.types.length > 0) {
          superClass = clause.types[0].getText(sourceFile);
          break;
        }
      }
    }
    
    // Get implemented interfaces if any
    const interfaces: string[] = [];
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          for (const type of clause.types) {
            interfaces.push(type.getText(sourceFile));
          }
        }
      }
    }
    
    // Process methods and properties
    const methods: MethodInfo[] = [];
    const properties: PropertyInfo[] = [];
    
    for (const member of node.members) {
      // Process methods
      if (ts.isMethodDeclaration(member)) {
        if (!member.name) continue;
        
        const methodName = member.name.getText(sourceFile);
        const methodRange: [number, number] = [
          member.getStart(sourceFile),
          member.getEnd(),
        ];
        
        // Get method parameters
        const parameters: ParameterInfo[] = this.getParameters(member.parameters, sourceFile, typeChecker);
        
        // Get return type
        let returnType: string | undefined;
        
        // Use type checker if available for more accurate return type information
        if (typeChecker && ts.isMethodDeclaration(member)) {
          try {
            const signature = typeChecker.getSignatureFromDeclaration(member);
            if (signature) {
              const returnTypeFromChecker = typeChecker.getReturnTypeOfSignature(signature);
              if (returnTypeFromChecker) {
                returnType = typeChecker.typeToString(returnTypeFromChecker);
              }
            }
          } catch (_error) {
            // Fallback to AST-based type extraction if type checker fails
            if (member.type) {
              returnType = member.type.getText(sourceFile);
            }
          }
        } else if (member.type) {
          returnType = member.type.getText(sourceFile);
        }
        
        // Check if method is async
        const isAsync = member.modifiers?.some(
          (mod) => mod.kind === ts.SyntaxKind.AsyncKeyword
        ) || false;
        
        // Check if method is static
        const isStatic = member.modifiers?.some(
          (mod) => mod.kind === ts.SyntaxKind.StaticKeyword
        ) || false;
        
        // Determine visibility
        let visibility: 'public' | 'private' | 'protected' = 'public';
        if (member.modifiers) {
          for (const modifier of member.modifiers) {
            if (modifier.kind === ts.SyntaxKind.PrivateKeyword) {
              visibility = 'private';
              break;
            }
            if (modifier.kind === ts.SyntaxKind.ProtectedKeyword) {
              visibility = 'protected';
              break;
            }
          }
        }
        
        // Create method info
        const methodInfo: MethodInfo = {
          name: methodName,
          parameters,
          returnType,
          isAsync,
          isStatic,
          visibility,
          range: methodRange,
          expressions: [], // Initialize empty expressions array
        };
        
        methods.push(methodInfo);
      }
      
      // Process properties
      else if (ts.isPropertyDeclaration(member)) {
        if (!member.name) continue;
        
        const propertyName = member.name.getText(sourceFile);
        const propertyRange: [number, number] = [
          member.getStart(sourceFile),
          member.getEnd(),
        ];
        
        // Get property type
        let propertyType: string | undefined;
        
        // Use type checker if available for more accurate type information
        if (typeChecker && ts.isPropertyDeclaration(member)) {
          try {
            const type = typeChecker.getTypeAtLocation(member);
            if (type) {
              propertyType = typeChecker.typeToString(type);
            }
          } catch (_error) {
            // Fallback to AST-based type extraction if type checker fails
            if (member.type) {
              propertyType = member.type.getText(sourceFile);
            }
          }
        } else if (member.type) {
          propertyType = member.type.getText(sourceFile);
        }
        
        // Check if property is static
        const isStatic = member.modifiers?.some(
          (mod) => mod.kind === ts.SyntaxKind.StaticKeyword
        ) || false;
        
        // Determine visibility
        let visibility: 'public' | 'private' | 'protected' = 'public';
        if (member.modifiers) {
          for (const modifier of member.modifiers) {
            if (modifier.kind === ts.SyntaxKind.PrivateKeyword) {
              visibility = 'private';
              break;
            }
            if (modifier.kind === ts.SyntaxKind.ProtectedKeyword) {
              visibility = 'protected';
              break;
            }
          }
        }
        
        properties.push({
          name: propertyName,
          type: propertyType,
          isStatic,
          visibility,
          range: propertyRange,
        });
      }
    }
    
    classes.push({
      name: className,
      methods,
      properties,
      range,
      superClass,
      interfaces: interfaces.length > 0 ? interfaces : undefined,
    });
  }

  /**
   * Process a function declaration
   */
  private processFunction(
    node: ts.FunctionDeclaration,
    functions: FunctionInfo[],
    sourceFile: ts.SourceFile,
    typeChecker?: ts.TypeChecker
  ): void {
    if (!node.name) return; // Skip anonymous functions
    
    const functionName = node.name.text;
    const range: [number, number] = [
      node.getStart(sourceFile),
      node.getEnd(),
    ];
    
    // Get function parameters
    const parameters: ParameterInfo[] = this.getParameters(node.parameters, sourceFile, typeChecker);
    
    // Get return type
    let returnType: string | undefined;
    
    // Use type checker if available for more accurate return type information
    if (typeChecker && node.name) {
      try {
        const signature = typeChecker.getSignatureFromDeclaration(node);
        if (signature) {
          const returnTypeFromChecker = typeChecker.getReturnTypeOfSignature(signature);
          if (returnTypeFromChecker) {
            returnType = typeChecker.typeToString(returnTypeFromChecker);
          }
        }
      } catch (_error) {
        // Fallback to AST-based type extraction if type checker fails
        if (node.type) {
          returnType = node.type.getText(sourceFile);
        }
      }
    } else if (node.type) {
      returnType = node.type.getText(sourceFile);
    }
    
    // Check if function is async
    const isAsync = node.modifiers?.some(
      (mod) => mod.kind === ts.SyntaxKind.AsyncKeyword
    ) || false;
    
    // Check if function is exported
    const isExported = node.modifiers?.some(
      (mod) =>
        mod.kind === ts.SyntaxKind.ExportKeyword ||
        mod.kind === ts.SyntaxKind.DefaultKeyword
    ) || false;
    
    // Create function info
    const functionInfo: FunctionInfo = {
      name: functionName,
      parameters,
      returnType,
      isAsync,
      isExported,
      range,
      expressions: [], // Initialize empty expressions array
    };
    
    functions.push(functionInfo);
  }

  /**
   * Process a variable statement
   */
  private processVariableStatement(
    node: ts.VariableStatement,
    variables: VariableInfo[],
    sourceFile: ts.SourceFile,
    typeChecker?: ts.TypeChecker
  ): void {
    // Check if variable is exported
    const isExported = node.modifiers?.some(
      (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
    ) || false;
    
    // Process each variable declaration
    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      
      const variableName = declaration.name.text;
      const range: [number, number] = [
        declaration.getStart(sourceFile),
        declaration.getEnd(),
      ];
      
      // Get variable type
      let variableType: string | undefined;
      
      // Use type checker if available for more accurate variable type information
      if (typeChecker && ts.isIdentifier(declaration.name)) {
        try {
          const type = typeChecker.getTypeAtLocation(declaration);
          if (type) {
            variableType = typeChecker.typeToString(type);
          }
        } catch (_error) {
          // Fallback to AST-based type extraction if type checker fails
          if (declaration.type) {
            variableType = declaration.type.getText(sourceFile);
          }
        }
      } else if (declaration.type) {
        variableType = declaration.type.getText(sourceFile);
      }
      
      // Check if variable is const
      const isConst = !!(node.declarationList.flags & ts.NodeFlags.Const);
      
      // Create variable info
      const variableInfo: VariableInfo = {
        name: variableName,
        type: variableType,
        isConst,
        isExported,
        range,
        expressions: [], // Initialize empty expressions array
      };
      
      variables.push(variableInfo);
    }
  }

  /**
   * Extract parameter information from function/method parameters
   */
  private getParameters(
    parameters: ts.NodeArray<ts.ParameterDeclaration>,
    sourceFile: ts.SourceFile,
    typeChecker?: ts.TypeChecker
  ): ParameterInfo[] {
    return parameters.map((param) => {
      const paramName = param.name.getText(sourceFile);
      
      // Get parameter type
      let paramType: string | undefined;
      
      // Use type checker if available for more accurate parameter type information
      if (typeChecker) {
        try {
          const type = typeChecker.getTypeAtLocation(param);
          if (type) {
            paramType = typeChecker.typeToString(type);
          }
        } catch (_error) {
          // Fallback to AST-based type extraction if type checker fails
          if (param.type) {
            paramType = param.type.getText(sourceFile);
          }
        }
      } else if (param.type) {
        paramType = param.type.getText(sourceFile);
      }
      
      // Check if parameter is optional
      const isOptional = param.questionToken !== undefined;
      
      // Check if parameter is rest
      const isRest = param.dotDotDotToken !== undefined;
      
      // Get default value if any
      let defaultValue: string | undefined;
      if (param.initializer) {
        defaultValue = param.initializer.getText(sourceFile);
      }
      
      return {
        name: paramName,
        type: paramType,
        isOptional,
        isRest,
        defaultValue,
      };
    });
  }

  /**
   * Process expressions in a node
   */
  private processExpression(
    node: ts.Node,
    expressions: ExpressionInfo[],
    sourceFile: ts.SourceFile,
    context: {
      functions: FunctionInfo[];
      variables: VariableInfo[];
      classes: ClassInfo[];
      sourceFile: ts.SourceFile;
      typeChecker?: ts.TypeChecker;
    }
  ): void {
    // Skip non-expression nodes and nodes that are too simple
    if (!this.isRelevantExpression(node)) {
      return;
    }

    // Get the parent function, method, or variable declaration
    const parentInfo = this.findParentContext(node, context);
    if (!parentInfo) {
      return; // Skip if we can't find a parent context
    }

    // Create expression info
    const expressionInfo: ExpressionInfo = {
      type: ts.SyntaxKind[node.kind],
      text: node.getText(sourceFile),
      range: [node.getStart(sourceFile), node.getEnd()],
      parentId: parentInfo.id,
    };

    // Extract references from the expression
    if (context.typeChecker) {
      expressionInfo.references = this.extractReferences(node, sourceFile, context.typeChecker);
    }

    // Add to the expressions array
    expressions.push(expressionInfo);

    // Add to the parent's expressions array
    if (parentInfo.type === 'function') {
      const functionInfo = context.functions.find(f => f.name === parentInfo.name);
      if (functionInfo) {
        if (!functionInfo.expressions) {
          functionInfo.expressions = [];
        }
        functionInfo.expressions.push(expressionInfo);
      }
    } else if (parentInfo.type === 'variable') {
      const variableInfo = context.variables.find(v => v.name === parentInfo.name);
      if (variableInfo) {
        if (!variableInfo.expressions) {
          variableInfo.expressions = [];
        }
        variableInfo.expressions.push(expressionInfo);
      }
    }
  }

  /**
   * Check if a node is a relevant expression that should be extracted
   */
  private isRelevantExpression(node: ts.Node): boolean {
    // Skip simple literals and identifiers
    if (
      ts.isStringLiteral(node) ||
      ts.isNumericLiteral(node) ||
      ts.isIdentifier(node) ||
      ts.isToken(node)
    ) {
      return false;
    }

    // Include these expression types
    return (
      ts.isBinaryExpression(node) ||
      ts.isCallExpression(node) ||
      ts.isPropertyAccessExpression(node) ||
      ts.isObjectLiteralExpression(node) ||
      ts.isArrayLiteralExpression(node) ||
      ts.isAwaitExpression(node) ||
      ts.isConditionalExpression(node) ||
      ts.isNewExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node)
    );
  }

  /**
   * Find the parent function, method, or variable declaration for an expression
   */
  private findParentContext(
    node: ts.Node,
    context: {
      functions: FunctionInfo[];
      variables: VariableInfo[];
      classes: ClassInfo[];
      sourceFile: ts.SourceFile;
    }
  ): { type: 'function' | 'variable'; name: string; id: string } | undefined {
    // Walk up the AST to find the parent function or variable declaration
    let current: ts.Node | undefined = node;
    
    while (current) {
      // Check if we're in a function declaration
      if (ts.isFunctionDeclaration(current) && current.name) {
        const functionName = current.name.text;
        const functionInfo = context.functions.find(f => f.name === functionName);
        if (functionInfo) {
          return { type: 'function', name: functionName, id: functionName };
        }
      }
      
      // Check if we're in a variable declaration
      if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
        const variableName = current.name.text;
        const variableInfo = context.variables.find(v => v.name === variableName);
        if (variableInfo) {
          return { type: 'variable', name: variableName, id: variableName };
        }
      }
      
      // Move up to the parent
      current = current.parent;
    }
    
    return undefined;
  }

  /**
   * Extract references from an expression
   */
  private extractReferences(
    node: ts.Node,
    _sourceFile: ts.SourceFile, // Prefixed with underscore to indicate it's not used directly
    typeChecker: ts.TypeChecker
  ): string[] {
    const references: string[] = [];
    
    // Helper function to recursively visit nodes and collect references
    const visitNode = (n: ts.Node) => {
      // If it's an identifier, try to get its symbol
      if (ts.isIdentifier(n)) {
        try {
          const symbol = typeChecker.getSymbolAtLocation(n);
          if (symbol) {
            const declaration = symbol.declarations?.[0];
            if (declaration) {
              // Get the name of the referenced symbol
              const name = symbol.getName();
              if (name && !references.includes(name)) {
                references.push(name);
              }
            }
          }
        } catch (_error) {
          // Ignore errors in type checking
        }
      }
      
      // Visit children
      n.forEachChild(visitNode);
    };
    
    // Start the recursive visit
    visitNode(node);
    
    return references;
  }

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[] {
    return ['.ts', '.tsx', '.js', '.jsx'];
  }
}