# 01 — Main Menu Player session

**What to build:** On the Main Menu, optional Google **Entrar** turns this browser into a **Player** (name + image) until confirmed **Sair**. Versus and Matchmaking stay playable without signing in. The Opponent still sees an anonymous participant.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] Main Menu shows **Entrar** in the recorde slot when signed out. It does not sit in front of **Um jogador** or **Versus**.
- [x] **Entrar** uses Google. On success, that slot becomes the Player’s Google name and image.
- [x] Tapping the signed-in name/image asks to confirm **Sair**. Cancel keeps the Player. Confirm signs out and returns **Entrar**.
- [x] The Player session survives closing the tab and reopening the app, until **Sair**.
- [x] **Um jogador** and **Versus** never wait on Google. Matchmaking still queues without a Player.
- [x] Sign-in and sign-out exist only on the Main Menu. No Player database. No ranked ladder.
- [x] Tests drive the app-shell navigator for Entrar / Sair-confirm / Sair-cancel and “play actions do not require a Player.” Do not test the Google popup, real ID tokens, or `localStorage` internals.
