/**
 * Implementation of the list_services tool
 * 
 * This tool lists all services in the microservices architecture with their key information.
 */

/**
 * Service information interface
 */
interface ServiceInfo {
  name: string;
  description: string;
  endpoints: string[];
  dependencies: string[];
  messageEvents: string[];
}

/**
 * List services in the microservices architecture
 * 
 * @param args Tool arguments
 * @param args.includeDetails Whether to include detailed information
 * @param args.format Output format (json, text, table)
 * @returns Tool response
 */
export async function listServices(args: {
  includeDetails?: boolean;
  format?: 'json' | 'text' | 'table';
}) {
  try {
    // Get services from the sample-stacks directory
    const services: ServiceInfo[] = [
      {
        name: 'svc-accommodation',
        description: 'Manages luxury property listings, availability, pricing, and bookings',
        endpoints: [
          '/api/properties', '/api/rooms', '/api/bookings', '/api/images'
        ],
        dependencies: ['svc-order', 'svc-user'],
        messageEvents: ['BOOKING_CREATED', 'BOOKING_UPDATED', 'BOOKING_CANCELLED']
      },
      {
        name: 'svc-gateway',
        description: 'Routes client requests to appropriate microservices',
        endpoints: [
          '/api/*'
        ],
        dependencies: ['svc-accommodation', 'svc-order', 'svc-user'],
        messageEvents: []
      },
      {
        name: 'svc-order',
        description: 'Handles booking orders, payments, and order history',
        endpoints: [
          '/api/orders'
        ],
        dependencies: ['svc-accommodation', 'svc-user'],
        messageEvents: ['ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_CANCELLED', 'PAYMENT_PROCESSED']
      },
      {
        name: 'svc-user',
        description: 'Manages user accounts, profiles, and authentication',
        endpoints: [
          '/api/users'
        ],
        dependencies: [],
        messageEvents: ['USER_CREATED', 'USER_UPDATED', 'USER_DELETED']
      }
    ];
    
    const includeDetails = args.includeDetails === true;
    const format = args.format || 'table';
    
    let responseText = '';
    
    if (format === 'json') {
      if (includeDetails) {
        responseText = JSON.stringify(services, null, 2);
      } else {
        responseText = JSON.stringify(services.map(s => ({
          name: s.name,
          description: s.description
        })), null, 2);
      }
    } else if (format === 'table') {
      if (includeDetails) {
        responseText = '| Service | Description | Endpoints | Dependencies | Message Events |\n';
        responseText += '|---------|-------------|-----------|--------------|---------------|\n';
        for (const service of services) {
          responseText += `| ${service.name} | ${service.description} | ${service.endpoints.join(', ')} | ${service.dependencies.join(', ') || 'None'} | ${service.messageEvents.join(', ') || 'None'} |\n`;
        }
      } else {
        responseText = '| Service | Description |\n';
        responseText += '|---------|-------------|\n';
        for (const service of services) {
          responseText += `| ${service.name} | ${service.description} |\n`;
        }
      }
    } else {
      // Text format
      for (const service of services) {
        responseText += `Service: ${service.name}\n`;
        responseText += `Description: ${service.description}\n`;
        
        if (includeDetails) {
          responseText += `Endpoints: ${service.endpoints.join(', ')}\n`;
          responseText += `Dependencies: ${service.dependencies.join(', ') || 'None'}\n`;
          responseText += `Message Events: ${service.messageEvents.join(', ') || 'None'}\n`;
        }
        
        responseText += '\n';
      }
    }
    
    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error listing services: ${(error as Error).message}` }],
      isError: true
    };
  }
}