/**
 * Tool schemas for the MCP server
 * 
 * This file defines the JSON Schema for each tool in the MCP server.
 */

/**
 * Schema for the list_services tool
 */
export const listServicesSchema = {
  type: 'object',
  properties: {
    includeDetails: {
      type: 'boolean',
      description: 'Include detailed information about each service (endpoints, dependencies, etc.)',
      default: false
    },
    format: {
      type: 'string',
      description: 'Output format (json, text, table)',
      enum: ['json', 'text', 'table'],
      default: 'table'
    }
  },
  required: [],
};

/**
 * Schema for the list_service_files tool
 */
export const listServiceFilesSchema = {
  type: 'object',
  properties: {
    service: {
      type: 'string',
      description: 'Name of the service (e.g., svc-accommodation, svc-order)',
    },
    path: {
      type: 'string',
      description: 'Optional subfolder path within the service',
      default: '/'
    },
    recursive: {
      type: 'boolean',
      description: 'List files recursively',
      default: false
    },
    fileTypes: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'Filter by file extensions (e.g., ["ts", "js"])',
      default: []
    }
  },
  required: ['service'],
};

/**
 * Schema for the visualize_service_interactions tool
 */
export const visualizeServiceInteractionsSchema = {
  type: 'object',
  properties: {
    context: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description: 'Service name'
        },
        file: {
          type: 'string',
          description: 'File path within the service'
        },
        function: {
          type: 'string',
          description: 'Function or method name (optional)',
        },
        line: {
          type: 'number',
          description: 'Line number (optional)'
        }
      },
      required: ['service', 'file']
    },
    depth: {
      type: 'number',
      description: 'How many levels of service interactions to include',
      default: 2
    },
    includeMessageQueue: {
      type: 'boolean',
      description: 'Include message queue events',
      default: true
    },
    includeRestCalls: {
      type: 'boolean',
      description: 'Include REST API calls',
      default: true
    },
    format: {
      type: 'string',
      description: 'Visualization format (mermaid, dot, svg)',
      enum: ['mermaid', 'dot', 'svg'],
      default: 'mermaid'
    }
  },
  required: ['context'],
};

/**
 * Schema for the get_code_context tool
 */
export const getCodeContextSchema = {
  type: 'object',
  properties: {
    service: {
      type: 'string',
      description: 'Service name'
    },
    file: {
      type: 'string',
      description: 'File path within the service'
    },
    line: {
      type: 'number',
      description: 'Line number (optional)'
    },
    function: {
      type: 'string',
      description: 'Function or method name (optional)'
    },
    contextLines: {
      type: 'number',
      description: 'Number of context lines before and after',
      default: 5
    },
    includeVariables: {
      type: 'boolean',
      description: 'Include variable definitions and usages',
      default: true
    },
    includeDependencies: {
      type: 'boolean',
      description: 'Include imported/required dependencies',
      default: true
    },
    includeCallers: {
      type: 'boolean',
      description: 'Include functions that call this code',
      default: false
    }
  },
  required: ['service', 'file'],
};

/**
 * Schema for the trace_error_path tool
 */
export const traceErrorPathSchema = {
  type: 'object',
  properties: {
    errorTrace: {
      type: 'string',
      description: 'Error stack trace'
    },
    startService: {
      type: 'string',
      description: 'Service where the error originated (optional)'
    },
    includeMessageQueue: {
      type: 'boolean',
      description: 'Include message queue events in the trace',
      default: true
    },
    format: {
      type: 'string',
      description: 'Output format (json, text, mermaid)',
      enum: ['json', 'text', 'mermaid'],
      default: 'mermaid'
    }
  },
  required: ['errorTrace'],
};