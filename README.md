# CodeGraph

CodeGraph is a debugging tool that uses graph 
database and LLM to simplify on-call debugging in microservice 
architectures. First, it creates a mapping of relationships between 
microservices down to the expression level. 
Secondly, it prepare a strategy to debug from trace to 
code level.
Then, it provides an MCP interface for clients like
Claude Desktop, Cline, or Roo Code to interact with a
microservice code and traces.

## 💡Overview 

There are 3 layers in this architecture:

1. **Graph-Based Service Mapping/ Code-Level Relationship Tracking**
   - Automatically scans and analyzes microservice ecosystem
   - Creates a directed graph representing service dependencies and interactions
   - Maps specific functions and lines responsible for service interactions
   - Maps both direct (API calls) and indirect (message queue) relationships
   - Tracks configuration dependencies between services
   - Maintains versioned snapshots of service relationships over time

2. **Root Cause Analysis**
   - Based on the graph structure to trace error propagation paths
   - Provides context-aware debugging suggestions
   - Generates human-readable explanations of complex failure scenarios

3. **Real-Time Monitoring and Updates**
   - Continuously monitors service health and communication patterns
   - Updates the graph database as services evolve
   - Detects and flags potential breaking changes
   - Maintains historical context for debugging similar issues

**Target:**
- Reduce MTTR for production incidents
- Understand the full impact of service changes before deployment
- Identify potential failure points in the service architecture
- Make data-driven decisions about service dependencies

## 🏗️ Architecture

CodeGraph consists of three main components:

1. **Graph Extractor**
   - Analyzes microservice codebases
   - Extracts dependency information
   - Constructs relationship graphs
   - Implements smart filtering logic

2. **Graph Database**
   - Stores service relationships
   - Maintains code-level connections
   - Enables fast traversal and querying
   - Supports real-time updates

3. **MCP Server**
   - Provide interface for LLM to query

## 🛠️ Installation

### Prerequisites

- Bun / Node 20
- pnpm (v8 or higher)
- Podman / Docker and Docker Compose

## ⚙️ Project Structure

The project consists of the following components:

- **common**: Shared types, utilities, and functions used across the project
- **graph-extractor**: Extracts code structure information from source code and builds the graph representation
- **server**: Provides an MCP server for interacting with the graph data
- **infra**: Contains infrastructure as code for deployment

## 🔌 MCP Server

The project includes an MCP (Model Context Protocol) server that provides tools and resources for code structure analysis. This allows AI assistants to directly interact with the code structure graph.

### Running the MCP Server

```
pnpm dev
```

### Available MCP Tools

- `query_graph`: Execute a Cypher query against the code structure graph
- `extract_code_structure`: Extract code structure from a codebase

### Available MCP Resources

- `graph://structure/overview`: Overview of the code structure graph
- `graph://structure/node/{id}`: Details of a specific node in the graph
- `graph://structure/relationships/{type}`: Relationships of a specific type in the graph

## 🧪 Development

### Running Tests

```
pnpm test
```

### Linting and Formatting

```
pnpm lint
pnpm format
```

### Building for Production

```
pnpm build
```

### Cleaning Up

```
pnpm clean
```
