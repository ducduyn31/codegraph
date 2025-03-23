/**
 * Implementation of the visualize_service_interactions tool
 * 
 * This tool visualizes API calls and message events within a code context.
 */

/**
 * Context for service interaction visualization
 */
interface ServiceContext {
  service: string;
  file: string;
  function?: string;
  line?: number;
}

/**
 * Visualize service interactions
 * 
 * @param args Tool arguments
 * @param args.context Service context
 * @param args.depth How many levels of service interactions to include
 * @param args.includeMessageQueue Whether to include message queue events
 * @param args.includeRestCalls Whether to include REST API calls
 * @param args.format Visualization format (mermaid, dot, svg)
 * @returns Tool response
 */
export async function visualizeServiceInteractions(args: {
  context: ServiceContext;
  depth?: number;
  includeMessageQueue?: boolean;
  includeRestCalls?: boolean;
  format?: 'mermaid' | 'dot' | 'svg';
}) {
  try {
    if (!args.context || typeof args.context !== 'object') {
      throw new Error('Context is required');
    }
    
    const { service, file, function: funcName, line } = args.context;
    
    if (!service || !file) {
      throw new Error('Service and file are required in context');
    }
    
    const depth = typeof args.depth === 'number' ? args.depth : 2;
    const format = args.format || 'mermaid';
    
    // This would normally analyze the code to find service interactions
    // For now, we'll return a mock response based on the sample-stacks structure
    let diagram = '';
    
    if (format === 'dot') {
      diagram = 'digraph G {\n';
      diagram += '  rankdir=TD;\n';
      
      if (service === 'svc-accommodation' && file.includes('bookingService')) {
        diagram += '  "svc-accommodation/bookingService" -> "svc-order/orders" [label="createBooking"];\n';
        diagram += '  "svc-accommodation/bookingService" -> "RabbitMQ" [label="publishEvent"];\n';
        diagram += '  "RabbitMQ" -> "svc-order" [label="BOOKING_CREATED"];\n';
        diagram += '  "RabbitMQ" -> "svc-user" [label="BOOKING_CREATED"];\n';
        
        if (depth > 1) {
          diagram += '  "svc-order" -> "Database" [label="createOrder"];\n';
          diagram += '  "svc-order" -> "RabbitMQ" [label="publishEvent"];\n';
          diagram += '  "RabbitMQ" -> "svc-gateway" [label="ORDER_CREATED"];\n';
        }
      }
      
      diagram += '}';
    } else {
      // Default to mermaid
      diagram = 'graph TD\n';
      
      if (service === 'svc-accommodation' && file.includes('bookingService')) {
        diagram += '  A[svc-accommodation/bookingService] --> |createBooking| B[svc-order/orders]\n';
        diagram += '  A --> |publishEvent| C{RabbitMQ}\n';
        diagram += '  C --> |BOOKING_CREATED| D[svc-order]\n';
        diagram += '  C --> |BOOKING_CREATED| E[svc-user]\n';
        
        if (depth > 1) {
          diagram += '  D --> |createOrder| F[Database]\n';
          diagram += '  D --> |publishEvent| C\n';
          diagram += '  C --> |ORDER_CREATED| G[svc-gateway]\n';
        }
      } else if (service === 'svc-order' && file.includes('orders')) {
        diagram += '  A[svc-order/orders] --> |validateUser| B[svc-user/users]\n';
        diagram += '  A --> |checkInventory| C[svc-accommodation/rooms]\n';
        diagram += '  A --> |publishEvent| D{RabbitMQ}\n';
        diagram += '  D --> |ORDER_CREATED| E[svc-accommodation]\n';
        diagram += '  D --> |ORDER_CREATED| F[svc-user]\n';
      }
    }
    
    return {
      content: [{ 
        type: 'text', 
        text: `Service Interactions for ${service}/${file}${funcName ? `/${funcName}` : ''}${line ? `:${line}` : ''}:\n\n${diagram}` 
      }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error visualizing service interactions: ${(error as Error).message}` }],
      isError: true
    };
  }
}