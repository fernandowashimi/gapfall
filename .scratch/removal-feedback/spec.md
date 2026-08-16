# Line-removal feedback

Status: ready-for-agent

## Problem Statement

A correct Shot still feels dry. A complete line sits filled for one tick and then vanishes; a Cascade is only a score jump; a miss stacking into a Partial Line and a Death Line loss have no punch. The player wants a short, readable bang when a line is removed, and sound on the four beats that already exist in the rules, without changing when lines leave the board.

## Solution

Keep removal timing exactly as it is: eligible complete lines leave after the one-tick hold, gaps remain, the board does not collapse. The Canvas plays a brief cell-sized explosion in each gap a removed line just left, including stacked detonations for a Cascade. Four short sound files fire on Shot launch, line removal (layered per extra line in a Cascade), a miss that stacks a Partial Line, and death. Art and audio are real files in the existing pixel/TNT look. The game core does not emit presentation events; the renderer diffs consecutive public states (and the launch command) to decide what to play.

## User Stories

1. As a player, I want a complete line to explode when it is removed, so that a correct Shot feels like TNT going off rather than a row blinking out.
2. As a player, I want that explosion to last only a fraction of a second (about 200ms), so that the bang is punchy and does not smear into the next decision.
3. As a player, I want the exploding line to already be gone from the board, so that the animation cannot push me into the Death Line after a save.
4. As a player, I want the explosion to sit in the gap the line left, so that I still see that removals do not pull the Continuous Stream down.
5. As a player, I want the explosion pinned at the line’s last position, so that it does not keep falling as if the line were still occupying space.
6. As a player, I want the filled Frontline to stay visible for the existing one tick before the bang, so that I can still see the gap close.
7. As a player, I want every occupied cell of the removed line to burst, so that a four-block line reads as a whole line detonating.
8. As a player, I want a removed Partial Line to explode the same way as a removed Generated Line, so that recovery clears feel as satisfying as opening clears.
9. As a player, I want a two-line Cascade to show two stacked short detonations in those two gaps, so that the Cascade is visually distinct from a single removal.
10. As a player, I want a longer Cascade to stack one detonation per removed line, so that bigger bursts stay readable as more lines leaving at once.
11. As a player, I want overlapping detonations from a fast follow-up clear to be allowed, so that I am not blocked from seeing the next bang.
12. As a player, I want Shot travel, countdown, miss stacking, and death to stay visually as they are, so that this pass is a removal bang rather than a new animation system.
13. As a player, I want a sound when I launch a Shot, so that tap, click, and key each confirm immediately.
14. As a player, I want a sound when a line is removed, so that the bang has weight even if I glance away from the gap.
15. As a player, I want a Cascade to layer that removal sound once per removed line, so that two lines leaving together sound bigger than one.
16. As a player, I want a sound when a Shot stacks into a Partial Line, so that a miss is audible as a mistake, not silence.
17. As a player, I want no miss sound when a Shot fills an empty slot, including the first Shot of a same-column gap pair, so that a fill is not punished as a collision.
18. As a player, I want a sound when I lose on the Death Line, so that game-over is marked before I read the overlay.
19. As a player, I want no music, so that the four cues stay the whole soundtrack for this pass.
20. As a player, I want those sounds to be short, so that they match the fraction-of-a-second bang and do not overlap into mud.
21. As a player, I want pause to silence sound and stop new cues, so that hiding the tab or opening the pause overlay does not keep banging.
22. As a player, I want in-flight explosions to freeze while paused, so that the overlay is not fighting a finishing animation.
23. As a player, I want resume to let a frozen explosion finish rather than replay missed sounds, so that pause is a hold, not a delayed dump of cues.
24. As a player, I want no launch sound during preparation, pause, or game-over, so that inputs that do not emit a Shot stay quiet.
25. As a player, I want Play again to drop leftover explosions and sounds, so that a new round does not inherit the previous death.
26. As a player, I want the first tap, click, or key of a round to be enough to unlock audio, so that browser autoplay does not swallow the cues.
27. As a player, I want several Shots resolving in one update to still play the right mix of fill, miss, and removal cues, so that rapid play does not collapse into one generic blip.
28. As a player, I want score to still jump the instant lines leave the public state, so that the bang never delays scoring.
29. As a player, I want Fall Speed, Frontline-up eligibility, gap-stay, and same-update Death Line saves to stay unchanged, so that feedback is paint and sound on the game I already know.
30. As a player, I want the explosion art to match the existing pixel TNT and stone blocks, so that the bang belongs on this board.
31. As a player, I want the four sounds to be distinct, so that launch, removal, miss, and death are recognizable without looking.
32. As a player, I want missing art or audio to skip that cue rather than blank the board, so that a failed load still lets me play with the rectangle fallback.
33. As a future art pass, I want to replace the explosion strip and sound files without changing the rules, so that presentation can be swapped in place.
34. As a developer, I want the game core contract left alone, so that existing shot, Cascade, and Death Line tests keep meaning the same thing.
35. As a developer, I want a pure cue reader over consecutive public states, so that we can test which bangs fire without asserting Canvas pixels or audio playback.
36. As a future duel client, I want none of this feedback inside the simulation, so that two cores given the same inputs still lockstep while each renderer plays its own bangs.

## Implementation Decisions

- Respect ADR-0002. Rules stay in the game core with no Canvas, React, or audio. Canvas draws public state plus short-lived presentation overlays. React keeps HUD, pause, and game-over.
- Respect ADR-0003. Removals still leave gaps. The explosion is paint in that gap, not occupancy, not gravity, not a delayed Frontline.
- Do not add a glossary term for the bang. The domain event remains line removal / Cascade. “Detonation” is presentation of that event, matching the core’s existing one-tick-then-remove behavior.
- Do not change `advanceGame`, `launchBlock`, scoring, spawn, Fall Speed, or serializable game state. No presentation event list on the core.
- Add a pure cue reader in the UI layer. It is the only new test seam. Given previous public state, next public state, it returns the detonations to spawn and the sounds to start. Call it after a successful `launchBlock` and after `advanceGame`.
- Cue shape (decision, not a required literal name):

```ts
{
  detonations: { y: number; cells: readonly Cell[] }[]
  sounds: readonly ('launch' | 'detonate' | 'miss' | 'death')[]
}
```

- Shot launch: `sounds` includes `launch` when the next state has a new Shot that the previous state did not (the playing-phase launch command). Preparation, pause, and game-over launches are no-ops today and must produce no cue.
- Line removal: a detonation per row id present previously and absent next, using that row’s last `y` and `cells`. Each detonation also contributes one `detonate` sound. A Cascade is several such rows in the same tick. Do not spawn detonations on the one-tick filled hold, only when the rows actually leave.
- Miss: `sounds` includes `miss` once per consumed Shot that stacked TNT under an occupied Frontline cell (new Partial Line or an existing one below). A consumed Shot that filled a previously empty slot is not a miss, including the higher fill of a same-column gap pair.
- Death: `sounds` includes `death` when phase becomes `game-over`. Do not repeat it on later paused-looking frames; game-over already stops the sim.
- Several Shots may resolve in one `advanceGame` tick. Emit every matching cue for that tick; do not collapse them into a single generic event.
- Canvas keeps a short overlay list of active detonations. Each plays a cell-sized explosion strip on every occupied cell of that row, lasts about 200ms of playing-phase time, and stays pinned at the recorded `y`. It does not move with Fall Speed.
- While phase is `paused`, do not start new cues, silence SFX, and freeze overlay progress. Resume continues remaining overlay time. A new round (new Canvas mount / play again) drops overlays and sounds.
- Produce new pixel-art explosion frames sized to one cell (same 90×45 block footprint as today’s sprites), in the existing TNT/stone pixel look, plus four short sound files: launch, detonate, miss, death. Load them beside today’s sprites. Files are replaceable without rule changes.
- Unlock audio on the first real user gesture (pointer or key that already launches). Do not add a mute control in this pass.
- If explosion frames or a sound file fail to load, skip that cue. Block rectangle fallback stays as it is.
- Do not introduce a game engine, WebGL, a particle system, or synthesized oscillators as the shipped source of these cues. Files are the source; Canvas 2D draws the frames.

## Testing Decisions

- Prefer one seam: the pure cue reader. Tests pass two public game states (built with the existing game-core commands, or with the same public row/shot/phase literals the core tests already use) and assert the returned detonations and sounds. Observe row ids, `y`, cells, shot identity, score, and phase — not Canvas pixels, not audio playback, not overlay timers.
- Do not add a second seam in the game core. Do not extend core tests except that the existing suite must keep passing unchanged: one-tick hold, Frontline-up, Cascade scoring, gap-stay, miss stacking, Death Line save.
- Do not assert private overlay collection shape beyond what the cue reader returns. Do not test PNG/WAV bytes.
- Prior art: `game-core` tests drive `createGame` / `startGame` / `launchBlock` / `advanceGame` and read public rows. Cue tests should reuse that style to obtain before/after snapshots, then assert the reader, not re-specify the rules.
- New tests must cover, as public cue behavior:
  - Successful Shot launch emits `launch`; a launch no-op (not playing) emits nothing.
  - A fill that does not yet remove a line emits no detonation and no `miss`.
  - After the one-tick hold, a single removed line emits one detonation at that row’s last `y` and one `detonate`.
  - A two-line Cascade emits two detonations (stacked `y` values from the previous rows) and two `detonate` sounds, with score still three from the core.
  - A miss that creates or extends a Partial Line emits `miss` and no detonation.
  - Filling the higher line of a same-column gap pair emits no `miss`.
  - Phase change to `game-over` emits `death`.
  - Pause snapshots that do not change public state emit no cues.

## Out of Scope

- Changing removal timing, occupancy during the bang, Frontline-up order, gap-stay, scoring, Fall Speed, Shot speed, or Death Line rules.
- Core presentation events, or any new field on serializable game state for overlays or audio.
- Animations for Shot travel, miss stacking, countdown, death, HUD score pops, or idle blocks.
- Music, mute toggle, volume slider, spatial audio, or different sounds per column.
- A particle engine, WebGL, a game engine, or synthesized-in-code SFX as the shipped cue source.
- Final cinematic art, a full asset pipeline, sprite-sheet packing tools, or replacing existing block sprites.
- Network play, rollback, or making bangs part of a synced simulation.

## Further Notes

- The originating v1 spec deferred audio, particles, and complex animation. This spec is the deliberate exception for a short removal bang and four file-based cues, still confined to the renderer.
- ADR-0002 remains in force: if the miss-vs-fill diff ever proves too brittle, a later spec may add a narrow core event list. Do not do that here.
- Domain language lives in `CONTEXT.md`. Do not introduce explosion, combo, projectile, or bottom-row as rule terms.
