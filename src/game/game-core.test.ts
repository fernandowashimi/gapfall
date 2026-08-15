import { describe, expect, it } from 'vitest'
import { advanceGame, BLOCK_HEIGHT, createGame, launchBlock, startGame } from './game-core'

describe('game core', () => {
  it('removes the lowest generated row when its empty slot is hit', () => {
    let game = startGame(createGame(() => 0.3))
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.3)
    game = advanceGame(game, 0.001, () => 0.3)

    expect(game.rows).toHaveLength(1)
    expect(game.score).toBe(1)
  })

  it('keeps a completed line visible for one frame before detonating', () => {
    let game = startGame(createGame(() => 0.3))
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.3)

    expect(game.rows.some((row) => row.cells.every(Boolean))).toBe(true)
    expect(game.score).toBe(0)

    game = advanceGame(game, 0.001, () => 0.3)

    expect(game.rows.some((row) => row.cells.every(Boolean))).toBe(false)
    expect(game.score).toBe(1)
  })

  it('keeps generated rows touching while the board moves continuously', () => {
    const game = advanceGame(startGame(createGame(() => 0)), 2, () => 0)
    const positions = game.rows.map((row) => row.y).sort((a, b) => b - a)

    expect(positions).toEqual([BLOCK_HEIGHT, 0, -BLOCK_HEIGHT])
  })

  it('spawns new rows above the playfield so they scroll into view', () => {
    const game = advanceGame(startGame(createGame(() => 0)), 1, () => 0)
    const newest = Math.min(...game.rows.map((row) => row.y))

    expect(newest).toBe(-BLOCK_HEIGHT)
  })

  it('requires two shots to clear a consecutive pair with the same empty column', () => {
    let game = startGame(createGame(() => 0.3))
    game = advanceGame(game, 1, () => 0.3)
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.8)

    expect(game.score).toBe(0)
    expect(game.rows.some((row) => row.cells.every(Boolean))).toBe(true)

    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.8)

    expect(game.score).toBe(0)
    expect(game.rows.filter((row) => row.cells.every(Boolean))).toHaveLength(2)

    game = advanceGame(game, 0.001, () => 0.8)

    expect(game.score).toBe(3)
  })

  it('gives player-created rows unique identities before generating subsequent rows', () => {
    let game = startGame(createGame(() => 0))
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0)
    game = advanceGame(game, 1, () => 0)

    expect(new Set(game.rows.map((row) => row.id)).size).toBe(game.rows.length)
  })

  it('only lets a shot pass through an immediately adjacent matching gap', () => {
    let game = startGame(createGame(() => 0))
    game = {
      ...game,
      rows: [
        { id: 1, y: 120, cells: [true, false, true, true] },
        { id: 2, y: 75, cells: [true, true, true, true] },
        { id: 3, y: 30, cells: [true, false, true, true] },
      ],
    }
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0)

    expect(game.score).toBe(0)
    expect(game.rows.find((row) => row.id === 1)?.cells.every(Boolean)).toBe(true)

    game = advanceGame(game, 0.001, () => 0)

    expect(game.score).toBe(3)
    expect(game.rows.find((row) => row.id === 3)?.cells[1]).toBe(false)
  })

  it('travels through the lower gap before filling a consecutive upper gap', () => {
    let game = startGame(createGame(() => 0))
    game = {
      ...game,
      rows: [
        { id: 1, y: 200, cells: [true, false, true, true] },
        { id: 2, y: 155, cells: [true, false, true, true] },
      ],
      shots: [{ id: 99, column: 1, y: 200 + BLOCK_HEIGHT - 1 }],
    }

    game = advanceGame(game, 0.001, () => 0)

    expect(game.shots).toHaveLength(1)
    expect(game.rows.find((row) => row.id === 1)?.cells[1]).toBe(false)
    expect(game.rows.find((row) => row.id === 2)?.cells[1]).toBe(false)

    game = advanceGame(game, 0.2, () => 0)

    expect(game.shots).toHaveLength(0)
    expect(game.rows.find((row) => row.id === 1)?.cells[1]).toBe(false)
    expect(game.rows.find((row) => row.id === 2)?.cells[1]).toBe(true)
  })

  it('fills the topmost gap in an arbitrarily long consecutive empty column', () => {
    let game = startGame(createGame(() => 0))
    game = {
      ...game,
      rows: [
        { id: 1, y: 300, cells: [true, false, true, true] },
        { id: 2, y: 255, cells: [true, false, true, true] },
        { id: 3, y: 210, cells: [true, false, true, true] },
        { id: 4, y: 165, cells: [true, false, true, true] },
      ],
      shots: [{ id: 99, column: 1, y: 300 + BLOCK_HEIGHT - 1 }],
    }

    game = advanceGame(game, 0.001, () => 0)

    expect(game.shots).toHaveLength(1)
    expect(game.rows.map((row) => row.cells[1])).toEqual([false, false, false, false])

    game = advanceGame(game, 0.4, () => 0)

    expect(game.shots).toHaveLength(0)
    expect(game.rows.find((row) => row.id === 4)?.cells[1]).toBe(true)
    expect(game.rows.filter((row) => row.id !== 4).every((row) => row.cells[1] === false)).toBe(true)

    game = { ...game, shots: [{ id: 100, column: 1, y: lowestFilledBottom(game) }] }
    game = advanceGame(game, 0.5, () => 0)

    expect(game.rows.find((row) => row.id === 3)?.cells[1]).toBe(true)
    expect(game.rows.find((row) => row.id === 1)?.cells[1]).toBe(false)
    expect(game.rows.find((row) => row.id === 2)?.cells[1]).toBe(false)
  })
})

function lowestFilledBottom(game: { rows: readonly { y: number }[] }): number {
  const lowestY = Math.max(...game.rows.map((row) => row.y))
  return lowestY + BLOCK_HEIGHT - 1
}
