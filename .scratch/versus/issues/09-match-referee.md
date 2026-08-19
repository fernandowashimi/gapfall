# 09 — Match referee

**What to build:** A pure Match/queue reducer can pair two anonymous waiters, relay a lines-removed count, declare death order and forfeits, and handle Rematch votes — without Cloudflare, sockets, or UI. PartyServer will later call this seam; it is not this ticket.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] One waiter stays queued; a second waiter pairs and both are told a Match id.
- [x] Cancel/close while queued removes that waiter without pairing anyone else.
- [x] A lines-removed count from player A is relayed to player B only.
- [x] The first Death Line report loses; a later death report is ignored; the remaining player wins.
- [x] Close during a live Match forfeits that player; the remaining player wins.
- [x] Close after an outcome is not a second forfeit.
- [x] Two Rematch votes start a new Round on the same Match; one vote plus a close makes Rematch unavailable.
- [x] Replaying the same events does not flip a declared outcome (idempotent, storage-shaped state).
- [x] Tests drive the reducer only — no PartyKit, Wrangler, or browser.

## Answer

`reduceQueue` / `reduceMatch` in `src/match/referee.ts` pair waiters, relay lines-removed to the Opponent only, declare Death Line / forfeit outcomes, and start Rematch only while both players remain. Close after an outcome marks Rematch unavailable without flipping the winner. Tests are in `src/match/referee.test.ts`.
