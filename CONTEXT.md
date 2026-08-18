# Gapfall

A portrait arcade game where a packed stream of generated lines falls toward the player, who fills empty slots by launching shots upward.

## Language

**Generated Line**:
A four-column row with three occupied cells and one empty slot that enters from the top as part of the incoming stream.
_Avoid_: obstacle, incoming row, spawn

**Reinforced Line**:
A Generated Line that a Shot can remove only while it is the Cracked Frontline.
_Avoid_: reinforced block line, armored line, HP line

**Cracked**:
The state of a Reinforced Line after a Shot into its Frontline empty slot, or after it becomes the Frontline while already complete. A complete Cracked Frontline is removed by a Shot in the column that holds the tnt.
_Avoid_: damaged, broken, weakened

**Partial Line**:
A row created or altered by a shot rather than spawned in the incoming stream.
_Avoid_: player row, extra line, accumulated line

**Frontline**:
The lowest unresolved row in the current board ordering.
_Avoid_: bottom row, first line

**Cascade**:
Line removals triggered by the same action.
_Avoid_: combo, chain (as a synonym for this removal burst)

**Shot**:
A block traveling upward from the launcher at a constant speed, independent of Fall Speed.
_Avoid_: projectile, bullet, launch

**Continuous Stream**:
The packed sequence of generated lines with no vertical gap between them.
_Avoid_: flow, conveyor

**Fall Speed**:
The shared downward speed of every row on the board. In Single Player it starts at Base Fall Speed, climbs linearly with Playing Time over the Ramp Duration, then holds at the Speed Cap. In Versus it holds at Base Fall Speed. Generated-line spawn stays locked to this speed so the stream remains continuous.
_Avoid_: spawn rate, line speed, difficulty (as a synonym for speed)

**Base Fall Speed**:
Fall Speed at Playing Time zero: one block-height per second.
_Avoid_: default speed, starting difficulty

**Speed Cap**:
The maximum Fall Speed. Playing Time can continue after Fall Speed has reached this ceiling.
_Avoid_: max difficulty, terminal velocity

**Ramp Duration**:
Playing Time until Fall Speed reaches the Speed Cap. After that, Fall Speed stays at the Speed Cap.
_Avoid_: level length, difficulty timer

**Playing Time**:
Elapsed duration of the playing phase in a Round. Preparation and pause do not advance it.
_Avoid_: wall clock, session time, survival time

**Round**:
One attempt from choosing Single Player or Versus until the Death Line (or a Versus forfeit) ends it, or the player returns to the Main Menu.
_Avoid_: game, run, session, life

**Death Line**:
The lower bound of the playfield.
_Avoid_: bottom edge, floor, fail line

**Main Menu**:
The app’s home screen outside an active Round. The app opens here; it shows the title, local high score, Single Player / Versus / Settings / Instructions, and project credit.
_Avoid_: title screen, lobby, home

**Single Player**:
The local infinite mode started from the Main Menu. A Single Player Round uses the Fall Speed ramp, awards score, and records a local high score.
_Avoid_: Play (as the mode name), solo, campaign, infinite mode (as the menu label)

**Versus**:
The 1v1 real-time competitive mode started from the Main Menu via Matchmaking. A Versus Round holds Base Fall Speed, has no score, and the last surviving player wins.
_Avoid_: multiplayer, duel, PvP, online (as the mode name)

**Opponent**:
The other player in a Versus Match.
_Avoid_: enemy, rival, the other person

**Matchmaking**:
The public random queue that pairs two players into a Versus Match.
_Avoid_: lobby, search, matchmaking service (as the product concept)

**Match**:
A Versus pairing of two players, from Matchmaking success until a win, loss, or forfeit.
_Avoid_: game, lobby, session (as a synonym for this pairing)

**Settings**:
Player-controlled sound mute and volume only — not Fall Speed or other round rules. Reachable from the Main Menu and from pause. Mute and volume persist across visits.
_Avoid_: options, preferences, difficulty menu

**Instructions**:
A static how-to-play screen (controls and core rules) reached from the Main Menu only — not a tutorial Round.
_Avoid_: tutorial, help, tips, onboarding
