/**
 * Implementation of the list_service_files tool
 * 
 * This tool lists files and folders within a specific service.
 */

/**
 * List files and folders within a specific service
 * 
 * @param args Tool arguments
 * @param args.service Service name
 * @param args.path Optional subfolder path within the service
 * @param args.recursive Whether to list files recursively
 * @param args.fileTypes Filter by file extensions
 * @returns Tool response
 */
export async function listServiceFiles(args: {
  service: string;
  path?: string;
  recursive?: boolean;
  fileTypes?: string[];
}) {
  try {
    if (!args.service) {
      throw new Error('Service name is required');
    }
    
    const servicePath = `sample-stacks/${args.service}`;
    const subPath = args.path === '/' ? '' : args.path || '';
    const fullPath = `${servicePath}${subPath}`;
    
    // This would normally use fs.readdir to get the actual files
    // For now, we'll return a mock response based on the sample-stacks structure
    let files: string[] = [];
    
    if (args.service === 'svc-accommodation') {
      if (subPath === '' || subPath === '/') {
        files = [
          'Dockerfile',
          'package.json',
          'pnpm-lock.yaml',
          'tsconfig.json',
          'src/'
        ];
      } else if (subPath === '/src') {
        files = [
          'index.ts',
          'models/',
          'routes/',
          'services/',
          'types/'
        ];
      } else if (subPath === '/src/models') {
        files = [
          'Availability.ts',
          'Booking.ts',
          'Image.ts',
          'index.ts',
          'Policy.ts',
          'Property.ts',
          'Review.ts',
          'Room.ts'
        ];
      }
    } else if (args.service === 'svc-order') {
      if (subPath === '' || subPath === '/') {
        files = [
          'Dockerfile',
          'package.json',
          'pnpm-lock.yaml',
          'tsconfig.json',
          'src/'
        ];
      } else if (subPath === '/src') {
        files = [
          'index.ts',
          'models/',
          'routes/',
          'services/',
          'types/'
        ];
      }
    }
    
    // Filter by file types if specified
    if (Array.isArray(args.fileTypes) && args.fileTypes.length > 0) {
      files = files.filter(file => {
        const ext = file.split('.').pop();
        return ext && args.fileTypes?.includes(ext);
      });
    }
    
    return {
      content: [{ type: 'text', text: `Files in ${fullPath}:\n\n${files.join('\n')}` }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error listing files: ${(error as Error).message}` }],
      isError: true
    };
  }
}