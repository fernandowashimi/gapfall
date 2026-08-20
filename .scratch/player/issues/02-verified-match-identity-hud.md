# 02 — Verified identity on the Match and Versus HUD

**What to build:** Leaving the Main Menu for Versus freezes this tab’s identity. The Match verifies a Google token when one is presented and both sides see the result on the Versus header: a Player’s name and image, or **Oponente** plus a generic placeholder. Live-Round leave is **Desistir**, still a Forfeit.

**Blocked by:** 01 — Main Menu Player session

**Status:** ready-for-agent

- [x] Entering Versus (or Play again into Matchmaking) freezes identity for that tab until return to the Main Menu. No Entrar / Sair during Matchmaking, preparation, play, or Rematch.
- [x] The public Matchmaking queue stays anonymous. Verification happens on the Match, not as a ticket into the queue.
- [x] A verified Google token supplies that side’s name and image from Google’s claims. Missing token or failed verify is anonymous: **Oponente** and a generic placeholder (no fake face).
- [x] Mixed Matches work: one Player, one anonymous. Both anonymous still works (including two local tabs).
- [x] The existing Versus HUD header (not the board) shows both identities for the whole live Round. Single Player header still shows Score, not identities.
- [x] Versus live-Round **Menu principal** becomes **Desistir**. It is a Surrender → Forfeit. Versus still cannot pause or open Settings. Single Player pause **Menu principal** is unchanged.
- [x] Death order, Forfeit on disconnect, and Rematch are unchanged. Respect ADR-0005: no Player table; do not trust free-form client name/image fields.
- [x] Tests drive the Match referee with already-verified claims or `null`, plus the identity message codec. App-shell covers freeze and Desistir as abandon. Do not test Google certs, PartyKit, Wrangler, Canvas pixels, or the game core.
