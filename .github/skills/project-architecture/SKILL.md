---
name: project-architecture
description: Overview of the Heroic Adventures Assistant project architecture and conventions.
---

# Project Architecture

## Purpose

Provide a comprehensive overview of the project structure, deployment model, and conventions for developers working on this codebase.

## Project Overview

The Heroic Adventures Assistant is an MCP (Model Context Protocol) server that serves Heroic Adventures 2nd Edition rulebook content. It is deployed on Netlify as edge functions and provides read-only access to chapters, rules, skills, prompts, and agent definitions.

## Directory Structure

```
heroic-adventures-assistant/
├── assets/
│   ├── knowledge/                  # MCP-served knowledge content
│   │   ├── chapters/               # Rulebook chapter text
│   │   │   ├── info.md
│   │   │   └── entries/
│   │   ├── rules/                  # Thematic rule summaries
│   │   │   ├── info.md
│   │   │   └── entries/
│   │   ├── skills/                 # Skills and prompt templates
│   │   │   ├── info.md
│   │   │   └── entries/
│   │   └── agents/                 # Agent persona definitions
│   │       ├── info.md
│   │       └── entries/
│   ├── rules-full.md               # Complete rulebook markdown
│   ├── rules-index.md              # Rulebook heading index
│   └── images/                     # Rulebook images
├── netlify/
│   └── edge-functions/             # Netlify Edge Functions (MCP server)
│       ├── messages.ts             # JSON-RPC processor and tool dispatch
│       ├── sse.ts                  # HTTP+SSE transport handler
│       └── lib/shared.ts           # Shared types
├── static/
│   └── file-index.json             # Knowledge folder registry
├── scripts/
│   ├── test-mcp.js                 # MCP smoke test
│   └── debug-mcp.js                # Debug utility
├── .github/
│   ├── copilot-instructions.md     # Always-on Copilot workspace guidance
│   ├── skills/                     # Developer workflow skills
│   └── prompts/                    # Developer prompt templates
├── netlify.toml                    # Netlify deployment config
└── package.json                    # Node.js project config
```

## Deployment

- Hosted on **Netlify** with edge functions.
- Static files served from the repo root (publish = ".").
- Two edge function routes: `/messages` (POST) and `/sse` (GET/POST).

## MCP Protocol

- Protocol version: `2024-11-05`
- Supports both Streamable HTTP and legacy SSE transports.
- Tools are dynamically generated from `static/file-index.json` knowledge folders.
- Each knowledge folder provides `_info`, `_list`, and `_get` tools.

## Development Workflow

1. `npm install` — Install dependencies.
2. `npm start` — Run local dev server on port 8888.
3. `npm test` — Run MCP smoke tests.
4. Make changes, test locally, commit, and push to deploy.

## Key Conventions

- Knowledge content uses `.md` files only (no SKILL.md, .agent.md, .prompt.md).
- File and folder names use lowercase kebab-case.
- All content is read-only and statically served.
- The `.github/` folder contains developer tooling only (not served via MCP).
- The `assets/knowledge/` folder contains MCP-served content only.
