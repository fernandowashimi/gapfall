# Linear Fall Speed ramp locked to the Continuous Stream

Gapfall was specified with constant Fall Speed. Difficulty now rises with Playing Time. Fall Speed is shared by every row, climbs linearly from Base Fall Speed to a 3× Speed Cap over 60 seconds of Playing Time, then holds. Generated-line spawn stays locked to Fall Speed so the Continuous Stream never gaps. Shot speed stays constant. The knobs live in code, not a player menu, so the local high score stays comparable.

Stepped levels, an unbounded ramp, scaling shots with the board, and a speed HUD were rejected: they fight a progressive feel, turn the infinite mode into a brick wall, add a second difficulty axis on the launcher, or invent a level concept the game does not have.
