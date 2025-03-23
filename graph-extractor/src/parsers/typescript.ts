import fs from 'fs/promises';
import path from 'path';
import { TypescriptParser } from 'typescript-parser';
import {
  AstNode,
  ClassInfo,
  ExportInfo,
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
 * TypeScript parser implementation
 */
export class TypeScriptParser implements Parser {
  private parser: TypescriptParser;

  constructor() {
    this.parser = new TypescriptParser();
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
      const extension = path.extname(filePath);
      const parsed = await this.parser.parseSource(source);
      
      // Convert to our AST format
      const ast: AstNode = {
        type: 'File',
        name: path.basename(filePath),
        children: [],
      };

      // Extract imports
      const imports: ImportInfo[] = parsed.imports.map((imp) => ({
        name: imp.libraryName,
        path: imp.libraryName,
        isDefault: imp.defaultAlias !== undefined,
        range: [imp.start || 0, imp.end || 0],
      }));

      // Extract exports
      const exports: ExportInfo[] = parsed.exports.map((exp) => ({
        name: exp.name,
        isDefault: exp.isDefault,
        range: [exp.start || 0, exp.end || 0],
      }));

      // Extract classes
      const classes: ClassInfo[] = parsed.declarations
        .filter((decl) => decl.constructor.name === 'ClassDeclaration')
        .map((cls: any) => {
          // Extract methods
          const methods: MethodInfo[] = cls.methods.map((method: any) => ({
            name: method.name,
            parameters: method.parameters.map((param: any) => ({
              name: param.name,
              type: param.type,
              isOptional: param.isOptional,
              isRest: param.isRestParameter,
              defaultValue: undefined, // Not provided by typescript-parser
            })),
            returnType: method.type,
            isAsync: method.isAsync,
            isStatic: method.isStatic,
            visibility: method.visibility || 'public',
            range: [method.start || 0, method.end || 0],
          }));

          // Extract properties
          const properties: PropertyInfo[] = cls.properties.map((prop: any) => ({
            name: prop.name,
            type: prop.type,
            isStatic: prop.isStatic,
            visibility: prop.visibility || 'public',
            range: [prop.start || 0, prop.end || 0],
          }));

          return {
            name: cls.name,
            methods,
            properties,
            range: [cls.start || 0, cls.end || 0],
            superClass: cls.extends,
            interfaces: cls.implements,
          };
        });

      // Extract functions
      const functions: FunctionInfo[] = parsed.declarations
        .filter((decl) => decl.constructor.name === 'FunctionDeclaration')
        .map((func: any) => ({
          name: func.name,
          parameters: func.parameters.map((param: any) => ({
            name: param.name,
            type: param.type,
            isOptional: param.isOptional,
            isRest: param.isRestParameter,
            defaultValue: undefined, // Not provided by typescript-parser
          })),
          returnType: func.type,
          isAsync: func.isAsync,
          isExported: func.isExported,
          range: [func.start || 0, func.end || 0],
        }));

      // Extract variables
      const variables: VariableInfo[] = parsed.declarations
        .filter((decl) => decl.constructor.name === 'VariableDeclaration')
        .map((variable: any) => ({
          name: variable.name,
          type: variable.type,
          isConst: variable.isConst,
          isExported: variable.isExported,
          range: [variable.start || 0, variable.end || 0],
        }));

      return {
        ast,
        imports,
        exports,
        classes,
        functions,
        variables,
      };
    } catch (error) {
      console.error(`Error parsing source for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[] {
    return ['.ts', '.tsx', '.js', '.jsx'];
  }
}