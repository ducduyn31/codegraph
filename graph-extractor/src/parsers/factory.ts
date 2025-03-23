import { Parser } from './interface.js';
import { TypeScriptParser } from './typescript.js';

/**
 * Parser type enum
 */
export enum ParserType {
  TypeScript = 'typescript',
  JavaScript = 'javascript',
  // More parser types can be added in the future
}

/**
 * Factory for creating parser instances
 */
export class ParserFactory {
  private static parsers: Map<string, Parser> = new Map();

  /**
   * Get a parser for a specific file extension
   */
  static getParserForExtension(extension: string): Parser | null {
    // Normalize extension
    if (!extension.startsWith('.')) {
      extension = `.${extension}`;
    }
    extension = extension.toLowerCase();

    // Check if we have a parser for this extension
    for (const parser of ParserFactory.parsers.values()) {
      if (parser.getSupportedExtensions().includes(extension)) {
        return parser;
      }
    }

    return null;
  }

  /**
   * Get a parser by type
   */
  static getParser(type: ParserType): Parser {
    // Check if we already have an instance
    if (ParserFactory.parsers.has(type)) {
      return ParserFactory.parsers.get(type)!;
    }

    // Create a new instance
    let parser: Parser;
    switch (type) {
      case ParserType.TypeScript:
      case ParserType.JavaScript:
        parser = new TypeScriptParser();
        break;
      default:
        throw new Error(`Unknown parser type: ${type}`);
    }

    // Cache the instance
    ParserFactory.parsers.set(type, parser);
    return parser;
  }

  /**
   * Initialize all parsers
   */
  static initialize(): void {
    // Initialize TypeScript parser
    ParserFactory.getParser(ParserType.TypeScript);
  }
}