/**
 * Implementation of the trace_error_path tool
 * 
 * This tool traces the execution path of an error across services.
 */

/**
 * Trace the execution path of an error across services
 * 
 * @param args Tool arguments
 * @param args.errorTrace Error stack trace
 * @param args.startService Service where the error originated (optional)
 * @param args.includeMessageQueue Whether to include message queue events in the trace
 * @param args.format Output format (json, text, mermaid)
 * @returns Tool response
 */
export async function traceErrorPath(args: {
  errorTrace: string;
  startService?: string;
  includeMessageQueue?: boolean;
  format?: 'json' | 'text' | 'mermaid';
}) {
  try {
    if (!args.errorTrace) {
      throw new Error('Error trace is required');
    }
    
    const errorTrace = args.errorTrace;
    const includeMessageQueue = args.includeMessageQueue !== false;
    const format = args.format || 'mermaid';
    
    // This would normally parse the error trace and analyze the code
    // For now, we'll return a mock response based on the error trace
    let traceResult = '';
    
    // Simple parsing of the error trace to extract service and file information
    const errorLines = errorTrace.split('\n');
    const errorMessage = errorLines[0];
    const stackLines = errorLines.slice(1).filter(line => line.includes('at '));
    
    if (format === 'mermaid') {
      traceResult = 'graph TD\n';
      traceResult += `  A[Error: ${errorMessage}] --> B[${stackLines[0]?.trim() || 'Unknown'}]\n`;
      
      for (let i = 1; i < Math.min(stackLines.length, 5); i++) {
        traceResult += `  B --> C${i}[${stackLines[i]?.trim() || 'Unknown'}]\n`;
      }
      
      if (includeMessageQueue && errorTrace.includes('svc-order')) {
        traceResult += '  B --> D{RabbitMQ}\n';
        traceResult += '  D --> E[svc-accommodation]\n';
      }
    } else if (format === 'json') {
      const traceData = {
        error: errorMessage,
        stack: stackLines.map(line => line.trim()),
        services: ['svc-order'],
        messageQueueEvents: includeMessageQueue ? ['ORDER_CREATED'] : []
      };
      
      traceResult = JSON.stringify(traceData, null, 2);
    } else {
      // Text format
      traceResult = `Error: ${errorMessage}\n\nStack Trace:\n`;
      for (const line of stackLines) {
        traceResult += `${line.trim()}\n`;
      }
      
      if (includeMessageQueue && errorTrace.includes('svc-order')) {
        traceResult += '\nMessage Queue Events:\n';
        traceResult += '- ORDER_CREATED (svc-order -> svc-accommodation)\n';
      }
    }
    
    return {
      content: [{ type: 'text', text: traceResult }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error tracing error path: ${(error as Error).message}` }],
      isError: true
    };
  }
}