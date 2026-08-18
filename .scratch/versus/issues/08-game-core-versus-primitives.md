# 08 — Game core Versus primitives

**What to build:** The board can hold Fall Speed at Base Fall Speed, report how many lines a tick removed, and stack extra Generated Lines packed above the current top — so a later Match can send pressure without rewriting Frontline-up rules. No Versus UI yet; this is verifiable in the core seam.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A Round created with Versus Fall Speed config (`speedCapMultiplier` 1) stays at Base Fall Speed across long Playing Time; the default Single Player config still ramps.
- [ ] An explicit command stacks N extra Generated Lines packed above the current topmost row (minimum y), each a real Generated Line: 3+1, two-in-a-row empty-slot cap, 15% Reinforced chance.
- [ ] Cadence spawn never occupies the same y as an extra Generated Line; it stacks packed above that stack instead.
- [ ] Advancing the simulation reports the number of lines removed that tick (a two-line Cascade reports 2, not score 3).
- [ ] Extra Generated Lines do not shove existing rows toward the Death Line; gaps still remain after removals.
- [ ] Existing core tests keep passing; new tests use the public core API only.
