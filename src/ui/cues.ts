import {
  isOccupied,
  type Cell,
  type Column,
  type GameRow,
  type GameState,
} from '../game/game-core'

export type FeedbackSound = 'launch' | 'detonate' | 'miss' | 'death' | 'crack'

export interface DetonationCue {
  y: number
  cells: readonly Cell[]
}

export interface FeedbackCues {
  detonations: DetonationCue[]
  sounds: readonly FeedbackSound[]
}

export function readCues(
  previous: GameState,
  next: GameState,
): FeedbackCues {
  const sounds: FeedbackSound[] = []
  const detonations: DetonationCue[] = []

  const previousShotIds = new Set(previous.shots.map((shot) => shot.id))
  for (const shot of next.shots) {
    if (!previousShotIds.has(shot.id)) sounds.push('launch')
  }

  const nextRowIds = new Set(next.rows.map((row) => row.id))
  const previousById = new Map(previous.rows.map((row) => [row.id, row]))
  const removedRows: GameRow[] = []
  for (const row of previous.rows) {
    if (nextRowIds.has(row.id)) continue
    removedRows.push(row)
    detonations.push({ y: row.y, cells: row.cells })
    sounds.push('detonate')
  }

  for (const row of next.rows) {
    const prior = previousById.get(row.id)
    if (prior && !prior.cracked && row.cracked) sounds.push('crack')
  }

  const nextShotIds = new Set(next.shots.map((shot) => shot.id))
  const consumedShots = previous.shots.filter((shot) => !nextShotIds.has(shot.id))
  const removedIds = new Set(removedRows.map((row) => row.id))
  const collisionRows = previous.rows.filter((row) => !removedIds.has(row.id))
  const frontline = frontlineRow(collisionRows)

  for (const shot of consumedShots) {
    if (
      frontline &&
      isOccupied(frontline.cells[shot.column]) &&
      !isReinforcedFinishingShot(frontline, shot.column)
    ) {
      sounds.push('miss')
    }
  }

  if (previous.phase !== 'game-over' && next.phase === 'game-over') {
    sounds.push('death')
  }

  return { detonations, sounds }
}

function frontlineRow(rows: readonly GameRow[]): GameRow | undefined {
  let frontline: GameRow | undefined
  for (const row of rows) {
    if (!frontline || row.y > frontline.y) frontline = row
  }
  return frontline
}

function isReinforcedFinishingShot(
  frontline: GameRow,
  column: Column,
): boolean {
  return (
    frontline.reinforced === true &&
    frontline.cracked === true &&
    frontline.awaitingFinishingShot === true &&
    frontline.cells[column] === 'tnt'
  )
}
