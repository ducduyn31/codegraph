# Graph Extractor

A graph-based code extractor CLI tool that builds a graph representation of codebases from GitHub repositories or local directories.

## Overview

Graph Extractor is a command-line tool that analyzes codebases and builds a graph representation of the code structure, including:

- File hierarchy (repositories, directories, files)
- Code elements (classes, methods, functions, variables)
- Relationships (imports/exports, calls, dependencies)

The graph is stored in a Neo4j database (for local development) or AWS Neptune (for production), and can be queried using Neo4j's query language (Cypher) or other graph database tools.

## Features

- **GitHub Integration**: Clone and analyze GitHub repositories
- **Code Parsing**: Parse TypeScript/JavaScript files and extract code structure
- **Graph Building**: Build a graph representation of the code
- **Flexible Analysis**: Analyze local directories or GitHub repositories
- **Configurable**: Customize file patterns, database connections, and more
- **Respects .gitignore**: Automatically excludes files specified in .gitignore files (both in the root and subdirectories)

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/graph-extractor.git
cd graph-extractor

# Install dependencies
npm install

# Build the project
npm run build

# Install globally (optional)
npm run install-global
```

## Configuration

The Graph Extractor can be configured through environment variables or command-line options:

- `NEO4J_URI`: Neo4j database URI (default: `neo4j://localhost:7687`)
- `NEO4J_USERNAME`: Neo4j username (default: `neo4j`)
- `NEO4J_PASSWORD`: Neo4j password (default: `password`)
- `NEPTUNE_URI`: AWS Neptune URI (optional)
- `AWS_REGION`: AWS region for Neptune (default: `us-east-1`)
- `DEFAULT_REPOSITORY_PATH`: Default repository path (optional)
- `DEFAULT_REPOSITORY_NAME`: Default repository name (optional)
- `DEFAULT_FILE_PATTERNS`: Default file patterns to include, comma-separated (default: `**/*.ts,**/*.js,**/*.tsx,**/*.jsx`)
- `RESPECT_GITIGNORE`: Whether to respect .gitignore files (default: `true`, set to `false` to disable)

## Usage

### Basic Usage

```bash
# Analyze a GitHub repository
graph-extractor --repo https://github.com/username/repo.git

# Analyze a local directory
graph-extractor --dir /path/to/local/directory

# Specify a repository name
graph-extractor --repo https://github.com/username/repo.git --name my-custom-name

# Specify file patterns
graph-extractor --dir /path/to/local/directory --patterns "**/*.ts,**/*.js"

# Configure Neo4j connection
graph-extractor --repo https://github.com/username/repo.git --neo4j-uri neo4j://localhost:7687 --neo4j-user neo4j --neo4j-pass mypassword

# Disable respecting .gitignore files
graph-extractor --dir /path/to/local/directory --no-gitignore
```

### Command-Line Options

```
Options:
  -r, --repo <url>           GitHub repository URL to clone and analyze
  -d, --dir <path>           Local directory to analyze (instead of cloning)
  -n, --name <name>          Repository name (defaults to extracted from URL or directory name)
  -p, --patterns <patterns>  File patterns to include (comma-separated, defaults to *.ts,*.js,*.tsx,*.jsx)
  -o, --output <format>      Output format (json, text, markdown) (default: "markdown")
  --neo4j-uri <uri>          Neo4j URI (default: "neo4j://localhost:7687")
  --neo4j-user <user>        Neo4j username (default: "neo4j")
  --neo4j-pass <password>    Neo4j password (default: "password")
  --reset                    Reset the database before building the graph (default: false)
  --no-gitignore             Disable respecting .gitignore files
  -h, --help                 Display help for command
  -V, --version              Output the version number
```

### Private Repositories

For private GitHub repositories, the tool will prompt you for authentication. You can use either:

1. HTTPS with GitHub credentials (the tool will prompt for authentication)
2. SSH with your SSH key (make sure your SSH key is set up with GitHub)

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
│   ├── types/           # Type definitions
│   ├── config.ts        # Configuration
│   └── index.ts         # Main entry point
├── build/               # Compiled output
├── package.json
└── tsconfig.json
```

### Building and Development

```bash
# Build the project
npm run build

# Run in development mode
npm run dev

# Run linting
npm run lint

# Format code
npm run format
```

Note: The development mode uses Node.js with the ts-node loader to run TypeScript files directly without pre-compilation.

## Requirements

- Node.js 16+
- Neo4j 4.4+ (for local development)
- AWS Neptune (for production, optional)
- Git (for cloning repositories)

## License

MIT