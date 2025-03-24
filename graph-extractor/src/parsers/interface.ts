/**
 * Abstract Syntax Tree (AST) node
 */
export interface AstNode {
  type: string;
  name?: string;
  value?: string;
  range?: [number, number];
  children?: AstNode[];
  parent?: AstNode;
  [key: string]: unknown;
}

/**
 * Parser result
 */
export interface ParseResult {
  ast: AstNode;
  imports: ImportInfo[];
  exports: ExportInfo[];
  classes: ClassInfo[];
  functions: FunctionInfo[];
  variables: VariableInfo[];
  expressions: ExpressionInfo[];
}

/**
 * Import information
 */
export interface ImportInfo {
  name: string;
  path: string;
  isDefault?: boolean;
  range: [number, number];
}

/**
 * Export information
 */
export interface ExportInfo {
  name: string;
  isDefault?: boolean;
  range: [number, number];
}

/**
 * Class information
 */
export interface ClassInfo {
  name: string;
  methods: MethodInfo[];
  properties: PropertyInfo[];
  range: [number, number];
  superClass?: string;
  interfaces?: string[];
}

/**
 * Method information
 */
export interface MethodInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType?: string;
  isAsync: boolean;
  isStatic: boolean;
  visibility: 'public' | 'private' | 'protected';
  range: [number, number];
  expressions?: ExpressionInfo[];
}

/**
 * Property information
 */
export interface PropertyInfo {
  name: string;
  type?: string;
  isStatic: boolean;
  visibility: 'public' | 'private' | 'protected';
  range: [number, number];
}

/**
 * Function information
 */
export interface FunctionInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  range: [number, number];
  expressions?: ExpressionInfo[];
}

/**
 * Parameter information
 */
export interface ParameterInfo {
  name: string;
  type?: string;
  defaultValue?: string;
  isOptional: boolean;
  isRest: boolean;
}

/**
 * Variable information
 */
export interface VariableInfo {
  name: string;
  type?: string;
  isConst: boolean;
  isExported: boolean;
  range: [number, number];
  expressions?: ExpressionInfo[];
}

/**
 * Expression information
 */
export interface ExpressionInfo {
  type: string;
  text: string;
  range: [number, number];
  parentId?: string;
  references?: string[];
}

/**
 * Parser interface
 */
export interface Parser {
  /**
   * Parse a file and return the AST and extracted information
   */
  parseFile(filePath: string): Promise<ParseResult>;

  /**
   * Parse source code and return the AST and extracted information
   */
  parseSource(source: string, filePath: string): Promise<ParseResult>;

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[];
}