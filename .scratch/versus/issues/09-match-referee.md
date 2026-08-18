# 09 — Match referee

**What to build:** A pure Match/queue reducer can pair two anonymous waiters, relay a lines-removed count, declare death order and forfeits, and handle Rematch votes — without Cloudflare, sockets, or UI. PartyServer will later call this seam; it is not this ticket.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] One waiter stays queued; a second waiter pairs and both are told a Match id.
- [ ] Cancel/close while queued removes that waiter without pairing anyone else.
- [ ] A lines-removed count from player A is relayed to player B only.
- [ ] The first Death Line report loses; a later death report is ignored; the remaining player wins.
- [ ] Close during a live Match forfeits that player; the remaining player wins.
- [ ] Close after an outcome is not a second forfeit.
- [ ] Two Rematch votes start a new Round on the same Match; one vote plus a close makes Rematch unavailable.
- [ ] Replaying the same events does not flip a declared outcome (idempotent, storage-shaped state).
- [ ] Tests drive the reducer only — no PartyKit, Wrangler, or browser.
