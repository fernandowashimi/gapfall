# 14 — Sent Generated Lines

**What to build:** When a player removes a line in a live Match, the opponent’s board instantly grows: one extra Generated Line packed above their current top per removal (a Cascade sends one per line). Each player still sees only their own board.

**Blocked by:** [Game core Versus primitives](08-game-core-versus-primitives.md), [Two-tab Match](13-two-tab-match.md)

**Status:** resolved

- [x] A tick that removes N lines sends N (the removed-line count, never score) through the Match room to the opponent only.
- [x] The receiving core applies N extra Generated Lines with the existing extra-line command (3+1, gap cap, Reinforced roll, packed above current top).
- [x] A two-line Cascade sends two extra Generated Lines, not one and not three.
- [x] Sent lines apply when the Match event arrives; no prediction of opponent clears.
- [x] Independent RNG: the two boards do not share empty-slot sequences.
- [x] Single Player still does not send or apply extra Generated Lines from a network.
- [x] Core tests remain the source of truth for stacking; referee tests remain the source of truth for relay. No Canvas or live-socket tests.

## Answer

A Versus tick with `linesRemoved > 0` sends JSON `{ type: 'lines-removed', n }` on the Match socket. The Match party calls `reduceMatch` and forwards `n` to the Opponent only. On receipt, the local Round applies `stackExtraGeneratedLines` (local `Math.random`). Single Player never sends or listens. Codec tests are in `src/match/messages.test.ts`; stacking and relay stay in core and referee tests.
