# Common Package

This package contains common utilities, types, and functions shared across the code structure analysis system.

## Features

- Shared TypeScript interfaces and types
- Common utility functions
- Neo4j database models and types

## Usage

This package is used internally by other packages in the monorepo. To use it in another package:

1. Add it as a dependency in your package.json:
   ```json
   "dependencies": {
     "common": "workspace:*"
   }
   ```

2. Import the types and utilities in your code:
   ```typescript
   import { NodeType, RelationshipType, Graph } from 'common';
   ```

## Development

### Building

```bash
pnpm build
```

### Testing

```bash
pnpm test
```

### Linting and Formatting

```bash
pnpm lint
pnpm format