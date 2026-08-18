# How two cores share a Versus Round

Type: grilling
Blocked by: 01

## Question

Two players each see only their own board. Removing a line must spawn extra Generated Lines on the opponent. The server is the authority for match outcome, including death order. The game core must stay free of React, Canvas, and network (ADR-0002).

Given the hosting/transport answer in [Where Versus matchmaking and the death referee live](01-versus-hosting.md), how do two game cores share a Versus Round?

Grill, one question at a time:

- Independent local cores that apply “N lines removed” events, vs a lockstep or server-side simulation of both boards
- What the network message is (removed-line count, a command, a full snapshot)
- Who applies extra spawns — the receiving core as an injected command, or something else
- Whether this split is surprising enough to record as an ADR

Recommend: two independent cores; React owns matchmaking and the socket; the core stays a pure function of state + time + RNG + an explicit “apply N extra Generated Lines” command; the server referees outcome, not the board. Offer an ADR only if that split is hard to reverse, surprising, and a real trade-off.
