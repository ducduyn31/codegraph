import { Graph, Node, Edge, NodeType, EdgeType } from '../types/index.js';

/**
 * Context format
 */
export enum ContextFormat {
  JSON = 'json',
  Text = 'text',
  Markdown = 'markdown',
}

/**
 * Context assembler
 * 
 * Formats graph data into a more usable context for the MCP server
 */
export class ContextAssembler {
  /**
   * Format graph data
   */
  formatGraph(graph: Graph, format: ContextFormat = ContextFormat.JSON): string {
    switch (format) {
      case ContextFormat.JSON:
        return this.formatAsJson(graph);
      case ContextFormat.Text:
        return this.formatAsText(graph);
      case ContextFormat.Markdown:
        return this.formatAsMarkdown(graph);
      default:
        return this.formatAsJson(graph);
    }
  }

  /**
   * Format graph as JSON
   */
  private formatAsJson(graph: Graph): string {
    return JSON.stringify(graph, null, 2);
  }

  /**
   * Format graph as plain text
   */
  private formatAsText(graph: Graph): string {
    let result = `Code Structure (${graph.nodes.length} nodes, ${graph.edges.length} edges)\n\n`;

    // Group nodes by type
    const nodesByType = this.groupNodesByType(graph.nodes);

    // Format each type of node
    for (const [type, nodes] of Object.entries(nodesByType)) {
      result += `${type}s (${nodes.length}):\n`;
      for (const node of nodes) {
        result += `- ${node.name}\n`;
        
        // Add outgoing relationships
        const outgoingEdges = graph.edges.filter(edge => edge.sourceId === node.id);
        if (outgoingEdges.length > 0) {
          result += `  Relationships:\n`;
          for (const edge of outgoingEdges) {
            const targetNode = graph.nodes.find(n => n.id === edge.targetId);
            if (targetNode) {
              result += `  - ${edge.type} -> ${targetNode.type} ${targetNode.name}\n`;
            }
          }
        }
      }
      result += '\n';
    }

    return result;
  }

  /**
   * Format graph as Markdown
   */
  private formatAsMarkdown(graph: Graph): string {
    let result = `# Code Structure\n\n`;
    result += `**${graph.nodes.length} nodes, ${graph.edges.length} edges**\n\n`;

    // Group nodes by type
    const nodesByType = this.groupNodesByType(graph.nodes);

    // Format each type of node
    for (const [type, nodes] of Object.entries(nodesByType)) {
      result += `## ${type}s (${nodes.length})\n\n`;
      for (const node of nodes) {
        result += `### ${node.name}\n\n`;
        
        // Add properties
        result += `**Properties:**\n\n`;
        for (const [key, value] of Object.entries(node.properties)) {
          if (key !== 'range') { // Skip range for readability
            result += `- ${key}: ${JSON.stringify(value)}\n`;
          }
        }
        result += '\n';
        
        // Add outgoing relationships
        const outgoingEdges = graph.edges.filter(edge => edge.sourceId === node.id);
        if (outgoingEdges.length > 0) {
          result += `**Relationships:**\n\n`;
          for (const edge of outgoingEdges) {
            const targetNode = graph.nodes.find(n => n.id === edge.targetId);
            if (targetNode) {
              result += `- ${edge.type} -> ${targetNode.type} ${targetNode.name}\n`;
            }
          }
          result += '\n';
        }
        
        // Add incoming relationships
        const incomingEdges = graph.edges.filter(edge => edge.targetId === node.id);
        if (incomingEdges.length > 0) {
          result += `**Referenced by:**\n\n`;
          for (const edge of incomingEdges) {
            const sourceNode = graph.nodes.find(n => n.id === edge.sourceId);
            if (sourceNode) {
              result += `- ${sourceNode.type} ${sourceNode.name} -> ${edge.type}\n`;
            }
          }
          result += '\n';
        }
      }
    }

    return result;
  }

  /**
   * Group nodes by type
   */
  private groupNodesByType(nodes: Node[]): Record<string, Node[]> {
    const result: Record<string, Node[]> = {};
    
    for (const node of nodes) {
      const type = node.type;
      if (!result[type]) {
        result[type] = [];
      }
      result[type].push(node);
    }
    
    return result;
  }

  /**
   * Format code structure query result
   */
  formatCodeStructure(graph: Graph, format: ContextFormat = ContextFormat.Markdown): string {
    return this.formatGraph(graph, format);
  }

  /**
   * Format dependency trace query result
   */
  formatDependencyTrace(graph: Graph, format: ContextFormat = ContextFormat.Markdown): string {
    // For dependency traces, we want to focus on the imports/exports
    if (format === ContextFormat.Markdown) {
      let result = `# Dependency Trace\n\n`;
      result += `**${graph.nodes.length} nodes, ${graph.edges.length} edges**\n\n`;

      // Get all file nodes
      const fileNodes = graph.nodes.filter(node => node.type === NodeType.File);
      
      // For each file, show its dependencies
      for (const fileNode of fileNodes) {
        result += `## ${fileNode.name}\n\n`;
        
        // Outgoing dependencies (imports)
        const importEdges = graph.edges.filter(
          edge => edge.sourceId === fileNode.id && 
                 (edge.type === EdgeType.Imports || edge.type === EdgeType.DependsOn)
        );
        
        if (importEdges.length > 0) {
          result += `### Imports\n\n`;
          for (const edge of importEdges) {
            const targetNode = graph.nodes.find(n => n.id === edge.targetId);
            if (targetNode) {
              result += `- ${targetNode.name}`;
              if (edge.properties.importName) {
                result += ` (${edge.properties.importName})`;
              }
              result += '\n';
            }
          }
          result += '\n';
        }
        
        // Incoming dependencies (imported by)
        const importedByEdges = graph.edges.filter(
          edge => edge.targetId === fileNode.id && 
                 (edge.type === EdgeType.Imports || edge.type === EdgeType.DependsOn)
        );
        
        if (importedByEdges.length > 0) {
          result += `### Imported by\n\n`;
          for (const edge of importedByEdges) {
            const sourceNode = graph.nodes.find(n => n.id === edge.sourceId);
            if (sourceNode) {
              result += `- ${sourceNode.name}\n`;
            }
          }
          result += '\n';
        }
      }
      
      return result;
    }
    
    return this.formatGraph(graph, format);
  }

  /**
   * Format error path query result
   */
  formatErrorPaths(graph: Graph, format: ContextFormat = ContextFormat.Markdown): string {
    // For error paths, we want to focus on the error propagation
    if (format === ContextFormat.Markdown) {
      let result = `# Error Paths\n\n`;
      result += `**${graph.nodes.length} nodes, ${graph.edges.length} edges**\n\n`;

      // Get all error definition nodes
      const errorNodes = graph.nodes.filter(node => node.type === NodeType.ErrorDefinition);
      
      // For each error, show its sources and handlers
      for (const errorNode of errorNodes) {
        result += `## ${errorNode.name}\n\n`;
        
        // Error sources (throws)
        const throwsEdges = graph.edges.filter(
          edge => edge.targetId === errorNode.id && edge.type === EdgeType.Throws
        );
        
        if (throwsEdges.length > 0) {
          result += `### Thrown by\n\n`;
          for (const edge of throwsEdges) {
            const sourceNode = graph.nodes.find(n => n.id === edge.sourceId);
            if (sourceNode) {
              result += `- ${sourceNode.type} ${sourceNode.name}\n`;
            }
          }
          result += '\n';
        }
        
        // Error handlers (handled by)
        const handledByEdges = graph.edges.filter(
          edge => edge.sourceId === errorNode.id && edge.type === EdgeType.HandledBy
        );
        
        if (handledByEdges.length > 0) {
          result += `### Handled by\n\n`;
          for (const edge of handledByEdges) {
            const targetNode = graph.nodes.find(n => n.id === edge.targetId);
            if (targetNode) {
              result += `- ${targetNode.type} ${targetNode.name}\n`;
            }
          }
          result += '\n';
        }
      }
      
      return result;
    }
    
    return this.formatGraph(graph, format);
  }
}