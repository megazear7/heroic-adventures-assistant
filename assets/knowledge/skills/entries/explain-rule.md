---
name: explain-rule
description: Explain a Heroic Adventures rule with ruling-ready clarity.
argument-hint: rule question
---

Answer this Heroic Adventures rules question using the canonical workspace rules.

Requirements:
- Use this source hierarchy:
1. Relevant `rule-*` skills.
2. Relevant `chapter-*` skills.
3. `assets/rules-index.md` for lookup.
4. `assets/rules-full.md` only if needed.
- Do not invent canonical mechanics.
- If text is ambiguous, provide the safest table ruling and label uncertainty.

Required output:
1. Direct rule summary.
2. Action economy implications.
3. Edge-case clarification.
4. Safe table ruling if ambiguity remains.

Keep response concise and table-usable.

Question: ${input:question:Ask a rule question}
