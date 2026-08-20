# 03 — You vs … on preparation

**What to build:** After pairing, the existing three-second Versus preparation shows both identities (name + image) together with the 3-2-1 countdown. Same labels as the header. Leaving during that beat is still a Surrender.

**Blocked by:** 02 — Verified identity on the Match and Versus HUD

**Status:** ready-for-agent

- [x] Preparation is still the Versus Round’s three-second `preparing` phase — not a new ready-check screen.
- [x] Both slots show name + image: Google claims when verified, **Oponente** + generic placeholder when anonymous. Never the word “You” as a name.
- [x] The countdown remains visible on that same beat (integrate, do not replace).
- [x] **Desistir** during preparation is a Forfeit. The Opponent wins.
- [x] Rematch starts this same preparation again with the frozen identities from this Versus entry.
- [x] Tests reuse the Match identity snapshot from ticket 02; do not add a new seam. Do not test Canvas pixels or a lockstep server clock.
