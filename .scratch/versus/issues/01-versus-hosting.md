# Where Versus matchmaking and the death referee live

Type: research
Status: resolved

## Question

This repo is a Vite/React browser client with no backend. Versus needs a public random queue that pairs two anonymous players, a way to send “N lines removed” events between two independent boards, and a server that is the authority for match outcome — including death order when both players hit the Death Line at the same moment.

Where should matchmaking and that death referee live, and over what transport?

Research hosting and transport options against those constraints (WebSocket room, PartyKit, Supabase Realtime, Firebase, WebRTC + signaling, and anything else that fits a small anonymous 1v1). Follow claims to primary sources. Recommend one approach, with the trade-offs that would surprise a later spec session.

The game core must stay free of network (ADR-0002). This ticket decides the hosting/transport fact the spec waits on, not the client/server split inside the app — that is [How two cores share a Versus Round](05-versus-sync.md).

## Answer

Matchmaking and the death referee live on **Cloudflare Durable Objects** using the **PartyKit room model** (`partyserver` + WebSockets). A singleton `queue` party pairs two anonymous sockets; a per-Match `match` party relays “N lines removed,” serializes Death Line reports (first report loses), and treats `onClose` as a forfeit. Pub/sub (Supabase, Firebase) and WebRTC cannot be that referee. Disable PartySocket’s default infinite reconnect during a Match, or a blip becomes a forfeit then a ghost.

Full notes: [`.scratch/versus/research/hosting.md`](../research/hosting.md) on `research/versus-hosting`.
