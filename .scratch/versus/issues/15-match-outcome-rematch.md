# 15 — Match outcome, Rematch, and Play again

**What to build:** The Match room names a winner. Versus game-over waits for that outcome, then shows win/loss (and a forfeit win when they left) with **Revanche**, **Jogar novamente**, and **Menu principal**. Rematch is hidden if the opponent is gone; Play again requeues; Main Menu after outcome just leaves.

**Blocked by:** [Match referee](09-match-referee.md), [Matchmaking shell](12-matchmaking-shell.md), [Two-tab Match](13-two-tab-match.md)

**Status:** ready-for-agent

- [ ] Clients report Death Line to the Match room; they do not show Versus game-over until the room’s outcome arrives. Local Death Line is not assumed to be a loss.
- [ ] First death report loses; the other player wins even if they hit the Death Line later. On outcome, both Rounds stop even if one client is still playing.
- [ ] Mid-Round Menu principal or a dropped connection forfeits that player; the remaining player wins. Game-over Menu principal after outcome is not a forfeit.
- [ ] Versus game-over copy is Portuguese: **Você venceu** / **Você perdeu**, with a forfeit win readable as the opponent leaving. No points, no recorde.
- [ ] Actions: **Revanche**, **Jogar novamente**, **Menu principal**. Hide **Revanche** when the opponent’s socket is gone (including if they leave while one player is waiting on Rematch).
- [ ] Both Rematch votes start a new Versus Round on the same Match (preparation again). Jogar novamente leaves the Match and re-enters public Matchmaking. Menu principal returns home.
- [ ] Abandon during a live Round still closes the Match socket. Esc during Versus play remains a no-op.
- [ ] Single Player game-over (points, recorde, Jogar novamente, Menu principal) is unchanged.
- [ ] App-shell tests cover Rematch present/hidden, Play again → Matchmaking, Main Menu after outcome, and Versus Esc still not pausing. Referee tests remain the source of truth for death order, forfeit, and Rematch votes.
