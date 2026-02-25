---
name: create-skill
description: Create high-quality Heroic Adventures skills that are complete, consistent, and rule-grounded.
---

# Create Skill

## Purpose

Design new skill files that are immediately usable, structurally consistent, and aligned with Heroic Adventures rule-first workflows.

## When to Use

- A new recurring task needs a dedicated skill.
- Existing prompts are too broad and need task-specialized guidance.
- You are standardizing or expanding the skill library.

## Required Inputs

- New skill name (kebab-case).
- One-sentence description of intended outcome.
- Domain scope and primary user intent.
- Expected input data and output artifact style.

## Workflow

1. Define scope boundaries: what the skill does and explicitly does not do.
2. Draft frontmatter with unique name and concise description.
3. Build sections in this exact order:
   - Purpose
   - When to Use
   - Required Inputs
   - Workflow
   - Quality Checks
   - Output Template
   - Missing Information Policy
   - Rule Routing
4. Write procedural steps that are actionable and table-ready.
5. Add quality checks that verify legality, clarity, and gameplay usability.
6. Add output template requirements that force consistent deliverables.
7. Add missing-info policy that defaults to conservative assumptions and explicit uncertainty labels.
8. Add rule routing that prioritizes chapter/rule skills before any fallback source.

## Quality Checks

- The skill can be executed end-to-end without external guesswork.
- Inputs and outputs are explicit and non-overlapping.
- Steps avoid invented canon and preserve official terminology.
- Missing information behavior is safe and reversible.
- Section names and ordering match the canonical template exactly.

## Output Template

Return:
- A complete SKILL.md body with all required sections.
- A brief note of intended companion prompts (optional but recommended).
- 1-2 example invocations showing expected use.

## Missing Information Policy

If the new skill scope is underspecified, create a minimal safe version, state assumptions, and include a short list of clarifying fields for a future refinement pass.

## Rule Routing

- Always route mechanics to relevant chapter and rule skills first.
- Use rules-full only when chapter/rule skills do not contain enough detail.
- If no canonical support exists, label the output as a suggested ruling.
