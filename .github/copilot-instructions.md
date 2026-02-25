# Heroic Adventures Assistant — Developer Instructions

You are assisting with development of the **Heroic Adventures Assistant**, an MCP server that serves Heroic Adventures 2nd Edition rulebook content.

## Project overview

This is a Netlify-deployed MCP (Model Context Protocol) server. It serves knowledge content (chapters, rules, skills, agents) from `assets/knowledge/` via dynamically generated tools.

## Key directories

- `assets/knowledge/` — MCP-served content organized into subfolders (chapters, rules, skills, agents). Each subfolder has an `info.md` and `entries/` directory.
- `netlify/edge-functions/` — Netlify Edge Functions implementing the MCP server (`messages.ts`, `sse.ts`).
- `static/file-index.json` — Registry of knowledge folders that drives dynamic tool generation.
- `.github/skills/` — Developer workflow skills (NOT served via MCP).
- `.github/prompts/` — Developer prompt templates (NOT served via MCP).
- `scripts/` — Test and debug utilities.

## Development workflow

1. `npm install` — Install dependencies.
2. `npm start` — Run local dev server at `http://localhost:8888`.
3. `npm test` — Run MCP smoke tests.
4. Changes to `assets/knowledge/` are automatically served; changes to edge functions require server restart.

## Response priorities

1. Understand the codebase before making changes — read relevant files first.
2. Follow existing code patterns and conventions.
3. Keep knowledge content files as plain `.md` (never use `SKILL.md`, `.agent.md`, or `.prompt.md` naming in `assets/knowledge/`).
4. Use kebab-case for all file and folder names.
5. After making changes, verify with tests when possible.

## When modifying the MCP server

- Tools are generated dynamically from `static/file-index.json` — do not hardcode tool definitions.
- Each knowledge folder gets three tools: `_info`, `_list`, and `_get`.
- The `_list` tool parses entry names from the markdown table in `info.md`.
- Test changes using `npm start` + `npm test`.

## When adding content

- Add entries to existing folders: create `.md` file in `entries/`, update `info.md` table.
- Add new knowledge folders: create folder structure, add to `file-index.json`.
- See the `add-knowledge-content` skill for detailed instructions.

## Safety and quality

- Do not commit credentials, `.env` files, or debug artifacts.
- Keep the MCP server stateless and read-only.
- Validate changes locally before pushing.

