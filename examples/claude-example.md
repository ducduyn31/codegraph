# Using Code Structure MCP with Claude

This example demonstrates how to use the Code Structure MCP server with Claude.

## Setup

1. Make sure the MCP server is running:
   ```bash
   pnpm start
   ```

2. Configure Claude to use the MCP server by copying the `claude-mcp-config.json` file to the appropriate location.

## Example Prompts

Here are some example prompts you can use with Claude once the MCP server is connected:

### Query the Code Structure Graph

```
Use the query_graph tool to find all TypeScript files in the codebase.
```

Claude will execute:

```
<use_mcp_tool>
<server_name>code-structure</server_name>
<tool_name>query_graph</tool_name>
<arguments>
{
  "query": "MATCH (f:File) WHERE f.path ENDS WITH '.ts' RETURN f.path AS path ORDER BY path"
}
</arguments>
</use_mcp_tool>
```

### Extract Code Structure from a Codebase

```
Use the extract_code_structure tool to analyze the server directory.
```

Claude will execute:

```
<use_mcp_tool>
<server_name>code-structure</server_name>
<tool_name>extract_code_structure</tool_name>
<arguments>
{
  "path": "/Users/danielng/Projects/code-structure/server",
  "language": "typescript"
}
</arguments>
</use_mcp_tool>
```

### Access Code Structure Overview

```
Access the code structure overview resource to get a high-level view of the codebase.
```

Claude will execute:

```
<access_mcp_resource>
<server_name>code-structure</server_name>
<uri>graph://structure/overview</uri>
</access_mcp_resource>
```

### Get Details of a Specific Node

```
Access the details of node 123 in the code structure graph.
```

Claude will execute:

```
<access_mcp_resource>
<server_name>code-structure</server_name>
<uri>graph://structure/node/123</uri>
</access_mcp_resource>
```

### Get Relationships of a Specific Type

```
Access the IMPORTS relationships in the code structure graph.
```

Claude will execute:

```
<access_mcp_resource>
<server_name>code-structure</server_name>
<uri>graph://structure/relationships/IMPORTS</uri>
</access_mcp_resource>
```

## Complex Queries

You can also ask Claude to perform more complex analyses using the MCP tools:

```
Analyze the codebase to find the most connected files. First, extract the code structure from the server directory, then query the graph to find files with the most relationships.
```

Claude will break this down into multiple steps:

1. Extract the code structure
2. Query the graph to find files with the most relationships
3. Analyze and present the results