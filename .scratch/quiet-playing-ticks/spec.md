# Quiet playing ticks

Status: ready-for-agent

## Problem Statement

On a phone the Round’s playing phase feels choppy: the board does not hold a steady 60 Hz. Fall Speed is not the issue — rows are not descending too slowly. Taps are not late. Detonations are not uniquely hitchy. The whole playing phase stutters, especially on a mid-range Android in Chrome. The player wants the Continuous Stream to look like one smooth fall, not a slideshow.

## Solution

Keep Canvas 2D, keep the public game-core commands, keep every rule. During play, a tick that only moves the board must not allocate a new object per Generated Line and Partial Line. The Round diffs cues only when a Shot, a pending complete line, or death can actually fire. A developer running the Vite dev server — including a phone aimed at that server — sees a small FPS overlay so they can confirm 60 Hz. Production builds stay clean.

## User Stories

1. As a player on a mid-range Android phone in Chrome, I want the playing phase to hold a steady 60 Hz, so that the Continuous Stream reads as motion rather than stutter.
2. As a player, I want that smoothness for the whole playing phase, so that the round does not start fine and then chop, or only hitch on a Cascade.
3. As a player, I want Fall Speed, Base Fall Speed, Speed Cap, Ramp Duration, and Playing Time unchanged, so that this pass is not a difficulty retune.
4. As a player, I want Generated Lines to stay a Continuous Stream, so that packing and spawn still lock to Fall Speed.
5. As a player, I want Shots, Frontline-up fills, Partial Lines, Cascades, gap-stay, and the one-tick filled hold to behave as they do now, so that the game I already know is the game I play.
6. As a player, I want a last-instant Shot to still save me from the Death Line on the same update, so that fairness is untouched.
7. As a player, I want score and Cascade scoring unchanged, so that a two-line Cascade is still worth three.
8. As a player, I want launch, detonate, miss, and death sounds to still fire at the same moments, so that cutting allocations does not swallow feedback.
9. As a player, I want a Cascade to still layer one detonate per removed line, so that two lines leaving together still sound bigger than one.
10. As a player, I want a miss that stacks a Partial Line to still sound like a miss, so that a collision is audible.
11. As a player, I want filling an empty slot, including the first Shot of a same-column gap pair, to stay silent of miss, so that a correct fill is not punished.
12. As a player, I want death on the Death Line to still play the death sound, even when I had no Shot in flight, so that losing without tapping is still marked.
13. As a player, I want pause, resume, preparation, and game-over to feel as they do now, so that only the playing-tick budget changes.
14. As a player, I want production play to show no FPS meter, so that Score remains the only HUD number.
15. As a developer on the Vite dev server, I want an FPS overlay on the game frame, so that I can see whether the phone is holding 60 Hz.
16. As a developer aiming a phone at the dev server, I want that overlay visible on the device, so that the mid-range Android bar is not a desktop guess.
17. As a developer, I want that overlay updated from the existing animation frame loop, so that measuring FPS does not re-render React every frame and cause the chop I am measuring.
18. As a developer, I want that overlay off the Score HUD, so that it cannot be mistaken for a Fall Speed or score readout.
19. As a developer, I want production builds to omit the overlay, so that players never see frame-loop telemetry.
20. As a future ranking client, I want GameState to remain a plain serializable snapshot at pause, game-over, and rest, so that mutating a playing tick does not invent a second write model.
21. As a future duel client, I want the public commands to stay `createGame`, `launchBlock`, and `advanceGame` returning `GameState`, so that lockstep still feeds on states, not renderer events.
22. As a developer, I want `launchBlock` to leave its input untouched, so that a launch cue can still diff the previous public state against the next without a defensive clone on every tap.
23. As a developer, I want a quiet playing tick to keep the same row objects, so that Fall Speed does not pay garbage-collection for every Generated Line on the board.
24. As a developer, I want in-flight Shots to keep the same objects while they only travel, so that Shot motion is as cheap as row motion.
25. As a developer, I want a newly spawned Generated Line to be a new object while every retained row keeps its identity, so that the Continuous Stream can grow without cloning the board.
26. As a developer, I want a detonation to drop removed rows and keep survivor identity, so that a Cascade does not clone the rest of the stream.
27. As a developer, I want a Shot that fills or stacks to copy only the rows whose cells changed, so that a collision is paid for once, not as a full-board rewrite.
28. As a developer, I want no-ops (pause, game-over, non-positive elapsed time, launch outside play) to stay referentially equal, so that existing identity checks keep meaning.
29. As a developer, I want the Round to skip the cue diff when no cue can happen, so that we do not clone the board every frame just to discover silence.
30. As a developer, I want the Round to snapshot before a tick that can detonate or miss, so that `readCues` still sees a real previous board after `advanceGame` has moved objects.
31. As a developer, I want death detected from the phase change after the tick, so that a Shot-less loss still sounds without snapshotting the whole stream.
32. As a developer, I want existing rule tests to keep passing with the same public observations, so that this pass cannot hide a Frontline or Death Line regression.
33. As a developer, I want a recorded ADR that playing ticks may mutate `GameState`, so that the next person does not “restore” copy-on-write and bring the chop back.

## Implementation Decisions

- Respect ADR-0002. The game core stays free of Canvas, React, and audio. Canvas 2D remains the renderer. Do not migrate to WebGL or a game engine in this pass. Fill-rate is not the diagnosis: the scene is already a 360×800 bitmap.
- Respect ADR-0001 and ADR-0003. Fall Speed knobs, Frontline-up eligibility, Cascades, and gap-stay do not move.
- Do not add glossary terms for frame budget, quiet ticks, or FPS. Those are not domain language.
- Public core API stays: `createGame`, `startGame`, `pauseGame`, `resumeGame`, `launchBlock`, `advanceGame` return `GameState`. Same fields. No presentation event list on the core. No FPS on serializable state.
- `advanceGame` during `playing` (and, if convenient, `preparing`) may mutate the input state’s rows and Shots in place: update `y`, `playingTime`, `spawnElapsed`, and similar tick fields. It may return that same object. Callers that need a previous board must copy it before the call.
- `launchBlock`, `pauseGame`, and `resumeGame` do not mutate their input. Launch remains a copy-on-write command so the Round can diff launch cues from the previous public state the way it does today.
- No-ops still return the same object: non-positive elapsed time, `paused`, `game-over`, and launch outside `playing`.
- Identity contract for a playing `advanceGame` tick:
  - Every row id that still exists keeps the same row object; `y` may change.
  - Every Shot id that still exists keeps the same Shot object; `y` may change.
  - A new Generated Line or Partial Line is a new object.
  - A row whose cells change (fill or stack) is replaced or has a replaced `cells` array; unchanged rows keep identity.
  - Removed rows and consumed Shots are absent from the next state.
- Do not sort-copy or map-copy the whole board on a tick that only applies Fall Speed. Look for eligible detonations without allocating a new row per Generated Line when the Frontline is not complete.
- `readCues` stays a pure function of two public states. Do not add core events in this pass.
- The Round (`tickRound`) does **not** snapshot the board every frame.
  - Snapshot (enough of rows and Shots for `readCues`: ids, `y`, `cells`) only when a miss or detonation can happen this tick: at least one Shot in flight, or at least one complete line waiting on the one-tick hold.
  - After `advanceGame`, if phase became `game-over`, include `death` even when there was no snapshot. Death does not need a previous board.
  - If neither snapshot nor death applies, skip `readCues` and emit no sounds.
- `launchRound` keeps today’s launch cue path: `launchBlock` does not mutate, so previous vs next is enough.
- This pass does not cache Canvas layers, pack a spritesheet, raise the backing store for HiDPI, or change the 360×800 logical resolution.
- Dev FPS overlay: visible only when the Vite `DEV` flag is true. It sits on the game frame, not in the Score HUD. The animation-frame loop writes the number onto a DOM node (text content). It must not call React state updates on every frame. Production builds omit it.
- Record ADR-0004: playing ticks may mutate `GameState` so a mid-range Android can hold 60 Hz; copy-on-write every animation frame was rejected because it allocates per row per frame; WebGL was rejected because it does not remove that main-thread cost and ADR-0002 already forbids it here.

## Testing Decisions

- Two existing seams, no new modules. Do not invent a third seam for FPS.
- Highest seam for the allocation contract: the public game-core API. Drive `createGame` / `startGame` / `launchBlock` / `advanceGame` as today’s core tests already do. Observe public rows, Shots, score, phase, Playing Time, and **object identity** of retained rows and Shots. Do not assert private helpers, sort behavior, or allocation counters.
- Highest seam for cue skipping: Round commands. Drive `tickRound` / `launchRound` as today’s Round tests already do. Observe `sounds`, detonations, score, and phase. Do not assert Canvas pixels, DOM overlay text, or React renders.
- `readCues` stays the seam for which bangs a pair of public states imply. Any cue test that currently calls `advanceGame(before)` and then diffs `before` against `after` must snapshot `before` first (or build two literals). The reader itself does not change contract.
- A good test still only watches external behavior: rules, identity of retained rows/Shots, and which sounds the Round emits. It does not watch whether a particular array was copied internally, and it does not claim 60 Hz.
- Prior art: core tests for Continuous Stream, one-tick detonation, Cascades, Death Line saves, and Fall Speed ramps. Cue tests for launch / detonate / miss / death. Round tests for tick, launch, pause, and detonation aging. Extend those files; do not stand up a renderer test harness.
- New core tests must cover:
  - A short playing tick with no Shot, no complete line, and no spawn keeps the same row object identities and only advances `y` / Playing Time.
  - A tick that spawns a Generated Line adds a new row object and keeps every previous row identity.
  - In-flight Shots keep identity while they only travel.
  - After the one-tick hold, removed rows are gone and survivors keep identity; score still matches today’s Cascade rules.
  - A fill or miss-stack changes the affected row’s cells and leaves unrelated rows identical by reference.
  - A same-update Death Line save and a real Death Line loss still match existing rule tests.
  - Pause / game-over / non-positive dt still return the same state object.
  - `launchBlock` still returns a different state object and leaves the input’s `shots` untouched.
- New Round tests must cover:
  - A quiet playing tick emits no sounds and does not require a previous-board clone to stay silent.
  - A tick that detonates after the one-tick hold still emits `detonate` (and stacked detonations for a Cascade).
  - A miss-stack tick still emits `miss`.
  - A tick that reaches the Death Line with no Shot in flight still emits `death`.
  - Launch during play still emits `launch`.
  - Existing pause freeze / resume aging tests keep passing.
- Do not unit-test the FPS overlay. Do not assert frame times in CI. 60 Hz is confirmed on a mid-range Android in Chrome against the dev overlay.

## Out of Scope

- Changing Fall Speed, Shot speed, spawn packing, Frontline-up order, gap-stay, scoring, or Death Line rules.
- WebGL, a game engine, Pixi, sprite-sheet packing, HiDPI canvas backing-store changes, dirty-rect paint, or an offscreen layer cache.
- A player-facing FPS or Fall Speed HUD. ADR-0001 already rejected a speed HUD; this overlay is dev-only telemetry.
- Core presentation events, or a new `advanceGame` return shape that bundles events with state.
- Making `launchBlock` mutate its input.
- Google Fonts, overlay `backdrop-filter`, audio graph, or other main-thread work outside the playing tick.
- Automated 60 Hz certification, remote-device CI, or a shipped performance HUD.
- Network play, rollback, or ranking API work.

## Further Notes

- The originating v1 spec asked for a portrait phone as the layout target and listed a WebGL migration as out of scope. This spec is the frame-loop follow-up: same renderer, cheaper playing ticks.
- If a mid-range Android in Chrome is still below 60 Hz after this pass, open a second spec on paint. Do not reopen WebGL until a profiler shows fill-rate, not allocation, as the cost.
- Domain language lives in `CONTEXT.md`. Do not introduce slow, FPS, frame, optimize, or projectile as rule terms.
