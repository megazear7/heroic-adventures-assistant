---
name: update-mcp-server
description: Guide for updating the Heroic Adventures MCP server Netlify function.
---

# Update MCP Server

## Purpose

Guide developers through modifying the Heroic Adventures MCP server, which runs as a Netlify serverless function powered by [static-mcpify](https://github.com/megazear7/static-mcpify).

## Architecture Overview

The MCP server is a single Netlify function:

- `netlify/functions/mcp.ts` — Uses `handleMcpRequest` from `static-mcpify/web-handler` to serve MCP requests. Points to `assets/content/` for content.

## How Tools Are Generated

Tools are generated **automatically** by static-mcpify based on the content directory structure at `assets/content/entries/`. For each content type folder (e.g., `chapter`, `rule`, `skill`, `agent`), three tools are registered:

| Tool Pattern | Description |
|---|---|
| `list_<type>` | List all entries of a content type, with optional filter |
| `get_<type>` | Get entry metadata (data.json) by title slug |
| `get_<type>_content` | Get entry markdown content (tools/content.md) by title slug |

Additional tools for binary assets:

| Tool | Description |
|---|---|
| `list_assets` | List all files in `content/assets/` |
| `get_asset` | Get a specific asset by filename |

## Adding a New Content Type

1. Create the type folder: `assets/content/entries/<new-type>/`
2. Create `config.json`:
   ```json
   {
     "contentType": "<new-type>",
     "tools": [
       { "name": "content", "fields": ["content"] }
     ]
   }
   ```
3. Add entry folders, each with `data.json` and `tools/content.md`.
4. Run `npm test` to verify the new tools appear and work.

## Modifying the Netlify Function

- The function is at `netlify/functions/mcp.ts`.
- It uses `handleMcpRequest(contentDir, req)` from `static-mcpify/web-handler`.
- The `config` export sets the route path (`/mcp`) and `includedFiles` for bundling.
- Changes to the function require server restart.

## Key Patterns

- All content is read from the filesystem by static-mcpify.
- No manual tool definitions or dispatch logic needed.
- The `includedFiles` config ensures content files are bundled for deployment.
- Content changes are picked up automatically; function changes require restart.
