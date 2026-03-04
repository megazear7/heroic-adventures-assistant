Validate and optimize this level-up:
${input:build:Character details and target level}

Requirements:
- Prioritize `level-up-character` and relevant progression/class/race/equipment rule skills.
- Confirm prerequisites and level gates before recommending any option.
- If data is missing, clearly list missing fields and provide a provisional (not finalized) plan.

Return:
1. Legality check (legal/blocked + reason).
2. New choices and dependencies (with prerequisite status).
3. Action economy changes (new/modified action types).
4. Optimized recommendation for next 2 levels.
5. Safe fallback option if the requested path is illegal.

Keep response concise and directly actionable at the table.
