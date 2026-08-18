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
/** Generated blocks are stone; Shot placements are tnt. */
export type Cell = 'empty' | 'stone' | 'tnt'

export const REINFORCED_SPAWN_CHANCE = 0.15

export interface GameRow {
  id: number
  y: number
  cells: readonly Cell[]
  reinforced?: boolean
  cracked?: boolean
  awaitingFinishingShot?: boolean
}

export function isOccupied(cell: Cell): boolean {
  return cell !== 'empty'
}

export function isRowComplete(row: GameRow): boolean {
  return row.cells.every(isOccupied)
}

function isEligibleForRemoval(row: GameRow): boolean {
  if (!isRowComplete(row)) return false
  if (row.reinforced && !row.cracked) return false
  if (row.reinforced && row.cracked && row.awaitingFinishingShot) return false
  return true
}

export interface Shot {
  id: number
  column: Column
  y: number
}

export interface GameState {
  phase: GamePhase
  rows: GameRow[]
  shots: Shot[]
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
    if (remaining > 0) {
      state.preparationRemaining = remaining
      return state
    }
    state.phase = 'playing'
    state.preparationRemaining = 0
    return advanceGame(state, -remaining, random)
  }

  // Clear lines completed on a previous frame so the filled gap is visible for at least one tick.
  detonateEligibleRows(state)
  const displacement = fallDisplacement(
    state.playingTime,
    elapsedSeconds,
    state.fallSpeedConfig,
  )
  for (const row of state.rows) {
    row.y += displacement
  }
  for (const shot of state.shots) {
    shot.y -= SHOT_SPEED * elapsedSeconds
  }
  if (state.shots.length > 0) resolveShotCollisions(state)
  spawnRows(state, displacement, random)
  const lost = state.rows.some(
    (row) => row.y + BLOCK_HEIGHT >= PLAYFIELD_HEIGHT,
  )
  state.playingTime += elapsedSeconds
  if (lost) state.phase = 'game-over'
  return state
}

function detonateEligibleRows(state: GameState): void {
  const cascade = removeEligibleRows(state.rows)
  if (cascade.removed === 0 && cascade.rows === state.rows) return

  state.rows = cascade.rows
  if (cascade.removed === 0) return
  state.score += scoreForCascade(cascade.removed, cascade.reinforcedRemoved)
}

function resolveShotCollisions(state: GameState): void {
  let rows = state.rows
  let nextId = state.nextId
  const remainingShots: Shot[] = []

  for (const shot of state.shots) {
    const frontline = lowestRow(rows)
    if (!frontline || shot.y > frontline.y + BLOCK_HEIGHT) {
      if (shot.y + BLOCK_HEIGHT >= 0) remainingShots.push(shot)
      continue
    }

    if (!isOccupied(frontline.cells[shot.column])) {
      const gapStack = consecutiveGapStack(rows, frontline, shot.column)
      const target = gapStack[gapStack.length - 1]
      if (gapStack.length > 1 && shot.y > target.y + BLOCK_HEIGHT) {
        // Keep traveling through lower gaps until the shot reaches the topmost one.
        remainingShots.push(shot)
        continue
      }

      if (target.reinforced && !target.cracked && target.id === frontline.id) {
        rows = crackRow(rows, target.id)
        continue
      }

      rows = fillCell(rows, target.id, shot.column)
      continue
    }

    if (
      frontline.reinforced &&
      frontline.cracked &&
      frontline.awaitingFinishingShot &&
      frontline.cells[shot.column] === 'tnt'
    ) {
      rows = rows.map((row) =>
        row.id === frontline.id
          ? { ...row, awaitingFinishingShot: false }
          : row,
      )
      continue
    }

    const placedRows = placeShotOnSolid(rows, frontline, shot.column)
    if (placedRows.length > rows.length)
      nextId = Math.max(nextId, nextRowId(placedRows) + 1)
    rows = placedRows
  }

  state.rows = rows
  state.shots = remainingShots
  state.nextId = nextId
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
        approximatelyEqual(row.y, expectedY) && !isOccupied(row.cells[column]),
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

  const cells: Cell[] = ['empty', 'empty', 'empty', 'empty']
  cells[column] = 'tnt'
  return [
    ...rows,
    { id: nextRowId(rows), y: frontline.y + BLOCK_HEIGHT, cells },
  ]
}

function removeEligibleRows(rows: readonly GameRow[]): {
  rows: GameRow[]
  removed: number
  reinforcedRemoved: number
} {
  const frontline = lowestRow(rows)
  if (!frontline) {
    return { rows: rows as GameRow[], removed: 0, reinforcedRemoved: 0 }
  }

  if (!isEligibleForRemoval(frontline)) {
    if (
      isRowComplete(frontline) &&
      frontline.reinforced &&
      !frontline.cracked
    ) {
      return {
        rows: crackRow(rows, frontline.id, true),
        removed: 0,
        reinforcedRemoved: 0,
      }
    }
    return { rows: rows as GameRow[], removed: 0, reinforcedRemoved: 0 }
  }

  const sorted = [...rows].sort((a, b) => b.y - a.y)
  let removed = 0
  let reinforcedRemoved = 0

  while (sorted[0] && isEligibleForRemoval(sorted[0])) {
    const removedRow = sorted[0]
    if (removedRow.reinforced) reinforcedRemoved += 1
    sorted.shift()
    removed += 1
    clearPassThroughTntOnReinforcedAbove(sorted, removedRow)
  }

  if (
    sorted[0] &&
    isRowComplete(sorted[0]) &&
    sorted[0].reinforced &&
    !sorted[0].cracked
  ) {
    sorted[0] = {
      ...sorted[0],
      cracked: true,
      awaitingFinishingShot: true,
    }
  }

  return { rows: sorted, removed, reinforcedRemoved }
}

function spawnRows(
  state: GameState,
  displacement: number,
  random: Random,
): void {
  const accumulated = state.spawnElapsed + displacement / BLOCK_HEIGHT
  const spawns = Math.floor(accumulated)
  state.spawnElapsed = accumulated - spawns
  if (spawns === 0) return

  let nextId = state.nextId
  let previousGap = state.previousGap
  let consecutiveGapCount = state.consecutiveGapCount
  const rows = [...state.rows]

  for (let index = 0; index < spawns; index += 1) {
    const y =
      (spawns - index - 1 + state.spawnElapsed) * BLOCK_HEIGHT - BLOCK_HEIGHT
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

  state.rows = rows
  state.nextId = nextId
  state.previousGap = previousGap
  state.consecutiveGapCount = consecutiveGapCount
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
  const cells: Cell[] = ['stone', 'stone', 'stone', 'stone']
  cells[gap] = 'empty'
  const reinforced = random() >= 1 - REINFORCED_SPAWN_CHANCE
  return [
    { id, y, cells, reinforced, cracked: false },
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
    cells[column] = 'tnt'
    return { ...row, cells }
  })
}

function crackRow(
  rows: readonly GameRow[],
  rowId: number,
  awaitingFinishingShot = false,
): GameRow[] {
  return rows.map((row) => {
    if (row.id !== rowId) return row
    return { ...row, cracked: true, awaitingFinishingShot }
  })
}

function clearPassThroughTntOnReinforcedAbove(
  sorted: GameRow[],
  removedRow: GameRow,
): void {
  const rowAbove = sorted[0]
  if (
    !rowAbove?.reinforced ||
    rowAbove.cracked ||
    !approximatelyEqual(rowAbove.y, removedRow.y - BLOCK_HEIGHT)
  ) {
    return
  }

  const tntColumn = rowAbove.cells.findIndex((cell) => cell === 'tnt')
  if (tntColumn < 0) return

  sorted[0] = {
    ...emptyCell(rowAbove, tntColumn as Column),
    cracked: true,
    awaitingFinishingShot: false,
  }
}

function emptyCell(row: GameRow, column: Column): GameRow {
  const cells = [...row.cells]
  cells[column] = 'empty'
  return { ...row, cells }
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

function scoreForCascade(removed: number, reinforcedRemoved = 0): number {
  if (removed === 0) return 0
  return removed * 2 - 1 + reinforcedRemoved
}

function approximatelyEqual(first: number, second: number): boolean {
  return Math.abs(first - second) < 0.001
}
