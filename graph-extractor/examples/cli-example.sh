#!/bin/bash
# Example script demonstrating how to use the graph-extractor CLI tool

# Make sure the script is executable
# chmod +x cli-example.sh

# Set up environment variables (optional)
# export NEO4J_URI=neo4j://localhost:7687
# export NEO4J_USERNAME=neo4j
# export NEO4J_PASSWORD=password

# Example 1: Analyze a GitHub repository
echo "Example 1: Analyzing a GitHub repository"
graph-extractor --repo https://github.com/expressjs/express.git --name express-framework

# Example 2: Analyze a local directory
echo "Example 2: Analyzing a local directory"
graph-extractor --dir ../sample-stacks/svc-accommodation --name accommodation-service

# Example 3: Analyze with custom file patterns
echo "Example 3: Analyzing with custom file patterns"
graph-extractor --dir ../sample-stacks/svc-user --name user-service --patterns "**/*.ts,**/*.js"

# Example 4: Analyze with custom Neo4j connection
echo "Example 4: Analyzing with custom Neo4j connection"
graph-extractor --repo https://github.com/nestjs/nest.git --name nest-framework \
  --neo4j-uri neo4j://localhost:7687 --neo4j-user neo4j --neo4j-pass password

# Example 5: Reset database before analysis
echo "Example 5: Reset database before analysis"
graph-extractor --dir ../sample-stacks --name sample-stacks --reset

# Note: For private repositories, the tool will prompt for authentication
# You can use either HTTPS with GitHub credentials or SSH with your SSH key