# Run Session

## Purpose

Support active play with fast rulings, turn-ready options, and pacing control that preserves table flow.

## When to Use

- During live scenes where players need immediate adjudication.
- When combat pacing stalls or narrative pressure drops.
- When GM needs quick consequence calls after unexpected choices.

## Required Inputs

- Current scene state and immediate objective.
- Active participants and initiative context (if in combat).
- Recent player actions and unresolved questions.
- Desired pacing mode (faster, steady, escalating tension).

## Workflow

1. Snapshot scene: stakes, timers/clocks, threats, and available exits.
2. Provide the next likely player vectors and immediate ruling-ready outcomes.
3. Resolve rule interactions with action-type clarity when relevant.
4. Offer consequence matrix (success, partial, failure, critical swing).
5. Apply pacing adjustment: accelerate, hold, or escalate with one concrete change.
6. End with next-beat prompt the GM can read/use instantly.

## Quality Checks

- Rulings are concise and usable in under 30 seconds.
- Consequences preserve player agency.
- Action economy terms are explicit when in combat.
- Scene pressure remains coherent with campaign tone.

## Output Template

Return:
- Scene snapshot.
- Top 3 likely player actions with rulings.
- Consequence matrix.
- One pacing move.
- One GM-facing next-line cue.

## Missing Information Policy

If live context is incomplete, ask for only the minimum missing state (objective, threat, who acts next) and provide an interim safe ruling that can be corrected without retconning major outcomes.

## Rule Routing

- Route combat questions to initiative, action economy, movement, attacks/defenses, and dying/recovery rule skills.
- If no direct rule is found in time, provide a safe temporary ruling and mark it for post-session verification.
