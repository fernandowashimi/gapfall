# 11 — Versus Round (solo)

**What to build:** The Main Menu has **Versus**. Choosing it starts a Versus-rules Round immediately (Matchmaking comes later): own board, Base Fall Speed held constant, no score on the HUD or recorde, no pause, an obvious abandon to Menu principal. The player can survive a Versus-feel Round alone.

**Blocked by:** [Game core Versus primitives](08-game-core-versus-primitives.md)

**Status:** resolved

- [x] The Main Menu shows a **Versus** action beside Um jogador (or Jogar if that rename has not landed).
- [x] Versus starts a Round with Versus Fall Speed config; the stream does not ramp.
- [x] Versus HUD is board-only — no score. Versus must not write the local recorde.
- [x] Esc during Versus preparing/playing is a no-op (does not pause). Tab blur does not pause or show the pause overlay; the board keeps simulating.
- [x] Settings cannot open from a Versus Round. Mute/volume from Main Menu Settings still apply.
- [x] A Menu principal control during Versus play returns to the Main Menu (local abandon; no Match socket yet).
- [x] Versus still uses the three-second preparation, `A` `S` `K` `L` / taps, Frontline-up, and Death Line.
- [x] Single Player (Um jogador / Jogar) still pauses on Esc and blur and still scores.
- [x] App-shell tests cover Versus start, Esc no-op, Settings no-op, and abandon; core Versus config is used, not reimplemented in React.

## Answer

Main Menu **Versus** starts a Round immediately (`roundKind: 'versus'`) with core `VERSUS_FALL_SPEED` (`speedCapMultiplier: 1`). The HUD hides score and recorde, Esc and tab hide are no-ops, Settings cannot open, and **Menu principal** abandons to the Main Menu. Single Player pause, score, and recorde are unchanged. Tests are in `src/ui/app-shell.test.ts` and `src/ui/round.test.ts`.
