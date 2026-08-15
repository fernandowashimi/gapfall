import { describe, expect, it } from 'vitest'
import { advanceGame, BLOCK_HEIGHT, createGame, launchBlock, startGame } from './game-core'

describe('game core', () => {
  it('removes the lowest generated row when its empty slot is hit', () => {
    let game = startGame(createGame(() => 0.3))
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.3)

    expect(game.rows).toHaveLength(1)
    expect(game.score).toBe(1)
  })

  it('keeps generated rows touching while the board moves continuously', () => {
    const game = advanceGame(startGame(createGame(() => 0)), 2, () => 0)
    const positions = game.rows.map((row) => row.y).sort((a, b) => b - a)

    expect(positions).toEqual([BLOCK_HEIGHT * 2, BLOCK_HEIGHT, 0])
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

    expect(game.score).toBe(3)
    expect(game.rows.find((row) => row.id === 3)?.cells[1]).toBe(false)
  })
})
