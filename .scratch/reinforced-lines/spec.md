# Reinforced Lines

Status: ready-for-agent

## Problem Statement

Gapfall’s Continuous Stream is readable but flat: every Generated Line takes one correct Shot on the Frontline and then leaves in a Cascade. The player wants a durable line variant that costs extra Shots and attention — especially when same-column gaps stack — without breaking Frontline-up resolution, pass-through fills, or the packed stream they already learned.

## Solution

Introduce **Reinforced Lines**: Generated Lines that spawn at a fixed independent probability (15%), look like reinforced ore, and require a two-step clear when they sit on the Frontline — first a **Crack** (Shot consumed, empty slot stays empty), then a finishing Shot in the column that holds the tnt. Reinforced Lines above the Frontline still accept pass-through tnt like any other line; when a complete Reinforced Line becomes the Frontline it **Cracks** instead of Cascading. Removing a Reinforced Line earns +1 bonus score. New reinforced and cracked ore sprites, a dedicated crack sound, and a short Instructions addition make the pattern legible before the player hits it blind.

## User Stories

1. As a player, I want some Generated Lines to be Reinforced Lines, so that the stream occasionally demands more than one Shot to resolve.
2. As a player, I want Reinforced Lines to enter the Continuous Stream with the same 3+1 layout as normal Generated Lines, so that the board still reads at a glance.
3. As a player, I want Reinforced Lines to spawn at random with a steady chance, so that their appearance feels unpredictable but not scripted.
4. As a player, I want roughly one Reinforced Line every six or seven spawns on average, so that durability is noticeable without dominating the run.
5. As a player, I want Reinforced Lines to obey the same two-in-a-row empty-slot cap as other Generated Lines, so that brutal same-column stacks do not get worse.
6. As a player, I want Partial Lines to never be Reinforced, so that my own misses stay the simpler pressure they are today.
7. As a player, I want a Reinforced Frontline with an empty slot to **Crack** when I hit that slot, so that the first Shot visibly weakens the line without clearing it.
8. As a player, I want the empty slot to stay empty after a Crack, so that I still aim at the gap for the finishing Shot.
9. As a player, I want the first Crack Shot to be consumed without placing tnt, so that cracking is a distinct beat from filling.
10. As a player, I want a second Shot into the Cracked Frontline’s empty slot to place tnt and remove the line, so that the two-step clear is “crack, then fill.”
11. As a player, I want Shots to still pass through a Cracked empty slot when a higher same-column gap exists, so that stacked gap patterns stay the micro-decision they are today.
12. As a player, I want a pass-through Shot into a higher Reinforced Line to place tnt immediately, so that solving the upper gap first remains valid.
13. As a player, I want a complete Reinforced Line that becomes the Frontline to **Crack** instead of leaving in a Cascade, so that pre-filled durable lines still cost a finishing Shot.
14. As a player, I want that promotion Crack to leave the line in place with tnt already set, so that I see why the line did not vanish.
15. As a player, I want a complete Cracked Frontline to be removed only by a Shot in the tnt column, so that the finishing aim matches where I already solved the gap.
16. As a player, I want a Shot into any other column on a complete Cracked Frontline to stack a Partial Line as today, so that wrong-column mistakes still hurt.
17. As a player, I want two consecutive Reinforced Lines in the same column to be clearable with four Shots — pass-through tnt on the higher line, Crack the Frontline, remove the Frontline, then remove the new Frontline after it promotes and Cracks — so that the hardest stack has a learnable rhythm.
18. As a player, I want a normal Frontline under a pre-filled Reinforced Line to clear first, then the Reinforced Line to Crack on promotion, then one more Shot in the tnt column to remove it, so that mixed stacks behave consistently.
19. As a player, I want Reinforced Lines to remain ineligible for removal until the Cracked Frontline rules say so, so that Frontline-up order is preserved.
20. As a player, I want removals of normal Generated Lines and Partial Lines to behave as today when no Reinforced rule applies, so that the new variant does not rewrite the whole game.
21. As a player, I want a +1 score bonus when a Reinforced Line is removed, so that the extra Shots feel rewarded.
22. As a player, I want Cascade scoring to stay the same for non-Reinforced removals, with the Reinforced bonus added per durable line removed, so that efficient play still pays on big Cascades.
23. As a player, I want intact Reinforced occupied cells to look like reinforced ore, so that I can spot durability before I shoot.
24. As a player, I want all three occupied cells on a Cracked line to look like cracked ore, so that the weakened state is obvious.
25. As a player, I want empty slots to stay visually empty and tnt to keep today’s sprite, so that aim and fill feedback stay familiar.
26. As a player, I want a short crack sound when a line Cracks, so that a consumed Shot without tnt or removal still has punch.
27. As a player, I want Reinforced removal to keep today’s detonation feedback, so that the finish still feels like TNT going off.
28. As a player, I want a promotion Crack to use the same crack sound as a Frontline Crack, so that both paths into Cracked feel the same.
29. As a player, I want the Instructions screen to mention Reinforced Lines briefly, so that I am not learning the pattern only from failure.
30. As a player, I want Fall Speed, Shot speed, Continuous Stream packing, and Death Line timing unchanged, so that difficulty still comes from speed plus occasional durability.
31. As a player, I want pause, preparation, and game-over behavior unchanged, so that Reinforced Lines do not add a second clock or menu.
32. As a player, I want missing reinforced or cracked art to fall back gracefully like today’s sprites, so that a failed load does not blank the board.
33. As a future duel client, I want Reinforced and Cracked state serializable in public game state, so that two cores given the same inputs still lockstep.
34. As a developer, I want Reinforced rules owned by the game core, so that Canvas and React stay presentation-only per ADR-0002.
35. As a developer, I want spawn probability injectable or testable via RNG, so that 15% spawn and cap behavior do not flicker in tests.
36. As a developer, I want the existing game-core test style extended, not replaced, so that Frontline-up, gap-stay, and Cascade tests keep meaning the same thing for normal lines.

## Implementation Decisions

- Respect ADR-0002. Rules, spawn, crack/remove eligibility, and scoring stay in the game core. Canvas draws public state and loads new sprites. React keeps HUD, Instructions, pause, and game-over. The cue reader diffs public state for the new crack sound.
- Respect ADR-0003. Removals still leave gaps. Promotion Crack is not a removal. Frontline-up eligibility extends so a complete Reinforced Line is never removed until the Cracked Frontline finishing rule fires.
- Use domain language from `CONTEXT.md`: **Reinforced Line**, **Cracked**, **Generated Line**, **Frontline**, **Cascade**, **Shot**, **Partial Line**, **Continuous Stream**. Do not introduce HP, armored line, or projectile as rule terms.
- Extend public row state so each row can be marked **reinforced** (spawn-time, Generated Lines only) and **cracked** (runtime). Partial Lines are never reinforced. Cracked applies only to Reinforced Lines.
- Spawn: each new Generated Line has an independent **15%** chance to be Reinforced. The existing two-in-a-row empty-slot cap applies to all Generated Lines including Reinforced. Spawn cadence and Continuous Stream packing stay locked to Fall Speed.
- Collision and durability (decision summary):
  - Intact Reinforced **Frontline** + Shot into its empty slot → Shot consumed, row becomes **Cracked**, slot stays **empty**, no tnt placed.
  - **Cracked** Reinforced **Frontline** + empty slot + Shot into that gap → tnt placed, row **removed** (if Frontline-up allows).
  - Pass-through unchanged: Shots walk the consecutive-gap stack; a Reinforced Line above the Frontline takes tnt on first hit like any other line.
  - Complete Reinforced Line becomes **Frontline** (line below removed) → **Cracks** in place; not removed. Emit crack feedback.
  - Complete **Cracked** **Frontline** → removed only by a Shot in the column that holds **tnt**. Shots into other occupied columns stack a Partial Line as today.
- Scoring: keep existing Cascade formula (`removed * 2 - 1` for a burst). Add **+1 bonus per Reinforced Line removed** in that action (count rows that were reinforced among removed rows).
- Presentation:
  - Add two cell-sized ore sprites (same footprint as stone blocks): **reinforced ore** for occupied cells on intact Reinforced Lines; **cracked ore** for all three occupied cells when the row is Cracked.
  - Extend the cue reader with a **`crack`** sound when a row becomes Cracked without being removed (Frontline Crack or promotion Crack). Intact-Reinforced pass-through fill is silent like a normal fill. Reinforced removal keeps **`detonate`**.
  - Add a short crack audio file beside existing launch/detonate/miss/death assets.
  - Add one Instructions list item (Portuguese, matching today’s screen) explaining Reinforced Lines at a high level: durable ore, crack on Frontline hit, finish in the tnt column.
- Do not add a player-facing Reinforced spawn percentage control. The 15% knob lives in code like Fall Speed config.
- Do not change preparation duration, Shot speed, Fall Speed ramp, or serializable command shape beyond the extended public row fields.

## Testing Decisions

- **Primary seam: game-core public API.** Tests drive `createGame` / `startGame` / `launchBlock` / `advanceGame` with injectable RNG and read public rows, score, and phase only — same style as existing `game-core` tests. This seam owns all durability, spawn, Frontline-up, pass-through, promotion Crack, and scoring behavior.
- **Secondary seam: cue reader.** Given consecutive public `GameState` snapshots, assert `crack` is emitted when a row becomes Cracked without removal, and that a normal fill or Reinforced removal does not emit `crack` when inappropriate. Do not assert Canvas pixels or audio playback.
- Good tests observe external behavior: row presence, `reinforced` / `cracked` flags, cell occupancy, score, phase, and cue sounds — not private collision helpers or sprite URLs.
- Prior art: `game-core.test.ts` for Frontline-up, same-column gap pairs, Cascades, Partial Lines, and spawn cap; `cues.test.ts` for detonation/miss/launch diffing.
- New core tests must cover at minimum:
  - Spawn composition: Reinforced Lines appear at the configured rate with injectable RNG; Partial Lines never reinforced.
  - Empty-slot repeat cap still applies when the candidate line is Reinforced.
  - Intact Reinforced Frontline: first Shot into gap Cracks (empty stays empty, no tnt); second Shot into gap removes.
  - Pass-through: Cracked Frontline with higher same-column gap — Shot fills higher line, Frontline stays Cracked.
  - Pass-through: higher intact Reinforced Line receives tnt without Cracking.
  - Promotion: complete Reinforced Line becomes Frontline → Cracks, not removed; finishing Shot in tnt column removes.
  - Complete Cracked Frontline: Shot in tnt column removes; Shot in wrong occupied column stacks Partial Line.
  - Four-Shot two-Reinforced same-column scenario from design review (pass-through tnt, Frontline Crack, Frontline remove, promoted line Crack then remove).
  - Scoring: Reinforced removal earns +1 bonus; two-line Cascade with one Reinforced removed scores correctly.
  - Normal Generated Lines and Partial Lines: existing Frontline-up and Cascade cases still pass unchanged.
- New cue tests must cover: Frontline Crack emits `crack` without `detonate`; promotion Crack emits `crack`; Reinforced removal emits `detonate` not `crack`; pass-through fill emits neither `crack` nor `miss`.

## Out of Scope

- Reinforced Partial Lines, player-placed durability, or mid-round conversion of stone to Reinforced.
- Playing Time ramp of Reinforced spawn rate, guaranteed spacing between Reinforced Lines, or a player menu for spawn odds.
- Changing Fall Speed, Ramp Duration, Speed Cap, Shot speed, preparation time, or Death Line update order.
- New block types beyond Reinforced/Cracked ore visuals on Generated Lines.
- Power-ups, campaigns, win conditions, or network sync of Reinforced state.
- Per-cell mixed cracked/intact visuals, reinforced ore variants for checkerboard variety, or replacing existing stone/tnt sprites.
- Music, new Settings knobs, or Instructions tutorial Rounds.
- WebGL, a game engine, or a particle system for crack feedback.

## Further Notes

- Glossary entries for **Reinforced Line** and **Cracked** already live in `CONTEXT.md` from the grilling session; keep spec language aligned with them.
- The four-Shot two-Reinforced same-column sequence is the acceptance scenario for the hardest stack; encode it as an integration-style core test.
- If `reinforced` / `cracked` on `GameRow` proves too awkward for serialization, a single row `kind` enum is acceptable provided public tests still observe the same behaviors — prefer the minimal extension that matches existing row identity and quiet-tick mutation patterns (ADR-0004).
- Crack sound naming in code should stay `'crack'` alongside existing `FeedbackSound` values; update audio loading accordingly.
