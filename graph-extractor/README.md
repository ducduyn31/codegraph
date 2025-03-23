# Graph Extractor

A graph-based code extractor for RAG systems that builds a graph representation of codebases and provides tools for querying code structure, tracing dependencies, and debugging error paths.

## Overview

Graph Extractor is an MCP (Model Context Protocol) server that analyzes codebases and builds a graph representation of the code structure, including:

- File hierarchy (repositories, directories, files)
- Code elements (classes, methods, functions, variables)
- Relationships (imports/exports, calls, dependencies)

The graph is stored in a Neo4j database (for local development) or AWS Neptune (for production), and can be queried through MCP tools.

## Features

- **Code Parsing**: Parse TypeScript/JavaScript files and extract code structure
- **Graph Building**: Build a graph representation of the code
- **Code Structure Querying**: Query the code structure by file, function, or class
- **Dependency Tracing**: Trace dependencies across repositories
- **Error Path Analysis**: Identify potential error propagation paths

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/graph-extractor.git
cd graph-extractor

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

The Graph Extractor can be configured through environment variables:

- `NEO4J_URI`: Neo4j database URI (default: `neo4j://localhost:7687`)
- `NEO4J_USERNAME`: Neo4j username (default: `neo4j`)
- `NEO4J_PASSWORD`: Neo4j password (default: `password`)
- `NEPTUNE_URI`: AWS Neptune URI (optional)
- `AWS_REGION`: AWS region for Neptune (default: `us-east-1`)
- `DEFAULT_REPOSITORY_PATH`: Default repository path (optional)
- `DEFAULT_REPOSITORY_NAME`: Default repository name (optional)
- `DEFAULT_FILE_PATTERNS`: Default file patterns to include, comma-separated (default: `**/*.ts,**/*.js,**/*.tsx,**/*.jsx`)

## Usage

### Running the MCP Server

```bash
# Start the MCP server
npm start
```

### MCP Tools

The Graph Extractor exposes the following MCP tools:

#### 1. Query Code Structure

Retrieve code structure information for a file, function, or class.

```json
{
  "filePath": "path/to/file.ts",
  "functionName": "myFunction",
  "className": "MyClass",
  "depth": 2,
  "format": "markdown"
}
```

#### 2. Trace Dependencies

Follow dependency chains across repositories.

```json
{
  "sourcePath": "path/to/file.ts",
  "direction": "both",
  "dependencyTypes": ["IMPORTS", "DEPENDS_ON"],
  "maxDepth": 3,
  "format": "markdown"
}
```

#### 3. Debug Error Paths

Identify potential error propagation paths.

```json
{
  "errorMessage": "Error message",
  "functionName": "myFunction",
  "repositoryName": "myRepo",
  "format": "markdown"
}
```

#### 4. Build Graph

Build a graph representation of the code.

```json
{
  "repositoryPath": "path/to/repo",
  "repositoryName": "myRepo",
  "filePatterns": ["**/*.ts", "**/*.js"]
}
```

### MCP Resources

The Graph Extractor also exposes the following MCP resources:

- `code-graph://structure`: Overall code graph structure
- `code-graph://{repository}/structure`: Repository code structure
- `code-graph://{repository}/file/{filePath}`: File code structure

## Development

### Project Structure

```
graph-extractor/
├── src/
│   ├── parsers/         # Code parsers
│   ├── extractors/      # Relationship extractors
│   ├── graph/           # Graph building
│   ├── storage/         # Graph storage (Neo4j, Neptune)
│   ├── query/           # Query engine
│   ├── tools/           # MCP tools
│   ├── types/           # Type definitions
│   ├── config.ts        # Configuration
│   └── index.ts         # Main entry point
├── build/               # Compiled output
├── package.json
└── tsconfig.json
```

### Building

```bash
# Build the project
npm run build

# Run linting
npm run lint

# Format code
npm run format
```

## Requirements

- Node.js 16+
- Neo4j 4.4+ (for local development)
- AWS Neptune (for production, optional)

## License

MIT