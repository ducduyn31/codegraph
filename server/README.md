# Code Structure MCP Server

This is the MCP (Model Context Protocol) server component of the code structure analysis system. It provides tools and resources for interacting with the graph-extractor and querying code structure data.

## Features

- MCP server implementation for code structure analysis
- Integration with Neo4j graph database
- Tools for querying and extracting code structure

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v8 or higher)
- Running Neo4j instance (can be started with docker-compose from the root directory)

### Installation

```bash
# Install dependencies
pnpm install
```

### Running the Server

```bash
# Start development server
pnpm dev

# Start production server
pnpm start
```

### Building

```bash
# Build for production
pnpm build
```

## MCP Tools and Resources

The MCP server provides the following tools:

- `query_graph`: Execute a Cypher query against the code structure graph
- `extract_code_structure`: Extract code structure from a codebase

And the following resources:

- `graph://structure/overview`: Overview of the code structure graph
- `graph://structure/node/{id}`: Details of a specific node in the graph
- `graph://structure/relationships/{type}`: Relationships of a specific type in the graph

## Related Components

- `graph-extractor`: Extracts code structure information from source code and builds the graph representation
- `infra`: Infrastructure as code for deployment