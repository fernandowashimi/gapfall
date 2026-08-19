# 12 — Matchmaking shell

**What to build:** Choosing Versus no longer starts a Round immediately. It shows Matchmaking loading (Portuguese along the lines of “Procurando oponente…”) with Voltar, waits indefinitely, and returns to the Main Menu on cancel/Esc. A pairing event (from tests or a later socket adapter) starts the Versus Round.

**Blocked by:** [Versus Round (solo)](11-versus-round-solo.md)

**Status:** resolved

- [x] Versus from the Main Menu enters Matchmaking, not a Round.
- [x] The loading state has no estimated wait and no timeout copy; it waits until pairing or cancel.
- [x] Voltar and Esc from Matchmaking return to the Main Menu without starting a Round.
- [x] A pairing intent/event starts a Versus Round (`start` with Versus Fall Speed), including the three-second preparation.
- [x] Cancel must be able to close a queue connection when one exists; with no adapter yet, the navigator still leaves Matchmaking cleanly.
- [x] App-shell tests cover Versus → Matchmaking → cancel/Esc, and pairing → Versus start. Single Player flow is unchanged.

## Answer

Versus from the Main Menu enters `matchmaking` with “Procurando oponente…” and **Voltar**. Cancel/Esc return home without `start`. A `paired` intent starts a Versus Round (`roundKind: 'versus'`, existing Fall Speed config and three-second preparation). No queue adapter yet; the navigator just leaves. Tests are in `src/ui/app-shell.test.ts`.
