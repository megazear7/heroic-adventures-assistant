# Heroic Adventures Assistant

An MCP (Model Context Protocol) server that serves **Heroic Adventures 2nd Edition** rulebook content via auto-generated tools. Powered by [static-mcpify](https://github.com/megazear7/static-mcpify) and deployed on Netlify.

To connect to this MCP server, use the `https://mcp.heroicadventures.app/mcp` url. See the `mcp.json` example below.

```json
{
	"servers": {
		"heroic-adventures": {
			"type": "http",
			"url": "https://mcp.heroicadventures.app/mcp"
		}
	}
}
```

## Project Structure

```
assets/content/             — MCP-served content (static-mcpify format)
  entries/
    chapter/                — Rulebook chapter text
    rule/                   — Thematic rule summaries
    skill/                  — Skills and prompt templates
    agent/                  — Agent persona definitions
  assets/                   — Binary assets (PDFs)
netlify/functions/mcp.ts    — Netlify serverless function (MCP server)
static/                     — Website files (HTML, CSS, JS)
scripts/                    — Test and debug utilities
.github/skills/             — Developer workflow skills (NOT served via MCP)
.github/prompts/            — Developer prompt templates (NOT served via MCP)
```

## Quick Start

```bash
npm install        # Install dependencies
npm start          # Run website + MCP server locally
npm test           # Run MCP smoke tests
```

`npm start` runs `netlify dev` which serves both the static website and the MCP function:

| Endpoint | URL | Purpose |
|---|---|---|
| Website | http://localhost:8888 | Landing page |
| MCP Server | http://localhost:8888/mcp | MCP endpoint for AI clients |

## How It Works

The server uses [static-mcpify](https://github.com/megazear7/static-mcpify) to auto-generate MCP tools from the content structure in `assets/content/`. Each content type (chapter, rule, skill, agent) gets these tools:

| Tool | Description |
|---|---|
| `list_<type>` | List all entries of a content type |
| `get_<type>` | Get entry metadata (data.json) by title slug |
| `get_<type>_content` | Get entry markdown content by title slug |

Additional tools: `list_assets`, `get_asset` for binary files.

## Adding Content

1. Create an entry folder: `assets/content/entries/<type>/<entry-name>/`
2. Add `data.json` with entry metadata (title, description, slug).
3. Add `tools/content.md` with the entry's markdown content.
4. To add a new content type, create a folder with a `config.json`.

See the `add-knowledge-content` skill for detailed instructions.

## MCP Client Configuration

```json
{
  "servers": {
    "heroic-adventures-assistant": {
      "type": "http",
      "url": "http://localhost:8888/mcp"
    }
  }
}
```

## Testing

```bash
# Health check
curl http://localhost:8888/mcp

# List available tools
curl -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Get a specific chapter
curl -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_chapter_content","arguments":{"title":"chapter-01-introduction"}}}'
```

## Deployment

Push to the `main` branch to deploy to Netlify. The site serves static files from `static/` and the MCP function from `netlify/functions/`.
