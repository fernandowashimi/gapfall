# 11 — Versus Round (solo)

**What to build:** The Main Menu has **Versus**. Choosing it starts a Versus-rules Round immediately (Matchmaking comes later): own board, Base Fall Speed held constant, no score on the HUD or recorde, no pause, an obvious abandon to Menu principal. The player can survive a Versus-feel Round alone.

**Blocked by:** [Game core Versus primitives](08-game-core-versus-primitives.md)

**Status:** ready-for-agent

- [ ] The Main Menu shows a **Versus** action beside Um jogador (or Jogar if that rename has not landed).
- [ ] Versus starts a Round with Versus Fall Speed config; the stream does not ramp.
- [ ] Versus HUD is board-only — no score. Versus must not write the local recorde.
- [ ] Esc during Versus preparing/playing is a no-op (does not pause). Tab blur does not pause or show the pause overlay; the board keeps simulating.
- [ ] Settings cannot open from a Versus Round. Mute/volume from Main Menu Settings still apply.
- [ ] A Menu principal control during Versus play returns to the Main Menu (local abandon; no Match socket yet).
- [ ] Versus still uses the three-second preparation, `A` `S` `K` `L` / taps, Frontline-up, and Death Line.
- [ ] Single Player (Um jogador / Jogar) still pauses on Esc and blur and still scores.
- [ ] App-shell tests cover Versus start, Esc no-op, Settings no-op, and abandon; core Versus config is used, not reimplemented in React.
