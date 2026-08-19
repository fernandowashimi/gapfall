# 10 — Um jogador on the Main Menu

**What to build:** The Main Menu’s local play action is labeled **Um jogador** and still starts today’s Single Player Round (ramp, score, pause, recorde). Versus is not this ticket.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] The Main Menu button that used to say Jogar says **Um jogador**.
- [x] Choosing Um jogador starts a Single Player Round with the existing preparation countdown.
- [x] Recorde, Configurações, Instruções, and the credit remain on the Main Menu.
- [x] Single Player pause, Settings-from-pause, game-over (points + recorde), and Play again are unchanged.
- [x] App-shell tests still cover boot → Um jogador → start; existing Single Player Esc/pause cases keep passing.

## Answer

Main Menu **Jogar** is now **Um jogador**. It still dispatches the existing Play intent, which `start`s a Single Player Round. Recorde, Configurações, Instruções, credit, pause, and game-over **Jogar novamente** are unchanged.
