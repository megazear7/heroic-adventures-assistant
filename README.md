# Heroic Adventures Assistant

An MCP (Model Context Protocol) server that serves **Heroic Adventures 2nd Edition** rulebook content via dynamically generated tools. Deployed on Netlify as edge functions.

To connect to this MCP server, use the `https://mcp.heroicadventures.app/sse` url. See the `mcp.json` example below.

```json
{
	"servers": {
		"heroic-adventures": {
			"type": "sse",
			"url": "https://mcp.heroicadventures.app/sse"
		}
	}
}
```

## Project Structure

```
assets/knowledge/       — MCP-served knowledge content
  chapters/             — Rulebook chapter text
  rules/                — Thematic rule summaries
  skills/               — Skills and prompt templates
  agents/               — Agent persona definitions
netlify/edge-functions/ — Netlify Edge Functions (MCP server)
static/file-index.json  — Knowledge folder registry
scripts/                — Test and debug utilities
.github/skills/         — Developer workflow skills (NOT served via MCP)
.github/prompts/        — Developer prompt templates (NOT served via MCP)
```

## Quick Start

```bash
npm install        # Install dependencies
npm start          # Run website + MCP server in parallel
npm test           # Run MCP smoke tests
```

`npm start` runs two servers side by side:

| Server | URL | Purpose |
|---|---|---|
| Website | http://localhost:3000 | Landing page (`index.html`) |
| MCP Server | http://localhost:8888/sse | MCP endpoint for AI clients |

Open http://localhost:3000 in your browser to view the website. The MCP server at port 8888 is used by AI clients (Claude, Copilot, etc.).

## How It Works

The server dynamically generates MCP tools based on the folders listed in `static/file-index.json`. Each knowledge folder (e.g., `chapters`, `rules`) automatically gets three tools:

| Tool | Description |
|---|---|
| `<folder>_info` | Returns the folder's `info.md` overview |
| `<folder>_list` | Lists entries parsed from the `info.md` table |
| `<folder>_get` | Returns a specific entry by name |

## Adding Content

1. Add a `.md` file to `assets/knowledge/<folder>/entries/`.
2. Update `assets/knowledge/<folder>/info.md` with a table row for the new entry.
3. To add a new folder, also add it to `knowledge_folders` in `static/file-index.json`.

See the `add-knowledge-content` skill for detailed instructions.

## MCP Client Configuration

```json
{
  "servers": {
    "heroic-adventures-assistant": {
      "type": "http",
      "url": "http://localhost:8888/sse"
    }
  }
}
```

## Testing

```bash
# SSE stream test
curl -N http://localhost:8888/sse

# List available tools
curl -X POST http://localhost:8888/sse \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Get a specific entry
curl -X POST http://localhost:8888/sse \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"chapters_get","arguments":{"entry-name":"chapter-01-introduction"}}}'
```

## Deployment

Push to the `main` branch to deploy to Netlify. The site serves static files and edge functions automatically.
