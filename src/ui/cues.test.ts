import { describe, expect, it } from 'vitest'
import {
  advanceGame,
  BLOCK_HEIGHT,
  createGame,
  launchBlock,
  pauseGame,
  startGame,
  type Cell,
  type Column,
  type GameState,
} from '../game/game-core'
import { readCues } from './cues'

const stone = 'stone' as const
const empty = 'empty' as const
const tnt = 'tnt' as const

function generatedCells(gap: Column): Cell[] {
  const cells: Cell[] = [stone, stone, stone, stone]
  cells[gap] = empty
  return cells
}

function createGameAtBaseFallSpeed(random: () => number) {
  return createGame(random, { speedCapMultiplier: 1 })
}

function snapshotGame(game: GameState): GameState {
  return {
    ...game,
    rows: game.rows.map((row) => ({ ...row, cells: [...row.cells] })),
    shots: game.shots.map((shot) => ({ ...shot })),
  }
}

describe('readCues', () => {
  it('emits launch when a shot is added during play', () => {
    const before = startGame(createGameAtBaseFallSpeed(() => 0.3))
    const after = launchBlock(before, 1)

    expect(readCues(before, after)).toEqual({
      detonations: [],
      sounds: ['launch'],
    })
  })

  it('emits nothing when launch is a no-op outside play', () => {
    const before = createGameAtBaseFallSpeed(() => 0.3)
    const after = launchBlock(before, 1)

    expect(after).toBe(before)
    expect(readCues(before, after)).toEqual({
      detonations: [],
      sounds: [],
    })
  })

  it('emits no detonation or miss when a fill only completes a line', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0.3))
    game = launchBlock(game, 1)
    const before = snapshotGame(game)
    const after = advanceGame(game, 1.5, () => 0.3)

    expect(
      after.rows.some((row) => row.cells.every((cell) => cell !== empty)),
    ).toBe(true)
    expect(after.score).toBe(0)
    expect(readCues(before, after)).toEqual({
      detonations: [],
      sounds: [],
    })
  })

  it('emits one detonation after the one-tick hold removes a line', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0.3))
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.3)
    const completed = game.rows.find((row) =>
      row.cells.every((cell) => cell !== empty),
    )
    expect(completed).toBeDefined()
    const before = snapshotGame(game)
    const after = advanceGame(game, 0.001, () => 0.3)

    expect(after.score).toBe(1)
    expect(readCues(before, after)).toEqual({
      detonations: [{ y: completed!.y, cells: completed!.cells }],
      sounds: ['detonate'],
    })
  })

  it('emits stacked detonations for a two-line cascade', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0.3))
    game = advanceGame(game, 1, () => 0.3)
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.8)
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.8)
    const completed = game.rows
      .filter((row) => row.cells.every((cell) => cell !== empty))
      .sort((a, b) => b.y - a.y)
    expect(completed).toHaveLength(2)
    const before = snapshotGame(game)
    const after = advanceGame(game, 0.001, () => 0.8)

    expect(after.score).toBe(3)
    expect(readCues(before, after)).toEqual({
      detonations: completed.map((row) => ({ y: row.y, cells: row.cells })),
      sounds: ['detonate', 'detonate'],
    })
  })

  it('emits miss when a shot stacks into a partial line', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [{ id: 1, y: 200, cells: generatedCells(1) }],
      shots: [],
    }
    game = launchBlock(game, 0)
    const before = snapshotGame(game)
    const after = advanceGame(game, 1.5, () => 0)

    expect(after.rows.some((row) => row.y > 200)).toBe(true)
    expect(readCues(before, after)).toEqual({
      detonations: [],
      sounds: ['miss'],
    })
  })

  it('emits no miss when filling the higher gap of a same-column pair', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [
        { id: 1, y: 200, cells: generatedCells(1) },
        { id: 2, y: 155, cells: generatedCells(1) },
      ],
      shots: [{ id: 99, column: 1, y: 200 + BLOCK_HEIGHT - 1 }],
    }
    const before = snapshotGame(game)
    let after = advanceGame(game, 0.001, () => 0)
    after = advanceGame(after, 0.2, () => 0)

    expect(after.rows.find((row) => row.id === 2)?.cells[1]).toBe(tnt)
    expect(readCues(before, after)).toEqual({
      detonations: [],
      sounds: [],
    })
  })

  it('emits death when the phase becomes game-over', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [{ id: 1, y: 720 - BLOCK_HEIGHT, cells: generatedCells(1) }],
      shots: [],
    }
    const before = snapshotGame(game)
    const after = advanceGame(game, 1, () => 0)

    expect(after.phase).toBe('game-over')
    expect(readCues(before, after)).toEqual({
      detonations: [],
      sounds: ['death'],
    })
  })

  it('emits nothing while paused with unchanged public state', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0.3))
    game = pauseGame(game)
    const before = game
    const after = advanceGame(before, 0.5, () => 0.3)

    expect(after).toEqual(before)
    expect(readCues(before, after)).toEqual({
      detonations: [],
      sounds: [],
    })
  })

  it('emits crack without detonate when a Reinforced Frontline Cracks', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [
        {
          id: 1,
          y: 200,
          cells: generatedCells(1),
          reinforced: true,
          cracked: false,
        },
      ],
      shots: [{ id: 99, column: 1, y: 200 + BLOCK_HEIGHT - 1 }],
    }
    const before = snapshotGame(game)
    const after = advanceGame(game, 0.001, () => 0)

    expect(after.rows[0]?.cracked).toBe(true)
    expect(readCues(before, after)).toEqual({
      detonations: [],
      sounds: ['crack'],
    })
  })

  it('emits crack when a complete Reinforced Line is promoted to Frontline', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [
        { id: 1, y: 200, cells: generatedCells(1) },
        {
          id: 2,
          y: 155,
          cells: [stone, tnt, stone, stone],
          reinforced: true,
          cracked: false,
        },
      ],
      shots: [{ id: 99, column: 1, y: 200 + BLOCK_HEIGHT - 1 }],
    }
    game = advanceGame(game, 0.001, () => 0)
    const before = snapshotGame(game)
    const after = advanceGame(game, 0.001, () => 0)

    expect(after.rows.find((row) => row.id === 2)?.cracked).toBe(true)
    expect(readCues(before, after)).toEqual({
      detonations: [{ y: before.rows[0].y, cells: before.rows[0].cells }],
      sounds: ['detonate', 'crack'],
    })
  })

  it('emits detonate not crack when a Reinforced Line is removed', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [
        {
          id: 1,
          y: 200,
          cells: [stone, tnt, stone, stone],
          reinforced: true,
          cracked: true,
        },
      ],
      shots: [],
    }
    const before = snapshotGame(game)
    const after = advanceGame(game, 0.001, () => 0)

    expect(after.score).toBe(2)
    expect(readCues(before, after)).toEqual({
      detonations: [{ y: before.rows[0].y, cells: before.rows[0].cells }],
      sounds: ['detonate'],
    })
  })

  it('emits neither crack nor miss when filling a higher Reinforced Line', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [
        { id: 1, y: 200, cells: generatedCells(1) },
        {
          id: 2,
          y: 155,
          cells: generatedCells(1),
          reinforced: true,
          cracked: false,
        },
      ],
      shots: [{ id: 99, column: 1, y: 200 + BLOCK_HEIGHT - 1 }],
    }
    const before = snapshotGame(game)
    let after = advanceGame(game, 0.001, () => 0)
    after = advanceGame(after, 0.2, () => 0)

    expect(after.rows.find((row) => row.id === 2)?.cells[1]).toBe(tnt)
    expect(readCues(before, after)).toEqual({
      detonations: [],
      sounds: [],
    })
  })

  it('emits no miss when a Shot finishes a complete Cracked Frontline', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [
        {
          id: 1,
          y: 200,
          cells: [stone, tnt, stone, stone],
          reinforced: true,
          cracked: true,
          awaitingFinishingShot: true,
        },
      ],
      shots: [{ id: 99, column: 1, y: 200 + BLOCK_HEIGHT - 1 }],
    }
    const before = snapshotGame(game)
    const after = advanceGame(game, 0.001, () => 0)

    expect(after.rows).toHaveLength(1)
    expect(readCues(before, after)).toEqual({
      detonations: [],
      sounds: [],
    })
  })
})
