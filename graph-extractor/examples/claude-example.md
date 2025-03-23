# Using Graph Extractor with Claude

This example demonstrates how to use the Graph Extractor MCP server with Claude to analyze code structure.

## Setup

1. Make sure Neo4j is running locally
2. Build the Graph Extractor MCP server
3. Configure Claude to use the MCP server using the `claude-mcp-config.json` file

## Example Conversation

### User

I need to understand the structure of my codebase. Can you help me analyze it?

### Claude

I'd be happy to help you analyze your codebase structure. I can use the Graph Extractor tool to build a graph representation of your code and provide insights about its structure, dependencies, and organization.

First, I'll need to build a graph of your codebase. What's the path to your repository?

### User

The repository is at `/Users/username/Projects/my-project`

### Claude

Great! I'll build a graph representation of your codebase at `/Users/username/Projects/my-project`. This will help me understand the structure and relationships between different parts of your code.

```
<use_mcp_tool>
<server_name>graph-extractor</server_name>
<tool_name>build_graph</tool_name>
<arguments>
{
  "repositoryPath": "/Users/username/Projects/my-project",
  "repositoryName": "my-project",
  "filePatterns": ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"]
}
</arguments>
</use_mcp_tool>
```

I've successfully built a graph of your codebase. Now I can analyze its structure and provide you with insights.

Let's start by examining the overall structure of your main entry point. What's the path to your main file (like index.ts or app.js)?

### User

It's at src/index.ts

### Claude

Let me analyze the structure of your main file at `src/index.ts` and its relationships with other parts of the codebase.

```
<use_mcp_tool>
<server_name>graph-extractor</server_name>
<tool_name>query_code_structure</tool_name>
<arguments>
{
  "filePath": "/Users/username/Projects/my-project/src/index.ts",
  "depth": 2,
  "format": "markdown"
}
</arguments>
</use_mcp_tool>
```

Based on the analysis of your `src/index.ts` file, here's what I found:

[Detailed analysis of the code structure would appear here]

Now, let's look at the dependencies of this file to understand how it connects to the rest of your codebase:

```
<use_mcp_tool>
<server_name>graph-extractor</server_name>
<tool_name>trace_dependencies</tool_name>
<arguments>
{
  "sourcePath": "/Users/username/Projects/my-project/src/index.ts",
  "direction": "both",
  "maxDepth": 3,
  "format": "markdown"
}
</arguments>
</use_mcp_tool>
```

Here's how your main file connects to other parts of your codebase:

[Detailed analysis of dependencies would appear here]

Would you like me to analyze any specific part of your codebase in more detail? For example, I could look at a particular class, function, or module.

### User

Can you analyze the error handling in my codebase?

### Claude

I'll analyze the error handling patterns in your codebase to help you understand how errors are thrown, propagated, and handled throughout your project.

```
<use_mcp_tool>
<server_name>graph-extractor</server_name>
<tool_name>debug_error_paths</tool_name>
<arguments>
{
  "repositoryName": "my-project",
  "format": "markdown"
}
</arguments>
</use_mcp_tool>
```

Here's my analysis of the error handling patterns in your codebase:

[Detailed analysis of error paths would appear here]

Based on this analysis, I can see several patterns in how your codebase handles errors:

1. [Pattern description]
2. [Pattern description]
3. [Pattern description]

Would you like me to provide recommendations for improving error handling in your codebase, or would you like to analyze another aspect of your project?