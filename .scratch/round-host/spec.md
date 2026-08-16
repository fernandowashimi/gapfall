# Round module

Status: ready-for-agent

## Problem Statement

A Round’s brain lives inside the Canvas mount: the clock, Shot launches, pause from Esc and from blur, silence, cue application, and detonation aging. The shell talks to that mount through incrementing pause/resume counters and a remount key. Pause policy is duplicated. None of that is testable without DOM or RAF. The player-facing Round is fine; the architecture is not.

## Solution

Give the Round a small command interface in the UI layer: create, tick, launch, pause, resume. Each command returns the next session plus sounds and an audio gate. The app owns the session. The Canvas only supplies the clock, pointer/key columns, drawing, and playing what the Round returned. Player-visible rules, overlays, and feedback stay as they are today.

## User Stories

1. As a player, I want Play to start a Round with the same preparation countdown as today, so that extracting a Round module does not change the opening beat.
2. As a player, I want generated lines, Shots, Fall Speed, Frontline-up Cascades, and the Death Line to behave as they do now, so that this pass is architecture, not a rules change.
3. As a player, I want A/S/K/L and taps on columns to launch Shots the same way, so that controls do not move.
4. As a player, I want the HUD score to update when lines are removed, so that the score still tracks the Round.
5. As a player, I want pause (Esc) to freeze the board, silence SFX, and freeze in-flight detonations, so that pause still holds the Round.
6. As a player, I want Esc while paused (no Settings) to resume board, audio, and detonations, so that Esc still toggles pause.
7. As a player, I want blur / tab-away to pause the Round as today, so that leaving the tab still holds play.
8. As a player, I want opening Settings from pause to leave the Round paused when I close Settings, so that Settings is not a resume.
9. As a player, I want resume from the pause overlay to continue the same Round, so that I do not lose Playing Time or board position.
10. As a player, I want abandoning to the Main Menu to drop the Round (no leftover detonations or pause-silence), so that the next Play is clean.
11. As a player, I want Play again after the Death Line to start a fresh Round, so that retry does not inherit the previous session.
12. As a player, I want launch, detonate, miss, and death sounds to still fire from the same cue rules, so that feedback does not drift.
13. As a player, I want pause silence to stay distinct from Settings mute, so that resume does not unmute a muted preference.
14. As a player, I want detonations to finish after resume rather than dump missed cues, so that pause remains a hold.
15. As a player, I want no launch sound during preparation, pause, or game-over, so that inputs that do not emit a Shot stay quiet.
16. As a player, I want the pause and game-over overlays to still appear from Round phase, so that the shell overlays keep working.
17. As a player, I want high score on the Main Menu to keep updating from Round score, so that persistence is untouched.
18. As a developer, I want one Round module behind create / tick / launch / pause / resume, so that Round policy is not trapped in a Canvas component.
19. As a developer, I want that module to return sounds and an audio gate instead of calling the audio adapter, so that tests assert results, not playback.
20. As a developer, I want the app to own the Round session, so that shell effects can pause, resume, and replace the Round without counter props.
21. As a developer, I want start and remount to replace the session rather than remount the Canvas by key, so that sprites and the clock adapter survive a new Round.
22. As a developer, I want the Canvas to stay a clock / input / draw / play adapter, so that React still owns screens and HUD (ADR-0002).
23. As a developer, I want React state to mirror only phase and score, so that the app is not a bag of full simulation state.
24. As a developer, I want blur and visibility to call pause on the Round module, so that pause authority is not a second implementation in the Canvas.
25. As a developer, I want `readCues` to remain the pure state-diff for which bangs fire, so that the Round module applies cues rather than reimplementing them.
26. As a developer, I want game-core commands left as the simulation seam, so that existing core tests keep meaning the same thing.
27. As a developer, I want the app-shell navigator left as the screen-transition seam, so that Main Menu / Esc overlay rules are not rewritten.
28. As a developer, I want Round tests to drive the command interface only, so that RAF, DOM, and Canvas pixels are not the test surface.
29. As a future change, I want pause, cue application, and detonation aging to concentrate in the Round module, so that a bug in any of those is fixed once.

## Implementation Decisions

- Respect ADR-0002: game core stays free of React, Canvas, and audio. The Round module lives in the UI layer because it applies cue diffs and detonation aging (presentation). Do not fold Main Menu into a core phase.
- Respect ADR-0001 and ADR-0003: do not change Fall Speed, Frontline-up removal, or gap-stay.
- Do not add a glossary term. This module *is* Round (`CONTEXT.md`).
- New Round module in the UI layer, tested through its command interface. Shape (from grilling, not required literal names):

```
session = { game, detonations }
audioGate = 'silence' | 'unsilence' | 'unchanged'
result = { session, sounds, audioGate }

createRound(...)
tickRound(session, dt) → result
launchRound(session, column) → result
pauseRound(session) → result
resumeRound(session) → result
```

- `game` is still the core `GameState`. Commands call existing `createGame` / `advanceGame` / `launchBlock` / `pauseGame` / `resumeGame`.
- `sounds` come from `readCues` after a successful launch and after advance, matching today’s Canvas apply-cues timing. Do not call the audio adapter from the Round module.
- `audioGate` carries pause-silence policy: pause → `silence`; resume → `unsilence`; otherwise `unchanged` unless the command itself transitions pause the same way tick already does. Abandon / leave-Round `unsilence` stays with the shell (not a Round command).
- Detonation aging and freeze-on-pause live in the Round module (advance detonations only while not paused). Cue emission stays in `readCues`.
- The app owns a session ref. Shell effects: `start` / `remount` → replace with `createRound()`; `pause` → `pauseRound`; `resume` → `resumeRound`. Drop `pauseRequest` / `resumeRequest` counters and the remount key.
- Canvas adapter: RAF supplies `dt` to `tickRound`; keys/pointer map to a column then `launchRound`; blur / `visibilitychange` call `pauseRound`; play `sounds` and apply `audioGate`; draw `session.game` plus detonations.
- React HUD/overlay state is `{ phase, score } | null`, updated when those fields change. Full simulation state does not live in React state.
- Sprite loading, drawing, `GameAudio` construction, high-score persistence, and overlay markup stay where they are aside from wiring.

## Testing Decisions

- One new seam: the Round module commands. Tests assert next session (phase, score, detonations still aging or frozen), `sounds`, and `audioGate` — not DOM, RAF, Canvas pixels, or real audio playback.
- Do not add game-core tests for this pass. Existing core, app-shell, cues, and audio-settings suites must keep passing.
- `readCues` stays its own seam; Round tests may use a real cue reader (integration through the Round interface) rather than stubbing cues.
- Prior art: `app-shell.test.ts` and `cues.test.ts` — pure commands over public inputs/outputs.
- Cover at least: create starts preparing; tick advances playing time / phase; launch while playing yields launch sound when a Shot appears; pause sets paused + `silence` and does not age detonations; resume sets playing + `unsilence` and lets detonations age; tick while paused does not advance the board; create/replace session has empty detonations; launch during preparation does not emit a Shot / launch sound.

## Out of Scope

- Narrowing the published core snapshot (spawn bookkeeping, gap streak, Fall Speed knobs).
- Sharing Frontline / Partial Line placement queries from core into cues.
- A second standalone detonation-timeline module besides what the Round session already holds.
- High-score persistence symmetry with audio-settings.
- Changing Death Line, Fall Speed, scoring, cue rules, sprites, or overlay copy.
- Splitting game-core into multiple files.
- Presentation event lists on the simulation.

## Further Notes

- Domain terms: Round, Shot, Fall Speed, Frontline, Cascade, Death Line, Main Menu, Settings — see `CONTEXT.md`.
- Architecture review candidate 1 (Round host) plus candidate 2 (pause authority) in one pass. Candidates 3–6 stay out.
- Grilling locked: ownership split, pure commands, return sounds + `audioGate`, app-owned session, UI-layer Round module, thin `{ phase, score }` React snapshot.
