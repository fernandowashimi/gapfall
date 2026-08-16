# Main Menu and app shell

Status: ready-for-agent

## Problem Statement

The app boots straight into a Round. There is no Main Menu, no place for Settings or Instructions, and after death the only option is Play again. The player cannot mute or change volume, cannot quit a Round to a home screen, and cannot pause with Esc.

## Solution

Open on a Main Menu with Play, Settings, and Instructions. Settings is mute and volume only (persisted); Instructions is a static how-to-play screen. On death, offer Play again or Main Menu. Pause (blur/tab-away or Esc) can resume, open Settings, or abandon to the Main Menu. Settings returns to wherever it was opened from. Fall Speed and other Round rules stay out of Settings (ADR-0001).

## User Stories

1. As a player, I want the app to open on the Main Menu, so that Play is an explicit choice.
2. As a player, I want to see the Gapfall title on the Main Menu, so that I know what game I am in.
3. As a player, I want to see the local high score on the Main Menu, so that I know the record before I play.
4. As a player, I want a Play action on the Main Menu, so that I can start a Round.
5. As a player, I want a Settings action on the Main Menu, so that I can change sound without starting a Round.
6. As a player, I want an Instructions action on the Main Menu, so that I can learn controls and core rules before playing.
7. As a player, I want a “made by Shinji” credit on the Main Menu linking to https://github.com/fernandowashimi/gapfall, so that I can find the project source.
8. As a player, I want Play to start a new Round with the same preparation countdown as today, so that the opening beat is unchanged.
9. As a player, I want Instructions to be a static screen (controls and core rules), so that I am not dropped into a tutorial Round.
10. As a player, I want Instructions reachable only from the Main Menu, so that mid-Round UI stays lean.
11. As a player, I want Back or Esc on Instructions to return to the Main Menu, so that leaving help is obvious.
12. As a player, I want Settings to control mute and volume only, so that high scores stay comparable (no Fall Speed knobs).
13. As a player, I want mute and volume to persist across visits, so that my preference survives a refresh.
14. As a player, I want Settings reachable from the Main Menu and from pause, so that I can mute during a Round.
15. As a player, I want leaving Settings to return to the caller (Main Menu or still-paused Round), so that opening Settings does not abandon the Round.
16. As a player, I want Esc on Settings to close Settings like Back, so that keyboard and button agree.
17. As a player, I want Esc on the Main Menu to do nothing, so that I do not accidentally leave or pause a screen that has no Round.
18. As a player, I want Esc during preparation or playing to pause the Round, so that I can interrupt without tabbing away.
19. As a player, I want Esc while paused (no Settings open) to resume, so that Esc toggles pause.
20. As a player, I want blur / tab-away to keep pausing as today, so that leaving the tab still holds the Round.
21. As a player, I want the pause overlay to offer resume, Settings, and Main Menu, so that I can continue, mute, or abandon.
22. As a player, I want choosing Main Menu from pause to abandon the Round and show the Main Menu, so that I can quit without dying.
23. As a player, I want game-over to offer Play again and Main Menu, so that I can retry or leave after the Death Line.
24. As a player, I want Play again to start a new Round immediately without the Main Menu, so that retry is one action.
25. As a player, I want Play again to match a fresh Play (including preparation), so that retry feels like a new attempt.
26. As a player, I want game-over to still show score and high score, so that the end of a Round stays readable.
27. As a player, I want pause silence to remain separate from Settings mute, so that resume does not unmute a muted preference.
28. As a player, I want Round rules, Fall Speed, scoring, and core phases left unchanged, so that this pass is shell and audio prefs only.
29. As a developer, I want no `main-menu` phase in the game core, so that the Main Menu stays outside an active Round (ADR-0002).
30. As a developer, I want a pure app-shell navigator as the test seam, so that screen transitions can be asserted without DOM or Canvas.

## Implementation Decisions

- Respect ADR-0001: Settings never exposes Fall Speed, Ramp Duration, Speed Cap, or other rule knobs.
- Respect ADR-0002: game core stays free of React/Canvas/audio; React owns screens, HUD, overlays, and input wiring. Do not add a core phase for the Main Menu.
- Core phases remain `preparing` | `playing` | `paused` | `game-over`. A Round is mounted only while the shell mode is in-Round (including when Settings was opened from pause).
- Add a pure app-shell navigator in the UI layer as the only new behavioral test seam. Given current shell state + intent (+ Round phase when needed for Esc), return next shell state and any Round effect (`start`, `remount`, `pause`, `resume`, `none`).
- Shell screens: Main Menu, Instructions, Settings, in-Round. Pause and game-over remain overlays driven by core phase while in-Round (plus Settings stacked above pause when opened from pause).
- Esc mapping: Main Menu → no-op; Instructions → Main Menu; Settings → return to caller; preparing/playing → pause effect; paused with no Settings → resume effect; game-over → no-op.
- Persist mute and volume (e.g. localStorage keys alongside the existing high score). Default first visit: unmuted, a sane mid/high volume. Pure parse/serialize helpers may support the navigator/audio wiring; they are not a second product seam.
- Extend game audio so pause `silence` / `unsilence` is a temporary suppress distinct from user mute; `play` respects user mute and volume.
- Main Menu credit: “made by Shinji” linking to `https://github.com/fernandowashimi/gapfall`.
- Keep existing Portuguese overlay copy style unless a screen has no prior string; Instructions may use clear Portuguese matching the current UI.
- Unmount or otherwise fully drop the Round when returning to the Main Menu so Play / Play again does not inherit prior detonations or audio state (same spirit as today’s remount-on-play-again).

## Testing Decisions

- Prefer one seam: the pure app-shell navigator. Tests assert transitions and Round effects from intents — not DOM, Canvas pixels, or real `localStorage` I/O.
- Do not add game-core tests for menu flow. Existing core suite must keep passing unchanged.
- Optional tiny pure prefs parse/serialize tests are allowed if they keep persistence logic out of React; do not test the Audio element graph.
- Prior art: `cues.test.ts` — pure function over public inputs/outputs.
- Cover at least: boot Main Menu; Play starts Round; Instructions open/close/Esc; Settings from Main Menu and from pause with return-to-caller; Esc pause/resume toggle; abandon to Main Menu; Play again remounts Round; Esc no-op on Main Menu and game-over.

## Out of Scope

- Fall Speed or difficulty Settings; separate practice mode or scoreboard split.
- Tutorial Round, first-run forced Instructions, or in-Round tips.
- Music, new SFX, or changing cue rules from the removal-feedback pass.
- Changing Death Line, Fall Speed ramp, scoring, or other core rules.
- Online features, accounts, or remote settings sync.

## Further Notes

- Domain terms: Main Menu, Settings, Instructions, Round — see `CONTEXT.md`.
- Grilling locked Esc stacking, return-to-caller, and audio-only Settings before this spec.
