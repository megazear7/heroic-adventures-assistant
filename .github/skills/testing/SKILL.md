---
name: testing
description: How to test the Heroic Adventures MCP server locally.
---

# Testing

## Purpose

Run and validate the Heroic Adventures MCP server to ensure tools work correctly.

## Prerequisites

- Node.js installed.
- Run `npm install` to install dependencies (including `netlify-cli`).

## Running the Server Locally

```bash
npm start
```

This runs `netlify dev --no-open` and starts the local server at `http://localhost:8888`.

## Running the Test Suite

```bash
npm test
```

This runs `node scripts/test-mcp.js`, which performs a smoke test against the MCP server endpoints.

## Manual Testing

### SSE Stream Test

```bash
curl -N http://localhost:8888/sse
```

### Tool Call via Streamable HTTP

```bash
curl -X POST http://localhost:8888/sse \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Get a Specific Entry

```bash
curl -X POST http://localhost:8888/sse \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"chapters_get","arguments":{"entry-name":"chapter-01-introduction"}}}'
```

### List Entries in a Folder

```bash
curl -X POST http://localhost:8888/sse \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"rules_list","arguments":{}}}'
```

## Debug Script

For verbose debugging, use:

```bash
node scripts/debug-mcp.js
```

## What to Verify

1. `tools/list` returns tools for all knowledge folders (info, list, get for each).
2. `<folder>_info` returns the info.md content for each folder.
3. `<folder>_list` returns entry names for each folder.
4. `<folder>_get` returns the full content of a specific entry.
5. The `welcome` tool returns the welcome message.
6. Error handling works for missing entries and unknown tools.
