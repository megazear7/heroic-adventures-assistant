---
name: testing
description: How to test the Heroic Adventures MCP server locally.
---

# Testing

## Purpose

Run and validate the Heroic Adventures MCP server to ensure tools work correctly.

## Prerequisites

- Node.js installed.
- Run `npm install` to install dependencies (including `netlify-cli` and `static-mcpify`).

## Running the Server Locally

```bash
npm start
```

This runs `netlify dev --no-open` and starts the local server at `http://localhost:8888`. Both the website and MCP endpoint are served from this single server.

## Running the Test Suite

```bash
npm test
```

This runs `node scripts/test-mcp.js`, which performs a smoke test against the MCP server endpoint at `http://localhost:8888/mcp`.

## Manual Testing

### Health Check

```bash
curl http://localhost:8888/mcp
```

### List Tools via Streamable HTTP

```bash
curl -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Get a Specific Chapter

```bash
curl -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_chapter_content","arguments":{"title":"chapter-01-introduction"}}}'
```

### List Entries of a Content Type

```bash
curl -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_rule","arguments":{}}}'
```

## What to Verify

1. `tools/list` returns tools for all content types (list, get, get_content for each).
2. `list_<type>` returns entry listings for each content type.
3. `get_<type>` returns entry metadata (data.json) for a specific entry.
4. `get_<type>_content` returns the full markdown content of a specific entry.
5. `list_assets` and `get_asset` work for binary files.
6. Error handling works for unknown tools.
