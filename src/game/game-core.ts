export const GAME_WIDTH = 360
export const GAME_HEIGHT = 800
export const PLAYFIELD_HEIGHT = 720
export const COLUMN_COUNT = 4
export const BLOCK_WIDTH = GAME_WIDTH / COLUMN_COUNT
export const BLOCK_HEIGHT = 45
export const FALL_SPEED = BLOCK_HEIGHT
export const SHOT_SPEED = BLOCK_HEIGHT * 12

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
  nextId: number
  previousGap: Column | null
  consecutiveGapCount: number
}

type Random = () => number

const preparationSeconds = 3

export function createGame(random: Random = Math.random): GameState {
  const [firstRow, previousGap, consecutiveGapCount] = createGeneratedRow(1, 0, null, 0, random)

  return {
    phase: 'preparing',
    rows: [firstRow],
    shots: [],
    score: 0,
    preparationRemaining: preparationSeconds,
    spawnElapsed: 0,
    nextId: 2,
    previousGap,
    consecutiveGapCount,
  }
}

export function startGame(state: GameState): GameState {
  return state.phase === 'preparing' ? { ...state, phase: 'playing', preparationRemaining: 0 } : state
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

export function advanceGame(state: GameState, elapsedSeconds: number, random: Random = Math.random): GameState {
  if (elapsedSeconds <= 0 || state.phase === 'paused' || state.phase === 'game-over') return state

  if (state.phase === 'preparing') {
    const remaining = state.preparationRemaining - elapsedSeconds
    return remaining > 0
      ? { ...state, preparationRemaining: remaining }
      : advanceGame({ ...state, phase: 'playing', preparationRemaining: 0 }, -remaining, random)
  }

  const shiftedRows = state.rows.map((row) => ({ ...row, y: row.y + FALL_SPEED * elapsedSeconds }))
  const movedShots = state.shots.map((shot) => ({ ...shot, y: shot.y - SHOT_SPEED * elapsedSeconds }))
  const afterCollisions = resolveShotCollisions({ ...state, rows: shiftedRows, shots: movedShots })
  const afterSpawning = spawnRows(afterCollisions, elapsedSeconds, random)
  const rowsAfterCascades = removeEligibleRows(afterSpawning.rows)
  const lost = rowsAfterCascades.rows.some((row) => row.y + BLOCK_HEIGHT >= PLAYFIELD_HEIGHT)

  return {
    ...afterSpawning,
    rows: rowsAfterCascades.rows,
    score: afterSpawning.score + scoreForCascade(rowsAfterCascades.removed),
    phase: lost ? 'game-over' : 'playing',
  }
}

function resolveShotCollisions(state: GameState): GameState {
  let rows = [...state.rows]
  let score = state.score
  let nextId = state.nextId
  const remainingShots: Shot[] = []

  for (const shot of state.shots) {
    const frontline = lowestRow(rows)
    if (!frontline || shot.y > frontline.y + BLOCK_HEIGHT) {
      if (shot.y + BLOCK_HEIGHT >= 0) remainingShots.push(shot)
      continue
    }

    const placedRows = placeShot(rows, frontline, shot.column)
    if (placedRows.length > rows.length) nextId = Math.max(nextId, nextRowId(placedRows) + 1)
    rows = placedRows
    const cascade = removeEligibleRows(rows)
    rows = cascade.rows
    score += scoreForCascade(cascade.removed)
  }

  return { ...state, rows, shots: remainingShots, score, nextId }
}

function placeShot(rows: readonly GameRow[], frontline: GameRow, column: Column): GameRow[] {
  if (!frontline.cells[column]) {
    const pairedRow = rows.find(
      (row) => approximatelyEqual(row.y, frontline.y - BLOCK_HEIGHT) && row.cells[column] === false,
    )
    if (pairedRow) return fillCell(rows, pairedRow.id, column)
    return fillCell(rows, frontline.id, column)
  }

  const rowBelow = rows.find((row) => approximatelyEqual(row.y, frontline.y + BLOCK_HEIGHT))
  if (rowBelow) return fillCell(rows, rowBelow.id, column)

  const cells = [false, false, false, false]
  cells[column] = true
  return [...rows, { id: nextRowId(rows), y: frontline.y + BLOCK_HEIGHT, cells }]
}

function removeEligibleRows(rows: readonly GameRow[]): { rows: GameRow[]; removed: number } {
  const sorted = [...rows].sort((a, b) => b.y - a.y)
  let removed = 0

  while (sorted[0] && sorted[0].cells.every(Boolean)) {
    sorted.shift()
    removed += 1
  }

  return { rows: sorted, removed }
}

function spawnRows(state: GameState, elapsedSeconds: number, random: Random): GameState {
  const accumulated = state.spawnElapsed + elapsedSeconds
  const spawns = Math.floor(accumulated)
  const spawnElapsed = accumulated - spawns
  let nextId = state.nextId
  let previousGap = state.previousGap
  let consecutiveGapCount = state.consecutiveGapCount
  const rows = [...state.rows]

  for (let index = 0; index < spawns; index += 1) {
    const y = (spawns - index - 1 + spawnElapsed) * BLOCK_HEIGHT
    const [row, gap, count] = createGeneratedRow(nextId, y, previousGap, consecutiveGapCount, random)
    rows.push(row)
    nextId += 1
    previousGap = gap
    consecutiveGapCount = count
  }

  return { ...state, rows, spawnElapsed, nextId, previousGap, consecutiveGapCount }
}

function createGeneratedRow(
  id: number,
  y: number,
  previousGap: Column | null,
  consecutiveGapCount: number,
  random: Random,
): [GameRow, Column, number] {
  let gap = Math.floor(random() * COLUMN_COUNT) as Column
  if (gap === previousGap && consecutiveGapCount >= 2) gap = ((gap + 1) % COLUMN_COUNT) as Column
  const cells = [true, true, true, true]
  cells[gap] = false
  return [{ id, y, cells }, gap, gap === previousGap ? consecutiveGapCount + 1 : 1]
}

function fillCell(rows: readonly GameRow[], rowId: number, column: Column): GameRow[] {
  return rows.map((row) => {
    if (row.id !== rowId) return row
    const cells = [...row.cells]
    cells[column] = true
    return { ...row, cells }
  })
}

function lowestRow(rows: readonly GameRow[]): GameRow | undefined {
  return rows.reduce<GameRow | undefined>((lowest, row) => (!lowest || row.y > lowest.y ? row : lowest), undefined)
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
