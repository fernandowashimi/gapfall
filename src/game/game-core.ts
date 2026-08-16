export const GAME_WIDTH = 360
export const GAME_HEIGHT = 800
export const PLAYFIELD_HEIGHT = 720
export const COLUMN_COUNT = 4
export const BLOCK_WIDTH = GAME_WIDTH / COLUMN_COUNT
export const BLOCK_HEIGHT = 45
export const SHOT_SPEED = BLOCK_HEIGHT * 24

export interface FallSpeedConfig {
  baseFallSpeed: number
  speedCapMultiplier: number
  rampDuration: number
}

export const DEFAULT_FALL_SPEED: FallSpeedConfig = {
  baseFallSpeed: 1,
  speedCapMultiplier: 6,
  rampDuration: 120,
}

export type Column = 0 | 1 | 2 | 3
export type GamePhase = 'preparing' | 'playing' | 'paused' | 'game-over'

export interface GameRow {
  id: number
  y: number
  cells: readonly boolean[]
}

export interface Shot {
  id: number
  column: Column
  y: number
}

export interface GameState {
  phase: GamePhase
  rows: readonly GameRow[]
  shots: readonly Shot[]
  score: number
  preparationRemaining: number
  spawnElapsed: number
  playingTime: number
  fallSpeedConfig: FallSpeedConfig
  nextId: number
  previousGap: Column | null
  consecutiveGapCount: number
}

type Random = () => number

const preparationSeconds = 3

export function createGame(
  random: Random = Math.random,
  fallSpeedConfig: Partial<FallSpeedConfig> = {},
): GameState {
  const [firstRow, previousGap, consecutiveGapCount] = createGeneratedRow(
    1,
    -BLOCK_HEIGHT,
    null,
    0,
    random,
  )

  return {
    phase: 'preparing',
    rows: [firstRow],
    shots: [],
    score: 0,
    preparationRemaining: preparationSeconds,
    spawnElapsed: 0,
    playingTime: 0,
    fallSpeedConfig: resolveFallSpeedConfig(fallSpeedConfig),
    nextId: 2,
    previousGap,
    consecutiveGapCount,
  }
}

export function startGame(state: GameState): GameState {
  return state.phase === 'preparing'
    ? { ...state, phase: 'playing', preparationRemaining: 0 }
    : state
}

export function pauseGame(state: GameState): GameState {
  return state.phase === 'playing' ? { ...state, phase: 'paused' } : state
}

export function resumeGame(state: GameState): GameState {
  return state.phase === 'paused' ? { ...state, phase: 'playing' } : state
}

export function launchBlock(state: GameState, column: Column): GameState {
  if (state.phase !== 'playing') return state

  return {
    ...state,
    shots: [...state.shots, { id: state.nextId, column, y: PLAYFIELD_HEIGHT }],
    nextId: state.nextId + 1,
  }
}

export function advanceGame(
  state: GameState,
  elapsedSeconds: number,
  random: Random = Math.random,
): GameState {
  if (
    elapsedSeconds <= 0 ||
    state.phase === 'paused' ||
    state.phase === 'game-over'
  )
    return state

  if (state.phase === 'preparing') {
    const remaining = state.preparationRemaining - elapsedSeconds
    return remaining > 0
      ? { ...state, preparationRemaining: remaining }
      : advanceGame(
          { ...state, phase: 'playing', preparationRemaining: 0 },
          -remaining,
          random,
        )
  }

  // Clear lines completed on a previous frame so the filled gap is visible for at least one tick.
  const afterDetonation = detonateEligibleRows(state)
  const displacement = fallDisplacement(
    afterDetonation.playingTime,
    elapsedSeconds,
    afterDetonation.fallSpeedConfig,
  )
  const shiftedRows = afterDetonation.rows.map((row) => ({
    ...row,
    y: row.y + displacement,
  }))
  const movedShots = afterDetonation.shots.map((shot) => ({
    ...shot,
    y: shot.y - SHOT_SPEED * elapsedSeconds,
  }))
  const afterCollisions = resolveShotCollisions({
    ...afterDetonation,
    rows: shiftedRows,
    shots: movedShots,
  })
  const afterSpawning = spawnRows(afterCollisions, displacement, random)
  const lost = afterSpawning.rows.some(
    (row) => row.y + BLOCK_HEIGHT >= PLAYFIELD_HEIGHT,
  )

  return {
    ...afterSpawning,
    playingTime: afterSpawning.playingTime + elapsedSeconds,
    phase: lost ? 'game-over' : 'playing',
  }
}

function detonateEligibleRows(state: GameState): GameState {
  const cascade = removeEligibleRows(state.rows)
  if (cascade.removed === 0) return state

  return {
    ...state,
    rows: cascade.rows,
    score: state.score + scoreForCascade(cascade.removed),
  }
}

function resolveShotCollisions(state: GameState): GameState {
  let rows = [...state.rows]
  let nextId = state.nextId
  const remainingShots: Shot[] = []

  for (const shot of state.shots) {
    const frontline = lowestRow(rows)
    if (!frontline || shot.y > frontline.y + BLOCK_HEIGHT) {
      if (shot.y + BLOCK_HEIGHT >= 0) remainingShots.push(shot)
      continue
    }

    if (!frontline.cells[shot.column]) {
      const gapStack = consecutiveGapStack(rows, frontline, shot.column)
      const target = gapStack[gapStack.length - 1]
      if (gapStack.length > 1 && shot.y > target.y + BLOCK_HEIGHT) {
        // Keep traveling through lower gaps until the shot reaches the topmost one.
        remainingShots.push(shot)
        continue
      }

      rows = fillCell(rows, target.id, shot.column)
      continue
    }

    const placedRows = placeShotOnSolid(rows, frontline, shot.column)
    if (placedRows.length > rows.length)
      nextId = Math.max(nextId, nextRowId(placedRows) + 1)
    rows = placedRows
  }

  return { ...state, rows, shots: remainingShots, nextId }
}

/** Bottom-to-top contiguous empty cells in `column`, starting at the frontline. */
function consecutiveGapStack(
  rows: readonly GameRow[],
  frontline: GameRow,
  column: Column,
): GameRow[] {
  const stack: GameRow[] = [frontline]
  let expectedY = frontline.y - BLOCK_HEIGHT

  while (true) {
    const next = rows.find(
      (row) =>
        approximatelyEqual(row.y, expectedY) && row.cells[column] === false,
    )
    if (!next) break
    stack.push(next)
    expectedY -= BLOCK_HEIGHT
  }

  return stack
}

function placeShotOnSolid(
  rows: readonly GameRow[],
  frontline: GameRow,
  column: Column,
): GameRow[] {
  const rowBelow = rows.find((row) =>
    approximatelyEqual(row.y, frontline.y + BLOCK_HEIGHT),
  )
  if (rowBelow) return fillCell(rows, rowBelow.id, column)

  const cells = [false, false, false, false]
  cells[column] = true
  return [
    ...rows,
    { id: nextRowId(rows), y: frontline.y + BLOCK_HEIGHT, cells },
  ]
}

function removeEligibleRows(rows: readonly GameRow[]): {
  rows: GameRow[]
  removed: number
} {
  const sorted = [...rows].sort((a, b) => b.y - a.y)
  let removed = 0

  while (sorted[0] && sorted[0].cells.every(Boolean)) {
    sorted.shift()
    removed += 1
  }

  return { rows: sorted, removed }
}

function spawnRows(
  state: GameState,
  displacement: number,
  random: Random,
): GameState {
  const accumulated = state.spawnElapsed + displacement / BLOCK_HEIGHT
  const spawns = Math.floor(accumulated)
  const spawnElapsed = accumulated - spawns
  let nextId = state.nextId
  let previousGap = state.previousGap
  let consecutiveGapCount = state.consecutiveGapCount
  const rows = [...state.rows]

  for (let index = 0; index < spawns; index += 1) {
    const y = (spawns - index - 1 + spawnElapsed) * BLOCK_HEIGHT - BLOCK_HEIGHT
    const [row, gap, count] = createGeneratedRow(
      nextId,
      y,
      previousGap,
      consecutiveGapCount,
      random,
    )
    rows.push(row)
    nextId += 1
    previousGap = gap
    consecutiveGapCount = count
  }

  return {
    ...state,
    rows,
    spawnElapsed,
    nextId,
    previousGap,
    consecutiveGapCount,
  }
}

function resolveFallSpeedConfig(
  config: Partial<FallSpeedConfig>,
): FallSpeedConfig {
  return {
    baseFallSpeed: config.baseFallSpeed ?? DEFAULT_FALL_SPEED.baseFallSpeed,
    speedCapMultiplier:
      config.speedCapMultiplier ?? DEFAULT_FALL_SPEED.speedCapMultiplier,
    rampDuration: config.rampDuration ?? DEFAULT_FALL_SPEED.rampDuration,
  }
}

function fallDisplacement(
  playingTime: number,
  elapsedSeconds: number,
  config: FallSpeedConfig,
): number {
  const base = config.baseFallSpeed * BLOCK_HEIGHT
  const cap = base * config.speedCapMultiplier
  const rampDuration = config.rampDuration

  if (playingTime >= rampDuration) {
    return cap * elapsedSeconds
  }

  const slope = (cap - base) / rampDuration
  const linearSeconds = Math.min(elapsedSeconds, rampDuration - playingTime)
  const linear =
    (base + slope * playingTime) * linearSeconds +
    (slope * linearSeconds * linearSeconds) / 2
  const cappedSeconds = elapsedSeconds - linearSeconds
  return linear + cap * cappedSeconds
}

function createGeneratedRow(
  id: number,
  y: number,
  previousGap: Column | null,
  consecutiveGapCount: number,
  random: Random,
): [GameRow, Column, number] {
  let gap = Math.floor(random() * COLUMN_COUNT) as Column
  if (gap === previousGap && consecutiveGapCount >= 2)
    gap = ((gap + 1) % COLUMN_COUNT) as Column
  const cells = [true, true, true, true]
  cells[gap] = false
  return [
    { id, y, cells },
    gap,
    gap === previousGap ? consecutiveGapCount + 1 : 1,
  ]
}

function fillCell(
  rows: readonly GameRow[],
  rowId: number,
  column: Column,
): GameRow[] {
  return rows.map((row) => {
    if (row.id !== rowId) return row
    const cells = [...row.cells]
    cells[column] = true
    return { ...row, cells }
  })
}

function lowestRow(rows: readonly GameRow[]): GameRow | undefined {
  return rows.reduce<GameRow | undefined>(
    (lowest, row) => (!lowest || row.y > lowest.y ? row : lowest),
    undefined,
  )
}

function nextRowId(rows: readonly GameRow[]): number {
  return rows.reduce((maximum, row) => Math.max(maximum, row.id), 0) + 1
}

function scoreForCascade(removed: number): number {
  return removed === 0 ? 0 : removed * 2 - 1
}

function approximatelyEqual(first: number, second: number): boolean {
  return Math.abs(first - second) < 0.001
}
