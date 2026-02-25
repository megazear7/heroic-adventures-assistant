# Heroic Adventures Assistant

This repository is a Copilot-powered Game Master toolkit for **Heroic Adventures 2nd Edition**.
It is structured for GitHub Copilot in VS Code to answer rules questions, generate campaign content, and support live session adjudication with outputs grounded in your official rulebook.

## What this repository contains

- `assets/`: Canonical source material.
	- `HA Players Handbook 2nd Edition.docx`
	- `rules-full.md` (full conversion from DOCX)
	- `rules-index.md` (heading index)
	- `images/media/` (extracted rulebook images)
- `.github/copilot-instructions.md`: Always-on workspace guidance.
- `.github/skills/`: Reusable capabilities for rules, character workflows, encounters, monsters, and campaign prep.
- `.github/prompts/`: Slash-command style prompts for repeated workflows.
- `.github/agents/`: Role-focused custom agents for rules, GMing, and content generation.

## How to use

1. Open this workspace in VS Code.
2. Use Copilot Chat in agent mode for complex tasks.
3. Ask natural prompts for rules lookup, prep, balancing, and generation.
4. Use `/` to run prompt files and skills.

## Design goals

- Prioritize rule fidelity over invention.
- Use chapter and thematic rules skills for fast retrieval.
- Produce practical, table-ready output.
- Keep generated content consistent with Heroic Adventures terminology.

## Run locally (MCP)

- Install dependencies once: `npm install`
- Start local server from repo root: `npm start`
- Run MCP smoke test: `npm test`
- SSE stream test: `curl -N http://localhost:8888/sse`
- Tool call test:
	- `curl -X POST http://localhost:8888/messages -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tool_call","params":{"name":"list_rules","input":{"filter":"initiative"}}}'`

If you add/remove assets, skills, prompts, or agents, update `static/file-index.json` before testing.

##### `mcp.json`

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
