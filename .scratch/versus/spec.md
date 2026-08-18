# Versus

Status: ready-for-agent

## Problem Statement

Gapfall is a local infinite Round. The player can only compete against the Fall Speed ramp and their own high score. There is no way to compete with another person in real time, and the Main Menu’s only play action dumps them into that single local mode.

## Solution

Rename today’s Play to **Single Player** and add **Versus** on the Main Menu. Versus public-queues two anonymous players into a 1v1 Match. Each sees only their own board. Fall Speed holds at Base Fall Speed; there is no score. Each line a player removes instantly stacks an extra Generated Line packed above the opponent’s current top (a Cascade sends one per line). The last survivor wins. The Match room is the authority for death order and forfeits. After the Match ends: Rematch (hidden if the opponent is gone), Play again (requeue), or Main Menu.

## User Stories

1. As a player, I want the Main Menu action that starts today’s Round to be Single Player, so that I know it is the local infinite mode and not the only way to play.
2. As a player, I want a Versus action on the Main Menu, so that I can compete with another person without hunting through Settings.
3. As a player, I want the Main Menu to still show the local high score, so that my Single Player record is visible before I choose a mode.
4. As a player, I want Settings and Instructions to stay on the Main Menu, so that Versus does not bury mute or how-to-play.
5. As a player, I want Versus to search a public random queue, so that I do not need an account, a friend code, or a private lobby.
6. As a player, I want a Matchmaking loading state after I choose Versus, so that I can tell the app is searching for an opponent.
7. As a player, I want to cancel Matchmaking and return to the Main Menu, so that I am not trapped on the loading state.
8. As a player, I want Matchmaking to wait until an opponent appears, so that an empty queue is not a fake timeout.
9. As a player, I want the first other person in the queue to become my opponent, so that pairing is a two-person Match.
10. As a player, I want both of us to enter preparation together after pairing, so that Versus still has the three-second countdown I already know.
11. As a player, I want to see only my own board during Versus, so that I play the stream in front of me rather than a spectator layout.
12. As a player, I want Versus Fall Speed to stay at Base Fall Speed for the whole Round, so that pressure comes from sent Generated Lines, not a ramp.
13. As a player, I want Versus to have no score and no high-score update, so that survival is the only contest.
14. As a player, I want the Versus HUD to hide points, so that I am not playing a scored Round by accident.
15. As a player, I want each line I remove to send one extra Generated Line to the opponent, so that clearing my board is also attacking theirs.
16. As a player, I want a Cascade to send one extra Generated Line per removed line, so that a two-line Cascade sends two.
17. As a player, I want those extra Generated Lines to stack packed above my opponent’s current top immediately, so that their pipeline grows without shoving existing rows toward the Death Line.
18. As a player, I want a sent Generated Line to be a real Generated Line (3+1, same empty-slot cap, same chance to be Reinforced), so that I am not inventing a second line type.
19. As a player, I want Partial Lines to stay my own misses, so that sent pressure is never a garbage row from a Shot.
20. As a player, I want my empty-slot sequence to be independent of the opponent’s, so that we are not playing the same stream.
21. As a player, I want Frontline-up removal, gaps that remain, Shots, and the Death Line to work as they do in Single Player, so that Versus is the same board under extra stream.
22. As a player, I want Versus not to pause on Esc or tab blur, so that leaving the tab is not a freeze exploit.
23. As a player, I want Esc during Versus play to do nothing, so that I do not forfeit or pause by habit from Single Player.
24. As a player, I want Settings to stay unreachable during a Versus Round, so that there is no pause-shaped overlay in the middle of a Match.
25. As a player, I want an obvious way to abandon to the Main Menu during Versus, so that I can leave without closing the tab.
26. As a player, I want abandoning mid-Round to count as my forfeit, so that the opponent still gets a win.
27. As a player, I want closing the tab or dropping the connection mid-Round to count as my forfeit, so that a disconnect is not a stall.
28. As a player, I want to win when the opponent forfeits, so that “whoever survives most” still has a winner if they leave.
29. As a player, I want to win when the opponent hits the Death Line while I am still alive, so that last survivor is readable.
30. As a player, I want to lose when I hit the Death Line first, so that my own Death Line still ends my chance.
31. As a player, I want the Match room — not my client — to decide who died first, so that two Death Lines at the same moment are not a lag argument.
32. As a player, I want Versus game-over to wait for that Match outcome before it names a winner, so that a local Death Line is not shown as a loss if the opponent’s death arrived first.
33. As a player, I want Versus game-over to say clearly whether I won or lost, so that I do not have to infer it from a missing score.
34. As a player, I want Versus game-over to explain a forfeit win, so that “they left” is distinct from “they hit the Death Line.”
35. As a player, I want Versus game-over to offer Rematch, Play again, and Main Menu, so that the next action is one tap.
36. As a player, I want Rematch to start a new Versus Round with the same opponent when they also choose Rematch, so that a good Match can continue.
37. As a player, I want Rematch hidden when the opponent is already gone, so that I am not waiting on a person who left.
38. As a player, I want Play again to re-enter Matchmaking, so that “again” means a new opponent from the public queue.
39. As a player, I want Main Menu from Versus game-over to return home without forfeiting, so that leaving after the Match has ended is just leaving.
40. As a player, I want Single Player to keep the Fall Speed ramp, score, Cascades-as-points, pause, Settings-from-pause, and local high score, so that Versus does not rewrite the mode I already play.
41. As a player, I want Single Player game-over to stay Play again and Main Menu with points and recorde, so that the local Round still ends the way it does today.
42. As a keyboard player, I want `A` `S` `K` `L` and column taps to still launch Shots in Versus, so that the launcher does not change.
43. As a player, I want mute and volume from Settings on the Main Menu to still apply in Versus, so that I do not need a mid-Match Settings path.
44. As a player using two local tabs, I want each tab to count as a player in the public queue, so that I can exercise Versus without a second device.
45. As a developer, I want the game core to stay free of network, React, and Canvas, so that Versus does not violate ADR-0002.
46. As a developer, I want two independent cores plus an “apply N extra Generated Lines” command, so that the server referees outcome rather than simulating both boards.
47. As a developer, I want Matchmaking and the death referee to live in PartyKit rooms on Cloudflare Durable Objects, so that pairing and death order have a unique process, not a pub/sub bus.
48. As a developer, I want a pure Match referee that PartyServer calls, so that queue, forfeit, rematch, and death-order can be tested without Cloudflare or a browser.

## Implementation Decisions

- Respect ADR-0001: Single Player keeps the Fall Speed ramp and code knobs. Versus does not expose those knobs. Freeze Versus Fall Speed by creating the Round with `speedCapMultiplier: 1` so cap equals Base Fall Speed (do not set Ramp Duration to zero).
- Respect ADR-0002: the game core owns board rules and commands only. React owns screens, HUD, input, Matchmaking UI, and the socket. Canvas draws public state. The core must not import WebSocket, PartySocket, or fetch.
- Respect ADR-0003: extra Generated Lines do not collapse the board. They stack; they do not shove existing rows toward the Death Line.
- Domain language from `CONTEXT.md`: **Single Player**, **Versus**, **Opponent**, **Matchmaking**, **Match**, **Generated Line**, **Cascade**, **Fall Speed**, **Base Fall Speed**, **Main Menu**, **Round**, **Death Line**. Do not ship Multiplayer, enemy, or Duel as product names.
- Main Menu copy (Portuguese, matching existing overlays): today’s **Jogar** becomes **Um jogador**; add **Versus**; keep **Configurações**, **Instruções**, **recorde**, and the credit. High score remains the Single Player recorde.
- Shell: keep Single Player on the existing Play intent (now the Um jogador action). Add a Versus intent that enters a Matchmaking mode/screen, not a Round. Cancel Matchmaking (Voltar / Esc) returns to the Main Menu and closes the queue socket. Pairing starts a Versus Round (`start` / remount with Versus Fall Speed config).
- Matchmaking UI: a simple loading state (Portuguese along the lines of “Procurando oponente…”) with Voltar. No estimated wait, no timeout copy. Wait indefinitely.
- After the Match room broadcasts begin, each client mounts its own Round in `preparing` for the existing three seconds, then `playing`. Preparation is local and identical in duration, not a lockstep server clock.
- Versus HUD is board-only: no score, no opponent-alive meter, no lines-sent counter. Single Player HUD is unchanged.
- Versus never writes the local high score. Score may still exist on core state; the Versus HUD and Versus game-over must not show it, and a Versus Round must not update recorde.
- Two independent cores. Empty-slot RNG is local `Math.random` (injectable in tests). The network message is a small JSON **lines-removed count** `N`, not a board snapshot. The receiving core applies an explicit command: stack `N` extra Generated Lines packed above the current topmost row (minimum `y`), using the same Generated Line factory as cadence spawn (3+1, two-in-a-row gap cap, 15% Reinforced). Cadence spawn stays locked to Fall Speed; if a cadence spawn would occupy the same `y` band as an extra line, it stacks packed above that stack so two Generated Lines never share a `y`.
- Advancing the simulation must report how many lines were removed that tick (Cascade size in lines, not score). The shell sends that `N` to the Match room when `N > 0`. Do not infer `N` from score (a two-line Cascade is not worth two points).
- Hosting (from [Where Versus matchmaking and the death referee live](issues/01-versus-hosting.md)): **PartyKit room model on Cloudflare Durable Objects** (`partyserver` + WebSockets). A singleton `queue` party (well-known room, e.g. `public`) holds waiting sockets and, when two are present, mints a Match id and tells both to connect to a `match` party. The `match` party accepts exactly two connections, relays lines-removed, serializes death reports, and treats `onClose` during a live Round as a forfeit. Persist the declared outcome to room storage before broadcasting it. Hibernation stays off on Match rooms. During a Match, disable PartySocket’s default infinite reconnect (`maxRetries: 0` or equivalent) so a blip is a forfeit, not a ghost reconnect.
- Who declares the winner: only the Match room. Clients report “I hit the Death Line.” The first death report is the loser; the other player wins. A later death report is ignored. Disconnect / abandon before outcome is a forfeit for that connection. Clients must not show Versus game-over until they receive the room’s outcome (win / loss, Death Line or forfeit). When outcome arrives, stop the local Round even if that client is still in `playing`.
- Versus cannot pause: Esc during Versus `preparing` / `playing` is a no-op (no pause effect). Tab blur does not pause and does not show the pause overlay; the board keeps simulating. Settings cannot open from a Versus Round. Single Player Esc / blur / Settings-from-pause stay as today.
- Deliberate leave besides closing the tab: a **Menu principal** (abandon) control available during Versus play — same Portuguese as today’s pause abandon, but it is not a pause overlay. Mid-Round abandon closes the Match socket (forfeit) and returns to the Main Menu. Game-over **Menu principal** only leaves; the Match has already ended.
- Versus game-over (Portuguese): a clear win or loss line (`Você venceu` / `Você perdeu`); forfeit win also readable as the opponent leaving. No points, no recorde. Actions: **Revanche**, **Jogar novamente**, **Menu principal**. Hide **Revanche** when the opponent’s socket is gone. **Revanche** waits on the same Match room until both opt in, then a new Versus Round (preparation again). If the opponent leaves while one player is waiting on Rematch, hide Rematch and leave Play again / Main Menu. **Jogar novamente** leaves the Match room and re-enters the public queue (same Matchmaking loading as the Versus button).
- Instructions are unchanged this pass (still Single Player rules, including pause). Versus is not documented there yet.
- Do not add accounts, Auth, invite codes, a second board, Versus score, or a pause overlay for Versus.
- Do not write a new ADR for independent cores: that split is ADR-0002 applied to Versus (React owns the socket; the core stays a local simulation; the server referees outcome, not the board).

## Testing Decisions

Three seams, all pure functions. Do not test DOM, Canvas pixels, real WebSockets, PartyKit, Wrangler, or `localStorage`.

1. **Game core (existing, highest for board rules).** Drive `createGame` / `startGame` / `launchBlock` / `advanceGame` plus the new extra-Generated-Line command. Observe public rows, phase, Fall Speed behavior, and removed-line count. Prior art: `game-core.test.ts`. Cover at least:
   - Versus config (`speedCapMultiplier: 1`) holds Base Fall Speed over long Playing Time; Single Player default still ramps.
   - Extra Generated Lines stack packed above the current top; they are 3+1; they respect the gap cap and can be Reinforced.
   - `N` extras stack `N` rows; a two-line Cascade reports removed count `2` (not score `3`).
   - Cadence spawn does not occupy the same `y` as an extra line.
   - Frontline-up, gaps remaining, Death Line, and pause helpers are unchanged when no extra lines are applied.
   - Existing core tests keep passing.

2. **App-shell navigator (existing, highest for screens).** Extend `reduceShell` with Versus / Matchmaking / Rematch / Play-again-requeue / Versus Esc / abandon-forfeit intents. Prior art: `app-shell.test.ts`. Cover at least:
   - Boot Main Menu; Um jogador still `start`s a Single Player Round (pause-capable).
   - Versus enters Matchmaking; cancel / Esc returns to Main Menu without `start`.
   - Pairing `start`s a Versus Round; Esc during Versus preparing/playing is no-op (no pause effect); Settings from Versus play is no-op.
   - Versus game-over: Rematch present when opponent still there; Rematch absent when gone; Play again returns to Matchmaking; Main Menu returns home.
   - Mid-Round abandon from Versus returns to Main Menu (socket close is the adapter’s job; the navigator just leaves).
   - Single Player Esc pause/resume, Settings-from-pause, and Play again remount stay intact.

3. **Match referee (new, highest for queue / outcome).** A pure reducer: Match/queue state + event → next state + messages to clients. PartyServer is a thin adapter around this seam, not a test target. Cover at least:
   - One waiter stays queued; a second waiter pairs and both are told the Match id.
   - Cancel/close while queued removes that waiter without pairing.
   - Lines-removed from player A is relayed to player B only.
   - First death report loses; second is ignored; remaining player wins.
   - `onClose` during a live Match forfeits that player; remaining player wins.
   - Close after outcome is not a second forfeit.
   - Rematch: both votes start a new Round on the same Match; one vote plus a close makes Rematch unavailable.
   - Outcome is idempotent if the same events are applied twice (storage-shaped state, not RAM-only flags).

Good tests observe external behavior: public game state, shell state + Round effects, and referee outcomes/messages — not Durable Object internals, PartySocket reconnect timers, or overlay CSS.

Optional: a tiny message codec test (encode/decode the JSON events) if it keeps parsing out of React. It is not a fourth product seam.

## Out of Scope

- Three or more players; seeing the opponent’s board; invite codes / private matches; accounts; friends; ranked ladder; spectating.
- Pause in Versus; Versus score or Versus high score.
- Changing Single Player’s Fall Speed ramp, scoring, pause, or game-over.
- Client-side prediction or interpolation of opponent clears (sent lines apply when the Match room’s event arrives).
- Rewriting Instructions for Versus.
- Anti-cheat / proving a client really removed `N` lines.
- Hibernating Match rooms; managed `*.partykit.dev` as the named deploy target (the spec names the room model on the project’s Cloudflare account).

## Further Notes

- Map: [`.scratch/versus/map.md`](map.md). Hosting research: [`.scratch/versus/research/hosting.md`](research/hosting.md) on `research/versus-hosting`, summarized in [Where Versus matchmaking and the death referee live](issues/01-versus-hosting.md).
- Open grilling/prototype tickets were not HITL-resolved. This spec takes their recommended answers: shared three-second preparation; sent lines use the cadence reinforce roll; board-only HUD; independent RNG; Um jogador / Versus labels; indefinite queue with Voltar; Esc no-op in Versus play; Settings Main Menu only during Versus; abandon-to-menu is the deliberate forfeit; Versus game-over is win/loss copy without a visual prototype.
- Fog left out of this spec: latency “feel” beyond apply-on-receipt; whether Instructions should mention Versus later.
- Local exercise: two tabs into the public queue are two players (including a self-Match). That is the supported development setup.
