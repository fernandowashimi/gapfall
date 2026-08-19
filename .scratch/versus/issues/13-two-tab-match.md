# 13 — Two-tab Match

**What to build:** Two browser tabs can enter the public queue and be paired into a Match. Both leave Matchmaking and start independent Versus Rounds on their own boards. This is the first real 1v1; sent lines and Match outcome can still come after.

**Blocked by:** [Match referee](09-match-referee.md), [Matchmaking shell](12-matchmaking-shell.md)

**Status:** resolved

- [x] Matchmaking and Match rooms live as PartyKit parties on Durable Objects (`queue` well-known public room; `match` per Match id). The PartyServer adapter calls the Match referee; it does not reimplement pairing in React.
- [x] Two tabs that choose Versus are paired; both connect to the same Match and both start a Versus Round (local three-second preparation).
- [x] Each tab is its own player (including a self-Match on one machine). Cancel while still queued drops that tab from the queue without pairing the other waiter incorrectly.
- [x] Extra connections to a Match beyond two are rejected.
- [x] During a Match, PartySocket does not infinitely reconnect (a drop is terminal, not a ghost). Match rooms do not hibernate.
- [x] The game core still has no network imports. React owns the socket.
- [x] Referee tests remain the pairing source of truth; do not add Cloudflare/Wrangler tests as a product seam.

## Answer

PartyServer `Queue` (`public`) calls `reduceQueue` and sends a `paired` Match id. Each tab then opens the `Match` party with `maxRetries: 0` and starts a Versus Round. Cancel closes the queue socket (`onClose` → leave). Extra Match connections are rejected; hibernation is off. Codec tests are in `src/match/messages.test.ts`; referee tests stay the pairing source of truth.
