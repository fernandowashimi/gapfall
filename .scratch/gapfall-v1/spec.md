# Gapfall v1

This is the originating product definition, relocated from the root `GAME_SPEC.md`. It is historical. New work belongs in its own `.scratch/<feature>/spec.md`. Domain language lives in `CONTEXT.md`. Hard-to-reverse decisions live in `docs/adr/`.

## Problem Statement

The player needs a browser arcade game, optimized for a portrait phone screen, that mixes fast reaction with spatial planning. Lines of blocks descend continuously on a four-column grid. Each line has an empty slot the player must fill by launching blocks upward before any block reaches the Death Line. A Shot in the wrong column creates more blocks to resolve, so mistakes add pressure instead of being ignored.

## Solution

Ship a first playable version that is infinite and local. The board is drawn on a Canvas 2D surface inside a React app. The player launches Shots by touching or clicking a column, or with the keys `A`, `S`, `K`, and `L`. Fall Speed climbs linearly with Playing Time until the Speed Cap; Generated Lines spawn as a Continuous Stream with no vertical gap.

The game resolves from the Frontline upward: a filled line is removed only when every line below it is already resolved. That is what makes the special two-line pattern work — consecutive Generated Lines with the empty slot in the same column. The first Shot fills the second line without removing it; the second Shot clears both in a Cascade. Removed lines leave gaps; the board does not collapse.

## User Stories

1. As a player, I want to start a round on a portrait phone screen, so that I can play without a desktop layout stretched onto a handset.
2. As a player, I want a three-second countdown before the fall begins, so that I can read the opening board and get ready.
3. As a player, I want to see four-column lines descending continuously, so that the main threat is obvious at a glance.
4. As a player, I want every new Generated Line to have exactly three blocks and one empty slot, so that each line presents a clear target.
5. As a player, I want Generated Lines to spawn packed vertically, so that the threat is a Continuous Stream.
6. As a player, I want the empty slot to appear at random among the four columns, so that decisions do not repeat.
7. As a player, I want the same column not to be empty on more than two consecutive Generated Lines, so that sequences do not become excessively repetitive.
8. As a player, I want to launch a Shot by touching or clicking anywhere in the chosen column, so that mouse and touch use the same gesture.
9. As a keyboard player, I want `A`, `S`, `K`, and `L` from left to right, so that I can launch into the four columns with low latency.
10. As a player, I want each tap, click, or physical key press to emit exactly one Shot, so that I have precise control with no auto-repeat while a key is held.
11. As a player, I want to launch with no cooldown and with several Shots in flight, so that I can answer visual pressure quickly.
12. As a player, I want to see Shots travel upward, so that the game keeps a sense of trajectory and reaction time.
13. As a player, I want a Shot in an empty column to be able to fill the matching line, so that I can remove threats.
14. As a player, I want a Shot into an occupied column to stack immediately below the collision, so that a wrong decision has a clear strategic cost.
15. As a player, I want to be able to complete Partial Lines created by my own misses, so that I can recover control of the round.
16. As a player, I want complete lines removed immediately when they become eligible, so that a correct play has instant feedback.
17. As a player, I want removal eligibility to respect Frontline-up order, so that a complete line above is not a shortcut while problems remain below.
18. As a player, I want two consecutive empty slots in the same column to be resolved by two Shots in that column, so that this pattern is a distinct micro-decision.
19. As a player, I want the second line of that pair to be able to stay filled until the Frontline is resolved, so that the Cascade is visually readable.
20. As a player, I want removals to leave gaps instead of pulling content down, so that trajectories and the Continuous Stream stay predictable.
21. As a player, I want every existing block to descend together at the current Fall Speed, so that the board state stays coherent.
22. As a player, I want a last-instant Shot to be able to save the round, so that a Shot and a loss on the same update feel fair.
23. As a player, I want to lose when any block still touches the Death Line after resolutions, so that the loss condition is unequivocal.
24. As a player, I want the score to rise for removed lines and for Cascades, so that efficient play has visible value.
25. As a player, I want a two-line Cascade to be worth three points, so that the consecutive-gap pattern has a clear reward.
26. As a player, I want an infinite round and a local high score, so that I can beat my own run without an artificial win condition.
27. As a player, I want the round to pause automatically when the tab is hidden or loses focus, so that I do not lose to a browser limitation.
28. As a player, I want to resume a paused round deliberately, so that Playing Time does not restart while I am unready.
29. As a future ranking client, I want a round result to be serializable, so that an API can record scores later.
30. As a future duel player, I want the rules simulable outside the interface, so that state can be synced over the network without depending on React or Canvas.
31. As the product team, I want to swap rectangles for sprites without rewriting the game rules, so that presentation can evolve safely.

## Implementation Decisions

- Respect ADR-0002. The core exposes serializable state and commands so remote ranking and real-time duel stay possible later.
- React owns screens, HUD, pause, game over, and future profile/ranking. React does not represent each block as a component and does not drive the frame loop by re-render.
- A native Canvas 2D surface draws the field, blocks, Shots, and, later, sprites. The loop uses `requestAnimationFrame`, cleaned up on unmount and on pause.
- The game uses a fixed logical resolution of 360 × 800, 20:9, scaled to the available area. The bottom band is reserved for the launcher and reference controls.
- The field has four columns of 90 px. Each block is 90 × 45 px — two blocks of width to one of height.
- Simulation is continuous in screen coordinates. Shot travel is twelve block-heights per second (540 px/s). Rendering may interpolate; simulation is the source of truth.
- Fall Speed follows ADR-0001 and `.scratch/fall-speed-progression/spec.md`: it starts at Base Fall Speed (one block-height per second), climbs linearly to a 3× Speed Cap over 60 seconds of Playing Time, then holds. Generated Line spawn stays locked to Fall Speed so the Continuous Stream never gaps. Shot speed stays constant. Those knobs live in code, not a player menu.
- The first Generated Line starts at the top and the round stays in preparation for three seconds. After that, Generated Lines are created at the top once per block-height of board travel, forming a Continuous Stream. Spawn cadence follows Fall Speed, not wall-clock seconds.
- Each Generated Line has four slots, three occupied and one empty. The empty slot is random and independent except for a cap of two consecutive occurrences in the same column.
- Each discrete input emits one Shot in the corresponding column. There is no cooldown, no cap on Shots in flight, and no repeat from holding a key.
- Clicks and touches in the playable area map to the column they hit. The keyboard maps `A`, `S`, `K`, `L` to columns 0 through 3, only during an active round.
- Domain language lives in `CONTEXT.md`. Do not introduce the synonyms listed there as _Avoid_.
- A Shot that hits an occupied column stacks immediately below the collision and becomes part of a Partial Line. A Shot that finds an empty slot follows Frontline-up resolution instead of freely clearing a higher line.
- Respect ADR-0003. When two consecutive lines have the empty slot in the same column, the first Shot in that column passes the Frontline and fills the second; the second waits. The next Shot fills the Frontline and removes both in a Cascade. Eligible complete lines are removed immediately.
- On each update, inputs, travel, collisions, fills, and Cascades are resolved before the Death Line is tested. The round ends if any block still reaches the Death Line after that resolution.
- Score is one point per removed line, plus one point for each extra line in the same Cascade. A two-line Cascade is therefore worth three points.
- The first version is infinite and persists a local high score. Losing focus or hiding the tab pauses the round and requires an explicit resume.

## Testing Decisions

- The main seam, and ideally the only seam for rules, is the public game-core API: create initial state, apply a Shot input, and advance the simulation by a time delta. Tests observe only publicly visible state and effects, not Canvas pixels or internal collection shape.
- The core is tested deterministically, with an injectable RNG or a controlled empty-slot sequence, so the two-repeat cap and collision scenarios do not flicker.
- There must be tests for the Continuous Stream, 3+1 Generated Line composition, empty-slot repeat cap, Fall Speed ramp, constant Shot speed, and column mapping.
- There must be behavior tests for Shots into empty slots, Shots into occupied slots, creating and filling Partial Lines, immediate eligible removal, and no collapse after removal.
- There must be specific tests for Frontline priority: a complete line above does not remove before the Frontline; on the equal-gap pair, the first Shot fills the second line without removing it and the second Shot clears both; a two-line Cascade scores three.
- There must be tests for update order at the Death Line, showing that a same-update removal can prevent loss, and that loss occurs when a block still sits on the Death Line after resolutions.
- There must be application integration tests for `A/S/K/L`, click/touch by column, no repeat on key hold, pause on visibility/focus, and the preparing / playing / paused / game-over transitions.
- The game core is the highest seam: most behavior should be covered there, with few tests coupled to the UI.

## Out of Scope

- Real-time multiplayer, matchmaking, network sync, rollback, and an authoritative server.
- Login, user profile, friends, remote ranking, and anti-cheat; the local high score is enough for this version.
- Final art, final sprites, audio, particles, complex animation, and an asset pipeline. The renderer must still be able to accept sprites later.
- A player-facing difficulty menu or chosen Speed Cap; ramp knobs live in code.
- Power-ups, extra block types, stage modes, campaigns, and a win condition.
- Migration to a game engine or a WebGL renderer. Canvas 2D is the initial choice.

## Further Notes

- Canvas 2D does not block visual evolution: sprites can replace rectangle drawing in the renderer without changing the core.
- Ranking and profile can be added as application services; a serializable core keeps those integrations from contaminating local rules.
- For future duels, the client should render core state, not be the authority for the rules. The exact network contract belongs in its own spec.
- Fall Speed (Playing Time, 3× Speed Cap, 60 s Ramp Duration, constant Shot speed) is owned by ADR-0001 and `.scratch/fall-speed-progression/spec.md`. This document must not be read as requiring constant Fall Speed.
