---
name: onboarding
description: Bootstrap this Heroic Adventures workspace for reliable Copilot-assisted GM workflows.
---

# Onboarding

## Purpose

Validate that the workspace is configured so rule-grounded Copilot workflows are reliable and repeatable.

## When to Use

- First-time setup of this repository.
- After syncing new rule content or prompts.
- When responses appear to ignore project-specific instruction files.

## Required Inputs

- Workspace root path.
- Expected source-of-truth files.
- Any custom workflow expectations from the GM/user.

## Workflow

1. Verify core content assets exist in `assets/content/entries/` (chapter, rule, skill, agent).
2. Verify `assets/config.json` exists with `{ "source": null }`.
3. Verify `.github/copilot-instructions.md` is present and aligned with current workflow.
4. Confirm skills directory includes chapter and rule skills plus task skills.
5. Confirm prompt files are present for expected task types.
6. Verify the Netlify function exists at `netlify/functions/mcp.ts`.
7. Highlight missing or stale artifacts and propose minimal fixes.
8. Provide a quick-start sequence for first practical use.

## Quality Checks

- Content files are present in `assets/content/entries/` with proper `data.json` + `tools/content.md` structure.
- Instructions file exists and references source-of-truth order.
- Skill files and prompt files are discoverable.
- User gets clear first prompts for common workflows.

## Output Template

Return:
- Status summary (ready / partially ready / blocked).
- Passed checks and failed checks.
- Exact remediation actions for failures.
- 3-5 starter prompts for character creation, encounter design, and live adjudication.

## Missing Information Policy

If expected structure is uncertain, infer from repository layout, state assumptions, and provide a conservative readiness report with optional enhancements separated from required fixes.

## Rule Routing

- Ensure onboarding guidance points users to chapter/rule skills as primary sources before broad narrative generation.
- Treat rules-full as fallback only when skill sources are insufficient.
