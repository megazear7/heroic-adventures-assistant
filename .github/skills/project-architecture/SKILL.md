---
name: project-architecture
description: Overview of the Heroic Adventures Assistant project architecture and conventions.
---

# Project Architecture

## Purpose

Provide a comprehensive overview of the project structure, deployment model, and conventions for developers working on this codebase.

## Project Overview

The Heroic Adventures Assistant is an MCP (Model Context Protocol) server that serves Heroic Adventures 2nd Edition rulebook content. It is powered by [static-mcpify](https://github.com/megazear7/static-mcpify), deployed on Netlify as a serverless function, and provides read-only access to chapters, rules, skills, and agent definitions.

## Directory Structure

```
heroic-adventures-assistant/
├── assets/
│   ├── config.json                     # static-mcpify root config
│   ├── content/                        # MCP-served content (static-mcpify format)
│   │   ├── assets/                     # Binary assets (PDFs)
│   │   │   └── character-sheet.pdf
│   │   └── entries/
│   │       ├── chapter/                # Rulebook chapter text
│   │       │   ├── config.json
│   │       │   └── <entry>/
│   │       │       ├── data.json
│   │       │       └── tools/content.md
│   │       ├── rule/                   # Thematic rule summaries
│   │       │   ├── config.json
│   │       │   └── <entry>/...
│   │       ├── skill/                  # Skills and prompt templates
│   │       │   ├── config.json
│   │       │   └── <entry>/...
│   │       └── agent/                  # Agent persona definitions
│   │           ├── config.json
│   │           └── <entry>/...
│   ├── rules-full.md                   # Complete rulebook markdown
│   └── images/                         # Rulebook images
├── netlify/
│   └── functions/                      # Netlify serverless functions
│       └── mcp.ts                      # MCP server (uses static-mcpify/web-handler)
├── static/                             # Website files (Netlify publish directory)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── scripts/
│   └── test-mcp.js                     # MCP smoke test
├── .github/
│   ├── copilot-instructions.md         # Always-on Copilot workspace guidance
│   ├── skills/                         # Developer workflow skills
│   └── prompts/                        # Developer prompt templates
├── netlify.toml                        # Netlify deployment config
└── package.json                        # Node.js project config
```

## Deployment

- Hosted on **Netlify** with a serverless function.
- Static website served from `static/` (publish directory).
- MCP endpoint at `/mcp` handled by `netlify/functions/mcp.ts`.
- Uses `static-mcpify/web-handler` with `node_bundler = "nft"` for file tracing.

## MCP Protocol

- Uses static-mcpify which wraps the MCP SDK's `WebStandardStreamableHTTPServerTransport`.
- Tools are auto-generated from the content structure in `assets/content/entries/`.
- Each content type gets `list_<type>`, `get_<type>`, and `get_<type>_content` tools.
- Binary assets get `list_assets` and `get_asset` tools.

## Development Workflow

1. `npm install` — Install dependencies.
2. `npm start` — Run local dev server on port 8888 (website + MCP).
3. `npm test` — Run MCP smoke tests.
4. Make changes, test locally, commit, and push to deploy.

## Key Conventions

- Content follows the static-mcpify format: `data.json` + `tools/content.md` per entry.
- File and folder names use lowercase kebab-case.
- Content type names are singular (chapter, rule, skill, agent).
- All content is read-only and statically served.
- The `.github/` folder contains developer tooling only (not served via MCP).
- The `assets/content/` folder contains MCP-served content only.
