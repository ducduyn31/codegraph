# Code Structure Examples

This directory contains examples of how to use the code structure analysis tools.

## Contents

- `query-code-structure.js`: Demonstrates how to use the graph-extractor module to query the code structure graph
- `claude-mcp-config.json`: Sample configuration for using the MCP server with Claude

## Running the Examples

### Query Code Structure

```bash
# Install dependencies
pnpm install

# Build the graph-extractor
pnpm --filter graph-extractor build

# Run the example
node examples/query-code-structure.js <path-to-codebase>
```

### Using the MCP Server with Claude

1. Build the server:
   ```bash
   pnpm --filter server build
   ```

2. Copy the `claude-mcp-config.json` file to the appropriate location for your Claude installation:
   - For Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - For Claude in VSCode: `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`

3. Start the MCP server:
   ```bash
   pnpm start
   ```

4. In Claude, you can now use the MCP tools and resources:
   ```
   Use the query_graph tool to execute a Cypher query against the code structure graph.