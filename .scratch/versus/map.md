# Versus

## Destination

A spec (plus any glossary or ADR updates it needs) that a later session can implement: today’s Play becomes Single Player; the Main Menu gains Versus, which public-queues into a 1v1 Round — own board only, Base Fall Speed held constant, no score, one extra Generated Line stacked packed above the opponent’s current top per line you remove (a Cascade sends one per line), last survivor wins with the server’s death-order as same-moment tie-break. Death offers Rematch (hidden if the opponent is gone), Play again (requeue), and Main Menu. Disconnect is a forfeit. Versus cannot pause.

## Notes

Domain: Gapfall. Every session should consult `CONTEXT.md`, `/grilling`, `/domain-modeling`, [ADR-0001](../../docs/adr/0001-linear-fall-speed-ramp.md) (Single Player ramp stays), and [ADR-0002](../../docs/adr/0002-core-canvas-react-split.md) (network stays out of the game core).

This map is planning: tickets resolve decisions; the destination is the spec, not the shipped feature. Do not implement Versus here.

Standing locks — do not re-grill:

- 1v1 only; public random queue; cancel search implied
- Names: Single Player, Versus, opponent (not multiplayer / enemy / duel-as-button)
- Own board only; the sent thing is a Generated Line stacked packed above the opponent’s current top, not Tetris-style garbage
- Versus cannot pause; leaving or disconnecting is a forfeit — the remaining player wins
- Score is off in Versus and on in Single Player; the Main Menu high score stays
- Rematch is the same opponent when both opt in; hidden if they already left
- Play again re-enters the public queue

## Decisions so far

- [Where Versus matchmaking and the death referee live](issues/01-versus-hosting.md) — PartyKit rooms on Cloudflare Durable Objects: a `queue` party pairs two anonymous sockets; a `match` party relays line-removed events and is the death/forfeit referee.
- [Write the Versus spec](issues/07-write-versus-spec.md) — [`.scratch/versus/spec.md`](spec.md) is ready-for-agent.
- [Game core Versus primitives](issues/08-game-core-versus-primitives.md) — `stackExtraGeneratedLines` packs extra Generated Lines above the current top; `advanceGame` reports per-tick `linesRemoved`; Versus Fall Speed is `speedCapMultiplier: 1`.
- [Match referee](issues/09-match-referee.md) — pure `reduceQueue` / `reduceMatch` pair waiters, relay lines-removed, declare Death Line / forfeit, and handle Rematch votes without PartyKit.
- [Um jogador on the Main Menu](issues/10-um-jogador-main-menu.md) — Main Menu local play is **Um jogador**; it still `start`s today’s Single Player Round.
- [Versus Round (solo)](issues/11-versus-round-solo.md) — Main Menu **Versus** starts a local Versus Round at Base Fall Speed: no score, no recorde, no pause, **Menu principal** to leave.
- [Matchmaking shell](issues/12-matchmaking-shell.md) — Versus enters Matchmaking (“Procurando oponente…”, Voltar/Esc home); a `paired` intent starts the Versus Round.
- [Two-tab Match](issues/13-two-tab-match.md) — PartyServer `queue`/`match` rooms pair two tabs; React owns PartySocket; extra Match seats are rejected; Match sockets do not reconnect.

## Not yet specified

- Latency feel: what “instantly” means on a slow connection
- Whether Instructions mention Versus
- How two clients are tested in development (research notes two tabs into the public queue is a self-Match; whether that is the supported local setup is still open)

## Out of scope

- Three or more players
- Seeing the opponent’s board
- Invite codes / private matches
- Pause in Versus
- Versus score or Versus high score
- Changing Single Player’s Fall Speed ramp or scoring
- Accounts, friends, ranked ladder, spectating
