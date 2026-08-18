# Versus hosting and transport

Date: 2026-08-18

## Question

Gapfall is a Vite + React 19 SPA (`package.json`: `react` and `react-dom` only). There is no backend. The game core (`src/game/game-core.ts`) must stay free of network ([ADR-0002](../../../docs/adr/0002-core-canvas-react-split.md)).

Versus (future 1v1) needs:

1. A public random Matchmaking queue that pairs two anonymous players (no accounts).
2. Transport for small realtime events between two clients (e.g. “N lines removed”) while each player simulates their own board.
3. A server that is the authority for Match outcome, including death order when both players hit the Death Line at the same moment (not two peers arguing).
4. Disconnect = forfeit (the remaining player wins).
5. Rematch if both still connected; otherwise requeue.

Where should Matchmaking and that death referee live, and over what transport?

## Recommendation

**Put both on Cloudflare Durable Objects, using the PartyKit room model (`partyserver` + `partysocket`), over standard WebSockets.**

Two Durable Object classes / parties:

| Role | Party / class | Identity | Job |
| --- | --- | --- | --- |
| Matchmaking | `queue` | one well-known room id, e.g. `public` | Hold waiting WebSockets. When two anonymous connections are present, mint a Match id, tell both clients to connect to that Match room, drop them from the queue. |
| Death referee + event relay | `match` | one room id per Match | Accept exactly two connections. Relay “N lines removed”. On `onClose` / `webSocketClose` of one socket while the Round is live, declare forfeit. On two death reports, serialize them and declare the first as the loser. Hold Rematch votes on the same room while both sockets remain. |

Transport is **WebSocket** (browser `WebSocket` or `PartySocket`). Not WebRTC, not a database pub/sub.

### Why this fits

A Durable Object is globally unique for a given id and is the coordination point for every request and WebSocket sent to it ([Cloudflare Durable Objects glossary](https://developers.cloudflare.com/durable-objects/reference/glossary/)). Incoming work is single-threaded; storage operations are serializable. Two “I hit the Death Line” messages arriving at the same wall-clock instant are still ordered by the object. That is the referee Gapfall asked for — a process, not two clients comparing clocks.

PartyKit’s `Party.Server` is that object with a room API: `onConnect`, `onMessage`, `onClose`, `room.broadcast`, `room.getConnections()`, `room.storage` ([Party.Server API](https://docs.partykit.io/reference/partyserver-api/)). Same-id connections are guaranteed to hit the same room ([How PartyKit works](https://docs.partykit.io/how-partykit-works/)). Multiple parties in one project (`queue` + `match`) can call each other over HTTP ([Using multiple parties per project](https://docs.partykit.io/guides/using-multiple-parties-per-project/)).

Clients stay anonymous: a browser opens `wss://…/parties/queue/public` with no Auth product. The connection id is a GUID (or a client-supplied unique-per-tab id) ([PartySocket](https://docs.partykit.io/reference/partysocket-api/)).

Disconnect is a first-class server event: PartyKit `onClose` ([Party.Server API](https://docs.partykit.io/reference/partyserver-api/)); Durable Objects Hibernation API delivers `webSocketClose` on disconnect ([Durable Object State](https://developers.cloudflare.com/durable-objects/api/state/)).

The Vite SPA does not become a backend. React owns Matchmaking UI and the socket; `src/game/game-core.ts` stays a local simulation ([ADR-0002](../../../docs/adr/0002-core-canvas-react-split.md)). How the core consumes “N extra Generated Lines” is ticket `05-versus-sync`, not this note.

Deploy as **`partyserver` on the project’s own Cloudflare Workers account** (Durable Objects + Wrangler). That is Cloudflare’s current library for the PartyKit room model ([cloudflare/partykit](https://github.com/cloudflare/partykit/)). The managed `*.partykit.dev` platform is the same architecture if a first deploy wants the PartyKit CLI instead ([Deploy to your own Cloudflare account](https://docs.partykit.io/guides/deploy-to-cloudflare/)).

Hibernation stays **off** on Match rooms (`options.hibernate` defaults to `false`) so in-memory Match state is not wiped between messages ([Party.Server.options.hibernate](https://docs.partykit.io/reference/partyserver-api/); [Scaling with Hibernation](https://docs.partykit.io/guides/scaling-partykit-servers-with-hibernation/)). Persist the declared outcome to `room.storage` before broadcasting it, so a restart cannot reverse a win.

## Alternatives considered

### PartyKit managed platform (`*.partykit.dev`) — same model, extra vendor

Same rooms, same WebSockets, same Durable Object uniqueness ([How PartyKit works](https://docs.partykit.io/how-partykit-works/)). Lost as the *primary* deploy target because Cloudflare now ships the room library as `partyserver` on Workers ([cloudflare/partykit](https://github.com/cloudflare/partykit/)), and cloud-prem already exists to run PartyKit on your own account ([cloud-prem](https://docs.partykit.io/guides/deploy-to-cloudflare/)). Fine as a bootstrap; the spec should name the room model, not `partykit.dev`.

### Raw Durable Objects + Workers (no PartyServer)

Same uniqueness, Hibernation API (`ctx.acceptWebSocket`, `webSocketMessage`, `webSocketClose`), alarms, 32,768 hibernatable sockets per object, 32 MiB received WebSocket message size ([Use WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/); [Limits](https://developers.cloudflare.com/durable-objects/platform/limits/)). Lost because you reimplement room routing, `broadcast`, and `onClose` that PartyServer already wraps. Choose this only if the project wants zero extra package.

### Colyseus (Node WebSocket game server)

Purpose-built: `client.joinOrCreate("versus")`, `maxClients` (auto-lock when full), `onLeave` / `onDrop` for disconnect, `allowReconnection` you would **not** call (forfeit, not grace) ([Rooms](https://docs.colyseus.io/room); [Match-maker API](https://docs.colyseus.io/matchmaker); [Reconnection](https://docs.colyseus.io/room/reconnection)). Default transport is `WebSocketTransport` ([Server](https://docs.colyseus.io/server)). Lost because Gapfall has no Node host today; Colyseus wants a long-lived process (and Redis presence/driver once you scale past one process) ([Server options](https://docs.colyseus.io/server)). Schema state sync is also a poor fit: each player already simulates their own board; the server should not own both boards.

### Custom WebSocket (Node + Socket.io, or `ws`)

Socket.io rooms can broadcast to two sockets; `disconnect` / `disconnecting` fire on drop; ping timeout is a documented close reason ([Rooms](https://socket.io/docs/v4/rooms/); [Server socket](https://socket.io/docs/v4/server-socket-instance/)). You can write the referee in process. Lost because rooms are an in-memory adapter on **one** Node process; multi-server requires Redis and rooms are not shared across servers by default ([Rooms — multiple servers](https://socket.io/docs/v4/rooms/)). That is a full backend Gapfall does not have. A tiny `ws` server on Fly/Railway is viable but you own matchmaking, pairing races, and process failover with none of Durable Object uniqueness.

### Supabase Realtime (Broadcast / Presence) + optional Edge Functions

Broadcast is ephemeral client-to-client messaging over Phoenix channels; Presence tracks join/leave ([Realtime getting started](https://supabase.com/docs/guides/realtime/getting_started); [Broadcast](https://supabase.com/docs/guides/realtime/broadcast)). Private channels need RLS on `realtime.messages` ([Authorization](https://supabase.com/docs/guides/realtime/authorization)). Anonymous play still creates Auth users via `signInAnonymously()` (JWT `is_anonymous`; IP rate limit 30/hour; no automatic cleanup) ([Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous)). The Realtime service does **not** run custom Match logic, so it cannot be the death referee.

Edge Functions can upgrade a WebSocket ([Handling WebSockets](https://supabase.com/docs/guides/functions/websockets)) but hosted workers are capped at **150s wall clock (Free) / 400s (Paid)** and 2s CPU per request ([Limits](https://supabase.com/docs/guides/functions/limits)) — shorter than a Versus Round. Isolates are also not globally unique the way a Durable Object is. Skip as the Match authority.

### Firebase Realtime Database or Firestore

Anonymous Auth exists (`signInAnonymously`) ([Anonymous Auth](https://firebase.google.com/docs/auth/web/anonymous-auth)). RTDB `onDisconnect` lives on the server and runs on drop or crash — excellent forfeit signal ([Offline capabilities](https://firebase.google.com/docs/database/web/offline-capabilities)). `runTransaction` can serialize two writes to one path ([Transactions](https://firebase.google.com/docs/database/web/read-and-write#save_data_as_transactions)). Lost because the product is a synchronized JSON tree, not a room process: line-removed events become database writes; death order is a client-invoked transaction plus security rules (clients can still race “I died” vs “they died” unless rules are perfect); Firestore is even less of a 1v1 event bus. Also creates anonymous **accounts**, which Versus said it does not want.

### WebRTC `RTCDataChannel` + a signaling server

Data never passes through the application server; it is peer-to-peer ([Using data channels](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels)). Signaling still needs a mutually agreed server ([Signaling and video calling](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling)). Skip: two peers cannot be the death-order authority, and disconnect/ICE failure is not a clean forfeit the way `onClose` is. A signaling server that *also* referees is the Durable Object again, with extra NAT/TURN cost.

## What the spec can assume

- **Queue.** One public Matchmaking room. A client opens a WebSocket with no account. Cancel search = close that socket. When two waiters exist, the queue party assigns a Match id and instructs both to connect to `/parties/match/:matchId` (Party URL shape: `/parties/:party/:room-id` ([Multiple parties](https://docs.partykit.io/guides/using-multiple-parties-per-project/))).
- **Room.** The Match is that `match` room. Capacity two. Extra connections are rejected in `onConnect` (or `onBeforeConnect` in the edge worker, which cannot see room storage ([onBeforeConnect](https://docs.partykit.io/reference/partyserver-api/))). Events are small JSON messages; the room `broadcast`s them to the other connection ([Building a WebSocket server](https://docs.partykit.io/guides/) — `room.broadcast(message, [sender.id])`).
- **Who declares death.** Only the Match room. Clients report “I hit the Death Line.” The room records the first report as the loser and the remaining player as the winner. A second report after outcome is ignored. Persist outcome in `room.storage` (`put`/`get`; value size 128 KiB on PartyKit storage docs / SQLite-backed DO 2 MB key+value ([Party.Room.storage](https://docs.partykit.io/reference/partyserver-api/); [DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/))) then broadcast.
- **Disconnect.** If a Match socket closes before outcome, the room declares forfeit for that connection and the remaining player wins. Do not call Colyseus-style `allowReconnection`. Do not treat PartySocket’s default auto-reconnect as “still in the Match” (see surprises).
- **Rematch.** Same Match room, same two connection ids (or a rematch handshake). If either socket is gone, Rematch is unavailable; the remaining player re-enters `queue` (`public`). The queue does not keep Match history.
- **Core.** Network stays in the React shell. `src/game/game-core.ts` does not import sockets ([ADR-0002](../../../docs/adr/0002-core-canvas-react-split.md)).

## Trade-offs that would surprise a later spec session

1. **PartySocket reconnects forever by default.** `maxRetries: Infinity`, plus “Automatically reconnect if the connection is closed” ([PartySocket](https://docs.partykit.io/reference/partysocket-api/)). Versus lock is disconnect = forfeit. During a Match, disable reconnection (`maxRetries: 0` / `startClosed` patterns) or treat `onClose` as terminal and refuse a second `onConnect` after outcome. Otherwise a phone blip looks like a forfeit then a ghost reconnect.
2. **A global queue is one Durable Object.** One object’s practical throughput is a soft ~1,000 simple requests/second; overload returns an error ([Limits FAQ](https://developers.cloudflare.com/durable-objects/platform/limits/)). Fine for this game; a later “shard the queue” change is a new party id scheme, not a silent scale-out.
3. **Match location follows the first connection.** Rooms are created in a nearby data center ([How PartyKit works](https://docs.partykit.io/how-partykit-works/)). Two players on different continents share one object; one of them eats the RTT. `locationHint` exists on PartyServer routing ([partyserver README](https://github.com/cloudflare/partykit/blob/main/packages/partyserver/README.md)) but will not make physics fair.
4. **Hibernation wipes class fields.** Default `hibernate: false` keeps the instance in memory while sockets are open ([Hibernation guide](https://docs.partykit.io/guides/scaling-partykit-servers-with-hibernation/)). Turning it on for cost (PartyKit: 100 connections/room without, ~32,000 with; Cloudflare: 32,768 hibernatable sockets ([Hibernation](https://docs.partykit.io/guides/scaling-partykit-servers-with-hibernation/); [State API](https://developers.cloudflare.com/durable-objects/api/state/))) means Match flags must live in `storage` or `serializeAttachment`. `partykit dev` does **not** hibernate, so local vs production diverge.
5. **Uniqueness is enforced when an event starts and when storage is accessed**, not as a mystical lock for the whole wall-clock Round ([Known issues — global uniqueness](https://developers.cloudflare.com/durable-objects/platform/known-issues/)). Write outcome to storage; do not referee only in RAM across a long `await fetch()`.
6. **Alarms are at-least-once, one per object, and can retry** ([Alarms](https://developers.cloudflare.com/durable-objects/api/alarms/)). Useful for queue timeouts or a stuck Match TTL; dangerous if `alarm()` re-broadcasts a win. Make outcome idempotent. PartyKit `onAlarm` cannot read `Room.id` or `context.parties` ([onAlarm](https://docs.partykit.io/reference/partyserver-api/)).
7. **`onBeforeConnect` cannot see the room’s connection count** (runs in the Worker, not the Durable Object) ([onBeforeConnect](https://docs.partykit.io/reference/partyserver-api/)). Cap of two belongs in `onConnect` inside the Match party.
8. **CPU time is 30s per invocation, reset per WebSocket message** ([Limits](https://developers.cloudflare.com/durable-objects/platform/limits/)). A referee that never awaits a message and burns CPU can be evicted. Keep handlers tiny.
9. **SQLite-backed DOs are on Workers Free; KV-backed DOs are not for new namespaces** ([Limits](https://developers.cloudflare.com/durable-objects/platform/limits/)). New Versus code should use the SQLite storage backend.
10. **Two tabs are two players** unless the spec says otherwise. PartySocket ids are unique per connection, not per human ([PartySocket `id`](https://docs.partykit.io/reference/partysocket-api/)). A self-queue is how you test locally — and how a player can Match themselves.
11. **Line-removed events are not the board.** The server can order them but cannot prove a client actually removed N lines. Anti-cheat is out of scope; the spec should not pretend the referee simulates both boards.

## Citations

Repo

- [ADR-0002 — Game core separated from Canvas renderer and React shell](../../../docs/adr/0002-core-canvas-react-split.md)
- [`package.json`](../../../package.json) — dependencies are `react` / `react-dom` only
- [`src/game/game-core.ts`](../../../src/game/game-core.ts) — no `fetch` / `WebSocket`
- [`.scratch/versus/map.md`](../map.md) — Versus locks (public queue, disconnect forfeit, Rematch)

PartyKit / PartyServer

- https://docs.partykit.io/how-partykit-works/
- https://docs.partykit.io/reference/partyserver-api/
- https://docs.partykit.io/reference/partysocket-api/
- https://docs.partykit.io/guides/using-multiple-parties-per-project/
- https://docs.partykit.io/guides/scaling-partykit-servers-with-hibernation/
- https://docs.partykit.io/guides/deploy-to-cloudflare/
- https://github.com/cloudflare/partykit/
- https://github.com/cloudflare/partykit/blob/main/packages/partyserver/README.md

Cloudflare Durable Objects / Workers

- https://developers.cloudflare.com/durable-objects/reference/glossary/
- https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- https://developers.cloudflare.com/durable-objects/api/state/
- https://developers.cloudflare.com/durable-objects/api/alarms/
- https://developers.cloudflare.com/durable-objects/platform/limits/
- https://developers.cloudflare.com/durable-objects/platform/known-issues/
- https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/

Colyseus

- https://docs.colyseus.io/server
- https://docs.colyseus.io/room
- https://docs.colyseus.io/matchmaker
- https://docs.colyseus.io/room/reconnection

Socket.IO

- https://socket.io/docs/v4/rooms/
- https://socket.io/docs/v4/server-socket-instance/

Supabase

- https://supabase.com/docs/guides/realtime/getting_started
- https://supabase.com/docs/guides/realtime/broadcast
- https://supabase.com/docs/guides/realtime/authorization
- https://supabase.com/docs/guides/auth/auth-anonymous
- https://supabase.com/docs/guides/functions/websockets
- https://supabase.com/docs/guides/functions/limits

Firebase

- https://firebase.google.com/docs/auth/web/anonymous-auth
- https://firebase.google.com/docs/database/web/offline-capabilities
- https://firebase.google.com/docs/database/web/read-and-write#save_data_as_transactions

WebRTC

- https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels
- https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling
- https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel
