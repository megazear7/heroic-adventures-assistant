---
name: update-mcp-server
description: Guide for updating the Heroic Adventures MCP server edge functions.
---

# Update MCP Server

## Purpose

Guide developers through modifying the Heroic Adventures MCP server, which runs as Netlify Edge Functions serving Heroic Adventures knowledge content via the MCP protocol.

## Architecture Overview

The MCP server consists of two edge functions:

- `netlify/edge-functions/messages.ts` — Main JSON-RPC processor. Handles `initialize`, `tools/list`, and `tools/call` methods. Exports `processJsonRpc` and `handleSse`.
- `netlify/edge-functions/sse.ts` — Handles both Streamable HTTP (POST) and legacy SSE (GET) transports.
- `netlify/edge-functions/lib/shared.ts` — Shared types and utilities.

## How Tools Are Generated

Tools are generated **dynamically** based on the `knowledge_folders` array in `static/file-index.json`. For each folder name listed (e.g., `chapters`, `rules`, `skills`, `agents`), three tools are registered:

| Tool Pattern | Description |
|---|---|
| `<folder>_info` | Returns the contents of `assets/knowledge/<folder>/info.md` |
| `<folder>_list` | Lists all entries parsed from the info.md table |
| `<folder>_get` | Returns content of `assets/knowledge/<folder>/entries/<entry-name>.md` |

## Adding a New Knowledge Folder

1. Create the folder structure: `assets/knowledge/<name>/info.md` and `assets/knowledge/<name>/entries/`.
2. Write an `info.md` with a markdown table listing entries (see existing folders for format).
3. Add entry `.md` files to the `entries/` subfolder.
4. Add the folder name to `knowledge_folders` in `static/file-index.json`.
5. Run `npm test` to verify the new tools appear and work.

## Modifying Existing Tools

- Tool definitions are built in `buildToolDefinitions()` in `messages.ts`.
- Tool dispatch is handled in `handleToolCall()` in `messages.ts`.
- Entry listing parses the `info.md` markdown table in `listEntries()`.

## Key Patterns

- All content is fetched via HTTP from the deployed site (or localhost during dev).
- Paths are sanitized to prevent directory traversal.
- The `welcome` tool is always available and serves static text.
- JSON-RPC 2.0 protocol with MCP version `2024-11-05`.
