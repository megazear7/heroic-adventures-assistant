# Rule: Attacks, Damage, and Defenses

## Scope

Use this rule for all attack resolution, hit/miss logic, damage calculation, and defense mitigation.

## Consolidated Rule

Most attacks are opposed d20 rolls: attacker adds attack stat, defender adds defense stat. If attacker total exceeds defender total, attack hits.

Default stat pairing:
- weapon attacks: attacker skill vs defender agility
- spell attacks: attacker intelligence vs defender willpower

Then resolve block/cover/toughness modifiers and compute damage.

## Resolution Procedure

1. Determine attack type (melee/ranged/spell/feature).
2. Check special clauses (ignore shields, ignore armor, ignore toughness).
3. Roll opposed d20s and add modifiers.
4. If hit: roll damage dice and add damage modifiers.
5. Apply melee strength bonus where applicable.
6. Subtract toughness unless bypassed.
7. Apply remaining damage to temporary health first, then current health.

## Defensive Layers

- **Block**: shield and some effects can auto-negate based on unmodified defense die face value.
- **Cover**: ranged defense can miss based on unmodified agility roll vs cover value.
- **Toughness**: subtracts from damage unless bypassed.
- **Armor bypass effects**: remove armor component but not necessarily non-armor toughness.

## Special Mechanics

- Damage dice explode on max result repeatedly.
- Advantage provides +2 and does not stack above +2.
- Temporary health does not stack; keep higher value only.

## Adjudication Notes

- Resolve hit determination before any damage manipulation.
- Track whether a rule says ignore shields, ignore armor, or ignore damage reduction; these are different.
- For unclear interactions, apply the narrowest bypass interpretation.
