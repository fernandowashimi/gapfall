# 14 — Sent Generated Lines

**What to build:** When a player removes a line in a live Match, the opponent’s board instantly grows: one extra Generated Line packed above their current top per removal (a Cascade sends one per line). Each player still sees only their own board.

**Blocked by:** [Game core Versus primitives](08-game-core-versus-primitives.md), [Two-tab Match](13-two-tab-match.md)

**Status:** ready-for-agent

- [ ] A tick that removes N lines sends N (the removed-line count, never score) through the Match room to the opponent only.
- [ ] The receiving core applies N extra Generated Lines with the existing extra-line command (3+1, gap cap, Reinforced roll, packed above current top).
- [ ] A two-line Cascade sends two extra Generated Lines, not one and not three.
- [ ] Sent lines apply when the Match event arrives; no prediction of opponent clears.
- [ ] Independent RNG: the two boards do not share empty-slot sequences.
- [ ] Single Player still does not send or apply extra Generated Lines from a network.
- [ ] Core tests remain the source of truth for stacking; referee tests remain the source of truth for relay. No Canvas or live-socket tests.
