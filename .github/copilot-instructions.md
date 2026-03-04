# Heroic Adventures Assistant — Developer Instructions

You are assisting with development of the **Heroic Adventures Assistant**, an MCP server that serves Heroic Adventures 2nd Edition rulebook content.

## Project overview

This is a Netlify-deployed MCP server powered by [static-mcpify](https://github.com/megazear7/static-mcpify). It serves knowledge content (chapters, rules, skills, agents) from `assets/content/` via auto-generated tools.

## Key directories

- `assets/content/` — MCP-served content in static-mcpify format. Contains `entries/` (chapter, rule, skill, agent) and `assets/` (binary files).
- `assets/config.json` — Root config for static-mcpify (`{ "source": null }`).
- `netlify/functions/` — Netlify serverless function implementing the MCP server (`mcp.ts`).
- `static/` — Static website files (HTML, CSS, JS) served as the Netlify publish directory.
- `.github/skills/` — Developer workflow skills (NOT served via MCP).
- `.github/prompts/` — Developer prompt templates (NOT served via MCP).
- `scripts/` — Test and debug utilities.

## Development workflow

1. `npm install` — Install dependencies.
2. `npm start` — Run local dev server at `http://localhost:8888` (website + MCP).
3. `npm test` — Run MCP smoke tests.
4. Changes to `assets/content/` are automatically served; changes to the Netlify function require server restart.

## Response priorities

1. Understand the codebase before making changes — read relevant files first.
2. Follow existing code patterns and conventions.
3. Use kebab-case for all file and folder names.
4. After making changes, verify with tests when possible.

## When modifying the MCP server

- The MCP server uses `static-mcpify/web-handler` — the `handleMcpRequest` function.
- Tools are auto-generated from the content structure in `assets/content/entries/`.
- Each content type folder gets tools: `list_<type>`, `get_<type>`, `get_<type>_<tool>`.
- The Netlify function is at `netlify/functions/mcp.ts`.
- Test changes using `npm start` + `npm test`.

## Content structure (static-mcpify format)

```
assets/
├── config.json
└── content/
    ├── assets/           # Binary assets (PDFs, images)
    └── entries/
        ├── <type>/       # Content type (chapter, rule, skill, agent)
        │   ├── config.json   # { "contentType": "<type>", "tools": [...] }
        │   └── <entry>/
        │       ├── data.json     # Entry metadata
        │       └── tools/
        │           └── content.md  # Entry content (markdown)
```

## When adding content

- Add entries to existing types: create entry folder with `data.json` and `tools/content.md`.
- Add new content types: create type folder with `config.json`, then add entries.
- See the `add-knowledge-content` skill for detailed instructions.

## Safety and quality

- Do not commit credentials, `.env` files, or debug artifacts.
- Keep the MCP server stateless and read-only.
- Validate changes locally before pushing.

