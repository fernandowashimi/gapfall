# Gapfall

A portrait arcade game where a packed stream of generated lines falls toward the player, who fills empty slots by launching shots upward.

## Language

**Generated Line**:
A four-column row with three occupied cells and one empty slot that enters from the top as part of the incoming stream.
_Avoid_: obstacle, incoming row, spawn

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
The shared downward speed of every row on the board. It starts at Base Fall Speed, climbs linearly with Playing Time over the Ramp Duration, then holds at the Speed Cap. Generated-line spawn stays locked to this speed so the stream remains continuous.
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
Elapsed duration of the playing phase in a round. Preparation and pause do not advance it.
_Avoid_: wall clock, session time, survival time
