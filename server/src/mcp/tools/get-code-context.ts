/**
 * Implementation of the get_code_context tool
 * 
 * This tool retrieves code context for a specific location.
 */

/**
 * Get code context for a specific location
 * 
 * @param args Tool arguments
 * @param args.service Service name
 * @param args.file File path within the service
 * @param args.line Line number (optional)
 * @param args.function Function or method name (optional)
 * @param args.contextLines Number of context lines before and after
 * @param args.includeVariables Whether to include variable definitions and usages
 * @param args.includeDependencies Whether to include imported/required dependencies
 * @param args.includeCallers Whether to include functions that call this code
 * @returns Tool response
 */
export async function getCodeContext(args: {
  service: string;
  file: string;
  line?: number;
  function?: string;
  contextLines?: number;
  includeVariables?: boolean;
  includeDependencies?: boolean;
  includeCallers?: boolean;
}) {
  try {
    if (!args.service) {
      throw new Error('Service name is required');
    }
    
    if (!args.file) {
      throw new Error('File path is required');
    }
    
    const service = args.service;
    const file = args.file;
    const includeDependencies = args.includeDependencies !== false;
    const includeVariables = args.includeVariables !== false;
    const includeCallers = args.includeCallers === true;
    
    // This would normally read the file and analyze the code
    // For now, we'll return a mock response
    let codeContext = '';
    
    if (service === 'svc-accommodation' && file === 'src/services/bookingService.ts') {
      codeContext = `// File: ${service}/${file}\n\n`;
      
      if (includeDependencies) {
        codeContext += "// Dependencies:\n";
        codeContext += "import { Booking } from '../models/Booking';\n";
        codeContext += "import { Room } from '../models/Room';\n";
        codeContext += "import { messageQueue } from './messageQueue';\n";
        codeContext += "import axios from 'axios';\n\n";
      }
      
      codeContext += "// Code context:\n";
      codeContext += "async function createBooking(userId: string, roomId: string, checkInDate: Date, checkOutDate: Date): Promise<Booking> {\n";
      codeContext += "  // Validate room availability\n";
      codeContext += "  const room = await Room.findByPk(roomId);\n";
      codeContext += "  if (!room) {\n";
      codeContext += "    throw new Error('Room not found');\n";
      codeContext += "  }\n\n";
      codeContext += "  // Check if room is available for the requested dates\n";
      codeContext += "  const isAvailable = await room.checkAvailability(checkInDate, checkOutDate);\n";
      codeContext += "  if (!isAvailable) {\n";
      codeContext += "    throw new Error('Room is not available for the requested dates');\n";
      codeContext += "  }\n\n";
      codeContext += "  // Create booking\n";
      codeContext += "  const booking = await Booking.create({\n";
      codeContext += "    userId,\n";
      codeContext += "    roomId,\n";
      codeContext += "    checkInDate,\n";
      codeContext += "    checkOutDate,\n";
      codeContext += "    status: 'PENDING'\n";
      codeContext += "  });\n\n";
      codeContext += "  // Create order in order service\n";
      codeContext += "  try {\n";
      codeContext += "    const orderResponse = await axios.post('http://svc-order:3001/api/orders', {\n";
      codeContext += "      userId,\n";
      codeContext += "      items: [\n";
      codeContext += "        {\n";
      codeContext += "          type: 'ACCOMMODATION',\n";
      codeContext += "          referenceId: booking.id,\n";
      codeContext += "          name: room.name,\n";
      codeContext += "          description: `Booking from ${checkInDate.toISOString()} to ${checkOutDate.toISOString()}`,\n";
      codeContext += "          quantity: 1,\n";
      codeContext += "          price: room.basePrice\n";
      codeContext += "        }\n";
      codeContext += "      ]\n";
      codeContext += "    });\n\n";
      codeContext += "    // Update booking with order ID\n";
      codeContext += "    await booking.update({ orderId: orderResponse.data.id });\n\n";
      codeContext += "    // Publish booking created event\n";
      codeContext += "    await messageQueue.publish('BOOKING_CREATED', {\n";
      codeContext += "      bookingId: booking.id,\n";
      codeContext += "      userId,\n";
      codeContext += "      roomId,\n";
      codeContext += "      checkInDate,\n";
      codeContext += "      checkOutDate,\n";
      codeContext += "      orderId: orderResponse.data.id\n";
      codeContext += "    });\n\n";
      codeContext += "    return booking;\n";
      codeContext += "  } catch (error) {\n";
      codeContext += "    // If order creation fails, cancel the booking\n";
      codeContext += "    await booking.update({ status: 'CANCELLED' });\n";
      codeContext += "    throw new Error(`Failed to create order: ${error.message}`);\n";
      codeContext += "  }\n";
      codeContext += "}\n";
      
      if (includeVariables && includeCallers) {
        codeContext += "\n// Callers:\n";
        codeContext += "// - POST /api/bookings (routes/bookings.ts)\n";
        codeContext += "// - processBookingRequest (services/bookingService.ts)\n";
      }
    }
    
    return {
      content: [{ type: 'text', text: codeContext }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error getting code context: ${(error as Error).message}` }],
      isError: true
    };
  }
}