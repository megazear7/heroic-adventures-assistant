---
name: quick-roll
description: Create an on-the-fly ruling and roll procedure for a moment in play.
argument-hint: situation
---

Given this play situation, provide:
- Which stat/expertise/action type applies
- Difficulty recommendation with brief rationale
- Success and failure outcomes
- One complication option

Requirements:
- Prioritize `rule-action-economy-and-rounds`, `chapter-09-action-checks`, and other directly relevant rule skills.
- Keep the ruling usable in under 30 seconds at the table.
- If context is missing, assume a conservative baseline and state assumptions.

Required output format:
1. Roll call (stat/expertise/action type).
2. Difficulty and why.
3. Success outcome.
4. Failure outcome.
5. Complication option.
6. Optional partial-success option (if useful).

Situation: ${input:situation:Describe what the character attempts}
