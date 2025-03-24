import { TypeScriptParser } from './typescript.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

/**
 * Convert a position offset to line and column numbers
 */
function getLineAndColumn(source: string, position: number): { line: number; column: number } {
  const lines = source.substring(0, position).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

async function main() {
  const parser = new TypeScriptParser();
  
  // Sample TypeScript code with various constructs
  const source = `
    import { useState } from 'react';
    import * as fs from 'fs';
    import defaultExport from 'module';
    
    export interface User {
      id: number;
      name: string;
    }
    
    export const API_URL = 'https://api.example.com';
    
    export function fetchUser(id: number): Promise<User> {
      return fetch(\`\${API_URL}/users/\${id}\`).then(res => res.json());
    }
    
    export class UserService {
      private apiClient: any;
      
      constructor(apiClient: any) {
        this.apiClient = apiClient;
      }
      
      public async getUser(id: number): Promise<User> {
        return this.apiClient.get(\`/users/\${id}\`);
      }
      
      protected formatUser(user: User): string {
        return \`User: \${user.name} (ID: \${user.id})\`;
      }
      
      static createDefault(): UserService {
        return new UserService({ get: (url: string) => fetch(url).then(res => res.json()) });
      }
    }
    
    export default UserService;
  `;

  try {
    console.log('Parsing TypeScript source...');
    const result = await parser.parseSource(source, 'test.ts');
    
    console.log('\n=== PARSE RESULT ===\n');
    
    // Log imports
    console.log('IMPORTS:');
    let i = 1;
    for (const imp of result.imports) {
      const startPos = getLineAndColumn(source, imp.range[0]);
      console.log(`  ${i++}. ${imp.name} from ${imp.path} (${imp.isDefault ? 'default' : 'named'}) - Line ${startPos.line}`);
    }
    
    // Log exports
    console.log('\nEXPORTS:');
    i = 1;
    for (const exp of result.exports) {
      const startPos = getLineAndColumn(source, exp.range[0]);
      console.log(`  ${i++}. ${exp.name} (${exp.isDefault ? 'default' : 'named'}) - Line ${startPos.line}`);
    }
    
    // Log classes
    console.log('\nCLASSES:');
    i = 1;
    for (const cls of result.classes) {
      const startPos = getLineAndColumn(source, cls.range[0]);
      console.log(`  ${i++}. ${cls.name} ${cls.superClass ? `extends ${cls.superClass}` : ''} - Line ${startPos.line}`);
      
      console.log('    Properties:');
      for (const prop of cls.properties) {
        const propPos = getLineAndColumn(source, prop.range[0]);
        console.log(`      - ${prop.visibility} ${prop.isStatic ? 'static ' : ''}${prop.name}: ${prop.type || 'any'} - Line ${propPos.line}`);
      }
      
      console.log('    Methods:');
      for (const method of cls.methods) {
        const methodPos = getLineAndColumn(source, method.range[0]);
        const params = method.parameters.map(p =>
          `${p.name}${p.isOptional ? '?' : ''}${p.isRest ? '...' : ''}: ${p.type || 'any'}`
        ).join(', ');
        console.log(`      - ${method.visibility} ${method.isStatic ? 'static ' : ''}${method.isAsync ? 'async ' : ''}${method.name}(${params}): ${method.returnType || 'any'} - Line ${methodPos.line}`);
      }
    }
    
    // Log functions
    console.log('\nFUNCTIONS:');
    i = 1;
    for (const func of result.functions) {
      const startPos = getLineAndColumn(source, func.range[0]);
      const params = func.parameters.map(p =>
        `${p.name}${p.isOptional ? '?' : ''}${p.isRest ? '...' : ''}: ${p.type || 'any'}`
      ).join(', ');
      console.log(`  ${i++}. ${func.isExported ? 'export ' : ''}${func.isAsync ? 'async ' : ''}${func.name}(${params}): ${func.returnType || 'any'} - Line ${startPos.line}`);
    }
    
    // Log variables
    console.log('\nVARIABLES:');
    i = 1;
    for (const variable of result.variables) {
      const startPos = getLineAndColumn(source, variable.range[0]);
      console.log(`  ${i++}. ${variable.isExported ? 'export ' : ''}${variable.isConst ? 'const' : 'let'} ${variable.name}: ${variable.type || 'any'} - Line ${startPos.line}`);
    }
    
    console.log('\n=== FULL RESULT ===\n');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error parsing TypeScript:', error);
  }
}

main().catch(console.error);