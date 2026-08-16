# Fall Speed progression

Status: ready-for-agent

## Problem Statement

A round of Gapfall never changes pressure. Generated Lines fall at a constant Base Fall Speed for the entire Playing Time, so staying alive longer does not get harder. The player wants an infinite run that tightens the longer they last, without breaking the packed Continuous Stream or the launcher they already learned.

## Solution

Fall Speed rises smoothly with Playing Time and then stops at a Speed Cap. Every row on the board shares that speed, and Generated Line spawn stays locked to it so the Continuous Stream never opens a vertical gap. Shots keep today’s travel speed. The board getting faster is the only feedback — no speed number on the HUD. Defaults are 3× Base Fall Speed after 60 seconds of Playing Time; those values are code knobs, not a player menu.

## User Stories

1. As a player, I want the board to get faster the longer I stay in play, so that a long run feels like a harder game than a short one.
2. As a player, I want Generated Lines to stay packed with no vertical gaps while speed changes, so that the Continuous Stream remains the threat I already understand.
3. As a player, I want Partial Lines to fall at the same Fall Speed as Generated Lines, so that a miss does not create a second clock on the board.
4. As a player, I want the Frontline, gaps, and death line to keep their current rules at every Fall Speed, so that faster play is the same game under more pressure.
5. As a player, I want the first seconds of a round to fall at Base Fall Speed, so that every restart feels like the game I already know.
6. As a player, I want Fall Speed at Playing Time zero to be one block-height per second, so that the opening cadence matches today’s round.
7. As a player, I want Fall Speed to climb linearly during the Ramp Duration, so that pressure increases progressively rather than in sudden steps.
8. As a player, I want to feel about 2× Base Fall Speed at 30 seconds of Playing Time with the default knobs, so that the midpoint of the ramp is readable in the hands.
9. As a player, I want Fall Speed to reach the Speed Cap at 60 seconds of Playing Time by default, so that a good run has to live at maximum pressure instead of only approaching it.
10. As a player, I want Fall Speed to hold at the Speed Cap after the Ramp Duration, so that surviving past the cap is execution at a human ceiling, not an unbounded brick wall.
11. As a player, I want the default Speed Cap to be 3× Base Fall Speed, so that late game is tense on a four-column touch layout without feeling unfair.
12. As a player, I want preparation time not to advance Playing Time, so that the three-second countdown does not steal ramp.
13. As a player, I want pause to freeze Playing Time and Fall Speed, so that hiding the tab or taking a break does not skip me ahead on the ramp.
14. As a player, I want resume to continue from the same Playing Time and Fall Speed, so that pause is a hold, not a reset or a jump.
15. As a player, I want a new round to start Playing Time at zero and Fall Speed at Base Fall Speed, so that “play again” is a fair restart.
16. As a player, I want Shot travel speed to stay constant while the board ramps, so that the launcher stays the same tool and difficulty is a faster Continuous Stream.
17. As a player, I want several Shots in flight to remain legal at high Fall Speed, so that I can still answer pressure without a cooldown.
18. As a player, I want a correct Shot to still save me on the same update that would otherwise lose, so that fairness at the death line does not change when the board is faster.
19. As a player, I want to lose when any block still touches the death line after resolutions, so that the loss condition stays unequivocal at every Fall Speed.
20. As a player, I want Cascades, gap-stack fills, and bottom-to-top eligibility to work as they do today at every Fall Speed, so that the special two-gap pattern does not break under the ramp.
21. As a player, I want score to stay one point per removed line plus the existing Cascade bonus, so that faster play earns more only because more lines appear and are cleared, not because the scoring rule changed.
22. As a player, I want the local high score to stay comparable between rounds, so that beating my record still means the same game.
23. As a player, I do not want a difficulty or speed setting in the UI, so that I cannot farm a high score on an easier cap.
24. As a player, I do not want a speed multiplier, level number, or ramp meter on the HUD, so that the only tell is the board getting faster.
25. As a player, I want Generated Lines to keep exactly one empty slot, still limited to two consecutive gaps in the same column, so that spawn rules do not change just because spawn is more frequent.
26. As a player, I want the packed stream to remain true after a large time step (tab freeze then pause, or a test jumping many seconds), so that Fall Speed over a long delta matches many small deltas.
27. As a future ranking client, I want Playing Time and the difficulty knobs in the serializable game state, so that a later API can replay or record a round without guessing the ramp.
28. As a future duel client, I want Fall Speed to be a pure function of Playing Time and those knobs, so that two simulations given the same inputs stay in lockstep.
29. As a developer, I want Base Fall Speed, Speed Cap, and Ramp Duration to be code knobs with the agreed defaults, so that we can tune feel without rewriting the rule.
30. As a developer, I want those knobs injectable when creating a round, so that tests can freeze Fall Speed at Base Fall Speed and still assert exact geometry.
31. As a developer, I want existing shot, Cascade, and death-line tests to keep passing under constant Fall Speed, so that this feature does not silently rewrite unrelated rules.
32. As a developer, I want to observe Playing Time and row positions from the public game state, so that tests prove the ramp without inspecting private spawn bookkeeping.
33. As the product team, I want this change confined to the game core, so that the Canvas renderer and React shell keep consuming state without a new difficulty UI.
34. As the product team, I want the originating v1 spec not to restate constant Fall Speed as current law, so that this spec and ADR-0001 cannot be overridden by a leftover kickstart document.

## Implementation Decisions

- Respect ADR-0001: linear Fall Speed ramp, Continuous Stream lockstep, constant Shot speed, code knobs only.
- Change only the game core. The Canvas renderer keeps drawing whatever state the core emits. The React shell keeps HUD, pause, and game-over as they are — no speed readout, no settings screen.
- `createGame` accepts an optional difficulty config. Omitted config uses the production defaults. The resolved knobs are stored on the game state so `advanceGame` stays a pure function of state plus elapsed seconds plus RNG.
- Default knobs: Base Fall Speed is one block-height per second; Speed Cap is 3× Base Fall Speed; Ramp Duration is 60 seconds of Playing Time.
- Config shape (decision, not a required literal name):

```ts
{
  baseFallSpeed: number // block-heights per second; default 1
  speedCapMultiplier: number // default 3
  rampDuration: number // seconds of Playing Time; default 60
}
```

- Game state exposes `playingTime` (seconds in the playing phase). Fall Speed is derived: `base + (cap - base) * clamp(playingTime / rampDuration, 0, 1)` with `cap = base * speedCapMultiplier`. Do not store a redundant mutable speed if it can drift from Playing Time.
- Playing Time advances only while the phase is playing. Preparation leftover that spills into play counts. Pause and game-over do not advance it. `startGame` / `resumeGame` do not add time by themselves.
- Displacement over a timestep is the integral of Fall Speed across that interval, not “current speed × dt” alone. A tick that crosses the Speed Cap must integrate the linear piece and the capped piece separately. One large `advanceGame` step must match the same elapsed Playing Time split into many small steps, within ordinary float tolerance.
- Generated Line spawn is driven by distance fallen, not by wall-clock seconds. Spawn one Generated Line per block-height of board travel, carrying a remainder, so the Continuous Stream stays packed at every Fall Speed. Today’s “one spawn per second” is only correct while Fall Speed equals Base Fall Speed.
- Every row, Generated Line and Partial Line, moves by that same displacement. Shot travel still uses the existing constant Shot speed.
- Death, collisions, Cascades, and same-update save stay in the current update order: resolve shots and removals, then test the death line.
- Do not revive a root `GAME_SPEC.md`. The originating product definition lives at `.scratch/gapfall-v1/spec.md` and defers the ramp to this spec and ADR-0001.

## Testing Decisions

- Keep the existing single seam: the public game-core API (create a game, launch a Shot, advance by a delta). Tests observe public state and effects only — phase, `playingTime`, row positions and cells, shots, score. Do not assert private spawn remainders, internal collections, or Canvas pixels.
- No new seam. Do not add UI tests for this feature: there is no speed HUD and no settings screen.
- Inject difficulty config at `createGame` so geometry tests from the current suite can freeze Fall Speed (Speed Cap multiplier 1, or equivalent “no ramp”) and keep asserting packed positions at one block-height per second. Do not rewrite those stories to depend on the default 3× ramp.
- Prior art: `game-core` tests already cover packed Generated Lines, spawn above the playfield, Cascades, gap stacks, and one-frame detonation by calling `createGame` / `startGame` / `launchBlock` / `advanceGame` and reading public rows. Extend that style.
- New tests must cover, as public behavior:
  - Playing Time stays 0 during preparation; leftover prep delta that starts play does count.
  - Playing Time does not advance while paused or after game-over.
  - A new round starts at Playing Time 0 and Base Fall Speed.
  - With defaults, Fall Speed at 0s / 30s / 60s / well past 60s matches 1× / 2× / 3× / 3× Base Fall Speed, observed via how far rows travel over a short subsequent delta (or equivalent public displacement), not via a private speed field.
  - Generated Lines remain exactly one block-height apart after advances at ramped speed, including a single large delta.
  - Splitting 60 seconds of play into many steps versus one step yields the same Playing Time and the same packed stream, within float tolerance.
  - Shot y-delta over a known interval is unchanged when Fall Speed is at the Speed Cap.
  - Score for a single-line clear and a double Cascade is unchanged.
  - Custom knobs (different Speed Cap or Ramp Duration) change when the cap is reached, proving the values are not hard-wired beyond defaults.
- Determinism: keep injecting RNG as today’s tests do. The ramp must not introduce extra randomness.

## Out of Scope

- Player-facing difficulty, speed, or accessibility settings.
- HUD, audio, particles, or any explicit “level” / multiplier display.
- Changing Shot speed, scoring, Cascade math, gap-repeat limits, column count, or the death-line rule.
- Stepped levels, exponential ramps, ease-in/ease-out, or an unbounded Fall Speed.
- Using score, lines cleared, or board height as the difficulty clock.
- Remote ranking, replays as a product feature, or multiplayer synchronization (the state should remain serializable; those products are not this spec).
- Power-ups, new block types, campaigns, or a win condition.

## Further Notes

- This reverses the old kickstart constraint that v1 Fall Speed stayed constant. `.scratch/gapfall-v1/spec.md` must keep deferring the ramp to this spec and ADR-0001; do not restore a root `GAME_SPEC.md`.
- Default 3× and 60s are tunables. Changing them later is expected; changing the clock (Playing Time), the lockstep Continuous Stream, or constant Shot speed would be a new decision.
- High Fall Speed shrinks decision time and closes the death line faster. Constant Shot speed means the launcher does not time-warp with the board; that squeeze is intentional.
