import { describe, expect, it } from 'vitest'
import {
  advanceGame,
  BLOCK_HEIGHT,
  createGame,
  isRowComplete,
  launchBlock,
  pauseGame,
  PLAYFIELD_HEIGHT,
  resumeGame,
  SHOT_SPEED,
  startGame,
  type Cell,
  type Column,
} from './game-core'

const stone = 'stone' as const
const empty = 'empty' as const
const tnt = 'tnt' as const

function generatedCells(gap: Column): Cell[] {
  const cells: Cell[] = [stone, stone, stone, stone]
  cells[gap] = empty
  return cells
}

function completeCells(): Cell[] {
  return [stone, stone, stone, stone]
}

describe('game core', () => {
  it('removes the lowest generated row when its empty slot is hit', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0.3))
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.3)
    game = advanceGame(game, 0.001, () => 0.3)

    expect(game.rows).toHaveLength(1)
    expect(game.score).toBe(1)
  })

  it('keeps a completed line visible for one frame before detonating', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0.3))
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.3)

    expect(game.rows.some(isRowComplete)).toBe(true)
    expect(game.score).toBe(0)

    game = advanceGame(game, 0.001, () => 0.3)

    expect(game.rows.some(isRowComplete)).toBe(false)
    expect(game.score).toBe(1)
  })

  it('keeps a placed shot as tnt instead of turning it into stone', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0.3))
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.3)

    const completed = game.rows.find(isRowComplete)
    expect(completed?.cells[1]).toBe(tnt)
    expect(completed?.cells.filter((cell) => cell === stone)).toHaveLength(3)
  })

  it('keeps generated rows touching while the board moves continuously', () => {
    const game = advanceGame(
      startGame(createGameAtBaseFallSpeed(() => 0)),
      2,
      () => 0,
    )
    const positions = game.rows.map((row) => row.y).sort((a, b) => b - a)

    expect(positions).toEqual([BLOCK_HEIGHT, 0, -BLOCK_HEIGHT])
  })

  it('spawns new rows above the playfield so they scroll into view', () => {
    const game = advanceGame(
      startGame(createGameAtBaseFallSpeed(() => 0)),
      1,
      () => 0,
    )
    const newest = Math.min(...game.rows.map((row) => row.y))

    expect(newest).toBe(-BLOCK_HEIGHT)
  })

  it('requires two shots to clear a consecutive pair with the same empty column', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0.3))
    game = advanceGame(game, 1, () => 0.3)
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.8)

    expect(game.score).toBe(0)
    expect(game.rows.some(isRowComplete)).toBe(true)

    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.8)

    expect(game.score).toBe(0)
    expect(game.rows.filter(isRowComplete)).toHaveLength(2)

    game = advanceGame(game, 0.001, () => 0.8)

    expect(game.score).toBe(3)
  })

  it('gives player-created rows unique identities before generating subsequent rows', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0)
    game = advanceGame(game, 1, () => 0)

    expect(new Set(game.rows.map((row) => row.id)).size).toBe(game.rows.length)
  })

  it('only lets a shot pass through an immediately adjacent matching gap', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [
        { id: 1, y: 120, cells: generatedCells(1) },
        { id: 2, y: 75, cells: completeCells() },
        { id: 3, y: 30, cells: generatedCells(1) },
      ],
    }
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0)

    expect(game.score).toBe(0)
    expect(game.rows.find((row) => row.id === 1)?.cells).toEqual([
      stone,
      tnt,
      stone,
      stone,
    ])

    game = advanceGame(game, 0.001, () => 0)

    expect(game.score).toBe(3)
    expect(game.rows.find((row) => row.id === 3)?.cells[1]).toBe(empty)
  })

  it('travels through the lower gap before filling a consecutive upper gap', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [
        { id: 1, y: 200, cells: generatedCells(1) },
        { id: 2, y: 155, cells: generatedCells(1) },
      ],
      shots: [{ id: 99, column: 1, y: 200 + BLOCK_HEIGHT - 1 }],
    }

    game = advanceGame(game, 0.001, () => 0)

    expect(game.shots).toHaveLength(1)
    expect(game.rows.find((row) => row.id === 1)?.cells[1]).toBe(empty)
    expect(game.rows.find((row) => row.id === 2)?.cells[1]).toBe(empty)

    game = advanceGame(game, 0.2, () => 0)

    expect(game.shots).toHaveLength(0)
    expect(game.rows.find((row) => row.id === 1)?.cells[1]).toBe(empty)
    expect(game.rows.find((row) => row.id === 2)?.cells[1]).toBe(tnt)
  })

  it('fills the topmost gap in an arbitrarily long consecutive empty column', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [
        { id: 1, y: 300, cells: generatedCells(1) },
        { id: 2, y: 255, cells: generatedCells(1) },
        { id: 3, y: 210, cells: generatedCells(1) },
        { id: 4, y: 165, cells: generatedCells(1) },
      ],
      shots: [{ id: 99, column: 1, y: 300 + BLOCK_HEIGHT - 1 }],
    }

    game = advanceGame(game, 0.001, () => 0)

    expect(game.shots).toHaveLength(1)
    expect(game.rows.map((row) => row.cells[1])).toEqual([
      empty,
      empty,
      empty,
      empty,
    ])

    game = advanceGame(game, 0.4, () => 0)

    expect(game.shots).toHaveLength(0)
    expect(game.rows.find((row) => row.id === 4)?.cells[1]).toBe(tnt)
    expect(
      game.rows
        .filter((row) => row.id !== 4)
        .every((row) => row.cells[1] === empty),
    ).toBe(true)

    game = {
      ...game,
      shots: [{ id: 100, column: 1, y: lowestFilledBottom(game) }],
    }
    game = advanceGame(game, 0.5, () => 0)

    expect(game.rows.find((row) => row.id === 3)?.cells[1]).toBe(tnt)
    expect(game.rows.find((row) => row.id === 1)?.cells[1]).toBe(empty)
    expect(game.rows.find((row) => row.id === 2)?.cells[1]).toBe(empty)
  })

  it('starts a round at playing time zero', () => {
    const game = createGame(() => 0)

    expect(game.playingTime).toBe(0)
  })

  it('does not advance playing time during preparation', () => {
    const game = advanceGame(
      createGame(() => 0),
      2,
      () => 0,
    )

    expect(game.phase).toBe('preparing')
    expect(game.playingTime).toBe(0)
  })

  it('counts leftover preparation into playing time', () => {
    const game = advanceGame(
      createGame(() => 0),
      3.25,
      () => 0,
    )

    expect(game.phase).toBe('playing')
    expect(game.playingTime).toBe(0.25)
  })

  it('does not advance playing time while paused', () => {
    let game = startGame(createGame(() => 0))
    game = advanceGame(game, 1, () => 0)
    game = pauseGame(game)
    game = advanceGame(game, 5, () => 0)

    expect(game.playingTime).toBe(1)
  })

  it('does not advance playing time after game-over', () => {
    let game = startGame(createGame(() => 0))
    game = {
      ...game,
      rows: [
        {
          id: 1,
          y: PLAYFIELD_HEIGHT - BLOCK_HEIGHT,
          cells: generatedCells(1),
        },
      ],
    }
    game = advanceGame(game, 0.001, () => 0)
    const timeAtLoss = game.playingTime
    game = advanceGame(game, 5, () => 0)

    expect(game.phase).toBe('game-over')
    expect(game.playingTime).toBe(timeAtLoss)
  })

  it('does not add playing time when starting a round', () => {
    const started = startGame(createGame(() => 0))

    expect(started.playingTime).toBe(0)
    expect(started.phase).toBe('playing')
  })

  it('does not add playing time when resuming', () => {
    let game = startGame(createGame(() => 0))
    game = advanceGame(game, 1, () => 0)
    game = pauseGame(game)
    game = resumeGame(game)

    expect(game.playingTime).toBe(1)
    expect(game.phase).toBe('playing')
  })

  it('falls at one block-height per second at playing time zero', () => {
    const travel = travelAfterPlayingTime(0, 0.001)

    expect(travel).toBeCloseTo(BLOCK_HEIGHT * 0.001)
  })

  it('falls at two and two-thirds block-heights per second at forty seconds', () => {
    const travel = travelAfterPlayingTime(40, 0.001)

    expect(travel).toBeCloseTo(BLOCK_HEIGHT * (1 + (5 / 120) * 40) * 0.001)
  })

  it('falls at three and a half block-heights per second at sixty seconds', () => {
    const travel = travelAfterPlayingTime(60, 0.001)

    expect(travel).toBeCloseTo(BLOCK_HEIGHT * 3.5 * 0.001)
  })

  it('falls at six block-heights per second at one hundred twenty seconds', () => {
    const travel = travelAfterPlayingTime(120, 0.001)

    expect(travel).toBeCloseTo(BLOCK_HEIGHT * 6 * 0.001)
  })

  it('holds the speed cap after the ramp duration', () => {
    const travel = travelAfterPlayingTime(150, 0.001)

    expect(travel).toBeCloseTo(BLOCK_HEIGHT * 6 * 0.001)
  })

  it('keeps generated rows packed while fall speed ramps', () => {
    const game = advanceGame(startGame(createGame(() => 0)), 8, () => 0)
    const positions = game.rows.map((row) => row.y).sort((a, b) => b - a)

    expect(positions[0]).toBeGreaterThan(BLOCK_HEIGHT)
    for (let index = 0; index < positions.length - 1; index += 1) {
      expect(positions[index] - positions[index + 1]).toBeCloseTo(BLOCK_HEIGHT)
    }
  })

  it('matches one large playing-time step with many small steps', () => {
    const random = () => 0
    const large = advanceGame(startGame(createGame(random)), 4, random)
    let small = startGame(createGame(random))
    for (let step = 0; step < 8; step += 1) {
      small = advanceGame(small, 0.5, random)
    }

    expect(small.playingTime).toBeCloseTo(large.playingTime)
    const largePositions = large.rows.map((row) => row.y).sort((a, b) => b - a)
    const smallPositions = small.rows.map((row) => row.y).sort((a, b) => b - a)
    expect(smallPositions).toHaveLength(largePositions.length)
    for (let index = 0; index < largePositions.length; index += 1) {
      expect(smallPositions[index]).toBeCloseTo(largePositions[index], 5)
    }
  })

  it('matches one step that crosses the speed cap with many small steps', () => {
    const large = travelStateAfter(59.5, 1)
    let small = travelStateAfter(59.5, 0.5)
    small = advanceGame(small, 0.5, () => 0)

    expect(small.playingTime).toBeCloseTo(large.playingTime)
    expect(small.rows[0].y).toBeCloseTo(large.rows[0].y, 5)
  })

  it('keeps shot speed constant at the speed cap', () => {
    let game = startGame(createGame(() => 0))
    game = {
      ...game,
      playingTime: 60,
      rows: [{ id: 1, y: 0, cells: generatedCells(1) }],
      shots: [{ id: 99, column: 1, y: 400 }],
    }
    game = advanceGame(game, 0.1, () => 0)

    expect(game.shots[0]?.y).toBeCloseTo(400 - SHOT_SPEED * 0.1)
  })

  it('uses injected speed cap and ramp duration', () => {
    const travel = travelAfterPlayingTime(10, 0.001, {
      speedCapMultiplier: 5,
      rampDuration: 10,
    })

    expect(travel).toBeCloseTo(BLOCK_HEIGHT * 5 * 0.001)
  })

  it('stores fall-speed knobs on the game state', () => {
    const game = createGame(() => 0)

    expect(game.fallSpeedConfig).toEqual({
      baseFallSpeed: 1,
      speedCapMultiplier: 6,
      rampDuration: 120,
    })
  })

  it('still scores one for a single line clear while fall speed ramps', () => {
    let game = startGame(createGame(() => 0.3))
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.3)
    game = advanceGame(game, 0.001, () => 0.3)

    expect(game.score).toBe(1)
  })

  it('still scores three for a double cascade while fall speed ramps', () => {
    let game = startGame(createGame(() => 0.3))
    game = advanceGame(game, 1, () => 0.3)
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.8)
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.8)
    game = advanceGame(game, 0.001, () => 0.8)

    expect(game.score).toBe(3)
  })

  it('keeps the same row objects on a quiet playing tick', () => {
    const game = startGame(createGameAtBaseFallSpeed(() => 0.3))
    const row = game.rows[0]
    const y = row.y

    const next = advanceGame(game, 0.001, () => 0.3)

    expect(next.rows).toHaveLength(1)
    expect(next.rows[0]).toBe(row)
    expect(next.rows[0].y).toBeGreaterThan(y)
    expect(next.playingTime).toBeCloseTo(0.001)
  })

  it('keeps previous row objects when a generated line spawns', () => {
    const game = startGame(createGameAtBaseFallSpeed(() => 0))
    const original = game.rows[0]

    const next = advanceGame(game, 1, () => 0)

    expect(next.rows).toHaveLength(2)
    expect(next.rows).toContain(original)
    expect(next.rows.some((row) => row !== original)).toBe(true)
  })

  it('keeps the same shot objects while they only travel', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [{ id: 1, y: 0, cells: generatedCells(1) }],
      shots: [{ id: 99, column: 1, y: 400 }],
    }
    const shot = game.shots[0]
    const y = shot.y

    const next = advanceGame(game, 0.001, () => 0)

    expect(next.shots).toHaveLength(1)
    expect(next.shots[0]).toBe(shot)
    expect(next.shots[0].y).toBeLessThan(y)
  })

  it('keeps survivor row objects after the one-tick detonation', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0.3))
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.3)
    const survivors = game.rows.filter((row) => !isRowComplete(row))

    const next = advanceGame(game, 0.001, () => 0.3)

    expect(next.score).toBe(1)
    expect(next.rows.some(isRowComplete)).toBe(false)
    for (const row of survivors) {
      expect(next.rows).toContain(row)
    }
  })

  it('keeps survivor row objects after a two-line cascade', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0.3))
    game = advanceGame(game, 1, () => 0.3)
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.8)
    game = launchBlock(game, 1)
    game = advanceGame(game, 1.5, () => 0.8)
    const survivors = game.rows.filter((row) => !isRowComplete(row))

    const next = advanceGame(game, 0.001, () => 0.8)

    expect(next.score).toBe(3)
    expect(next.rows.some(isRowComplete)).toBe(false)
    for (const row of survivors) {
      expect(next.rows).toContain(row)
    }
  })

  it('replaces only the filled row and keeps unrelated row objects', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [
        { id: 1, y: 200, cells: generatedCells(1) },
        { id: 2, y: 155, cells: generatedCells(0) },
      ],
      shots: [{ id: 99, column: 1, y: 200 + BLOCK_HEIGHT - 1 }],
    }
    const frontline = game.rows[0]
    const unrelated = game.rows[1]

    const next = advanceGame(game, 0.001, () => 0)

    expect(next.rows.find((row) => row.id === 1)?.cells[1]).toBe(tnt)
    expect(next.rows.find((row) => row.id === 1)).not.toBe(frontline)
    expect(next.rows.find((row) => row.id === 2)).toBe(unrelated)
  })

  it('keeps the frontline object when a miss stacks a new partial line', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [{ id: 1, y: 200, cells: generatedCells(1) }],
      shots: [{ id: 99, column: 0, y: 200 + BLOCK_HEIGHT - 1 }],
    }
    const frontline = game.rows[0]

    const next = advanceGame(game, 0.001, () => 0)

    expect(next.rows).toContain(frontline)
    expect(next.rows.some((row) => row !== frontline)).toBe(true)
    expect(next.shots).toHaveLength(0)
  })

  it('does not mutate the input when launching a shot', () => {
    const before = startGame(createGameAtBaseFallSpeed(() => 0.3))
    const shots = before.shots

    const next = launchBlock(before, 1)

    expect(next).not.toBe(before)
    expect(before.shots).toBe(shots)
    expect(before.shots).toHaveLength(0)
    expect(next.shots).toHaveLength(1)
  })

  it('spawns a Reinforced Line when the reinforce roll hits', () => {
    const game = createGame(randomFrom([0.3, 0.9]))

    expect(game.rows[0]?.reinforced).toBe(true)
    expect(game.rows[0]?.cracked).toBe(false)
    expect(game.rows[0]?.cells).toEqual(generatedCells(1))
  })

  it('spawns Reinforced Lines at roughly fifteen percent with injectable RNG', () => {
    let reinforced = 0
    for (let index = 0; index < 100; index += 1) {
      const game = createGame(() => (index % 10) / 10)
      if (game.rows[0]?.reinforced) reinforced += 1
    }

    expect(reinforced).toBeGreaterThanOrEqual(5)
    expect(reinforced).toBeLessThanOrEqual(25)
  })

  it('clears a normal Frontline under a pre-filled Reinforced Line', () => {
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
    expect(game.rows.find((row) => row.id === 1)?.cells[1]).toBe(tnt)
    expect(game.score).toBe(0)

    game = advanceGame(game, 0.001, () => 0)
    expect(game.rows.find((row) => row.id === 1)).toBeUndefined()
    expect(game.rows.find((row) => row.id === 2)?.cracked).toBe(true)
    expect(game.score).toBe(1)

    game = {
      ...game,
      shots: [{ id: 100, column: 1, y: lowestFilledBottom(game) }],
    }
    game = advanceGame(game, 0.001, () => 0)
    expect(game.rows).toHaveLength(1)
    game = advanceGame(game, 0.001, () => 0)
    expect(game.rows).toHaveLength(0)
    expect(game.score).toBe(3)
  })

  it('keeps the empty-slot repeat cap when the next line is Reinforced', () => {
    const random = randomFrom([0.3, 0, 0.3, 0, 0.3, 0.9])
    const game = advanceGame(
      startGame(createGameAtBaseFallSpeed(random)),
      2,
      random,
    )
    const newest = game.rows.reduce((lowest, row) =>
      row.y < lowest.y ? row : lowest,
    )

    expect(newest.cells[1]).toBe(stone)
    expect(newest.cells[2]).toBe(empty)
    expect(newest.reinforced).toBe(true)
  })

  it('never marks a Partial Line as Reinforced', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [{ id: 1, y: 200, cells: generatedCells(1) }],
      shots: [{ id: 99, column: 0, y: 200 + BLOCK_HEIGHT - 1 }],
    }
    const next = advanceGame(game, 0.001, () => 0)
    const partial = next.rows.find((row) => row.y > 200)

    expect(partial).toBeDefined()
    expect(partial?.reinforced).toBeFalsy()
  })

  it('cracks an intact Reinforced Frontline without filling the empty slot', () => {
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
    const next = advanceGame(game, 0.001, () => 0)
    const frontline = next.rows.find((row) => row.id === 1)

    expect(next.shots).toHaveLength(0)
    expect(frontline?.cracked).toBe(true)
    expect(frontline?.cells[1]).toBe(empty)
    expect(next.score).toBe(0)
  })

  it('fills then removes a Cracked Reinforced Frontline for a bonus point', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [
        {
          id: 1,
          y: 200,
          cells: generatedCells(1),
          reinforced: true,
          cracked: true,
        },
      ],
      shots: [{ id: 99, column: 1, y: 200 + BLOCK_HEIGHT - 1 }],
    }
    game = advanceGame(game, 0.001, () => 0)
    const filled = game.rows.find((row) => row.id === 1)

    expect(filled?.cells[1]).toBe(tnt)
    expect(filled?.cracked).toBe(true)
    expect(game.score).toBe(0)

    game = advanceGame(game, 0.001, () => 0)

    expect(game.rows.find((row) => row.id === 1)).toBeUndefined()
    expect(game.score).toBe(2)
  })

  it('passes through a Cracked Frontline to fill a higher same-column gap', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [
        {
          id: 1,
          y: 200,
          cells: generatedCells(1),
          reinforced: true,
          cracked: true,
        },
        { id: 2, y: 155, cells: generatedCells(1) },
      ],
      shots: [{ id: 99, column: 1, y: 200 + BLOCK_HEIGHT - 1 }],
    }
    game = advanceGame(game, 0.001, () => 0)
    game = advanceGame(game, 0.2, () => 0)

    expect(game.rows.find((row) => row.id === 1)?.cells[1]).toBe(empty)
    expect(game.rows.find((row) => row.id === 1)?.cracked).toBe(true)
    expect(game.rows.find((row) => row.id === 2)?.cells[1]).toBe(tnt)
  })

  it('places tnt on a higher intact Reinforced Line without Cracking it', () => {
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
    game = advanceGame(game, 0.001, () => 0)
    game = advanceGame(game, 0.2, () => 0)
    const higher = game.rows.find((row) => row.id === 2)

    expect(game.rows.find((row) => row.id === 1)?.cells[1]).toBe(empty)
    expect(higher?.cells[1]).toBe(tnt)
    expect(higher?.cracked).toBe(false)
    expect(higher?.reinforced).toBe(true)
  })

  it('cracks a complete Reinforced Line when it becomes the Frontline', () => {
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
    expect(game.rows.find((row) => row.id === 1)?.cells[1]).toBe(tnt)

    game = advanceGame(game, 0.001, () => 0)
    const promoted = game.rows.find((row) => row.id === 2)

    expect(game.rows.find((row) => row.id === 1)).toBeUndefined()
    expect(promoted?.cracked).toBe(true)
    expect(promoted?.cells[1]).toBe(tnt)
    expect(game.score).toBe(1)
  })

  it('removes a complete Cracked Frontline only from a Shot in the tnt column', () => {
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
    game = advanceGame(game, 0.001, () => 0)
    expect(game.rows).toHaveLength(1)
    expect(game.score).toBe(0)

    game = advanceGame(game, 0.001, () => 0)
    expect(game.rows).toHaveLength(0)
    expect(game.score).toBe(2)
  })

  it('stacks a Partial Line when a Shot misses the tnt column of a complete Cracked Frontline', () => {
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
      shots: [{ id: 99, column: 0, y: 200 + BLOCK_HEIGHT - 1 }],
    }
    const next = advanceGame(game, 0.001, () => 0)
    const partial = next.rows.find((row) => row.id !== 1)

    expect(next.rows.find((row) => row.id === 1)).toBeDefined()
    expect(partial?.cells[0]).toBe(tnt)
    expect(next.score).toBe(0)
  })

  it('clears two stacked Reinforced Lines in the same column with four Shots', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      nextId: 200,
      rows: [
        {
          id: 1,
          y: 200,
          cells: generatedCells(1),
          reinforced: true,
          cracked: false,
        },
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

    game = advanceGame(game, 0.001, () => 0)
    game = advanceGame(game, 0.2, () => 0)
    expect(game.rows.find((row) => row.id === 2)?.cells[1]).toBe(tnt)
    expect(game.rows.find((row) => row.id === 2)?.cracked).toBe(false)
    expect(game.rows.find((row) => row.id === 1)?.cells[1]).toBe(empty)

    game = {
      ...game,
      shots: [{ id: 100, column: 1, y: lowestFilledBottom(game) }],
    }
    game = advanceGame(game, 0.001, () => 0)
    expect(game.rows.find((row) => row.id === 1)?.cracked).toBe(true)
    expect(game.rows.find((row) => row.id === 1)?.cells[1]).toBe(empty)

    game = {
      ...game,
      shots: [{ id: 101, column: 1, y: lowestFilledBottom(game) }],
    }
    game = advanceGame(game, 0.001, () => 0)
    expect(game.rows.find((row) => row.id === 1)?.cells[1]).toBe(tnt)
    expect(game.score).toBe(0)

    game = advanceGame(game, 0.001, () => 0)
    expect(game.rows.find((row) => row.id === 1)).toBeUndefined()
    expect(game.rows.find((row) => row.id === 2)?.cracked).toBe(true)
    expect(game.score).toBe(2)

    game = {
      ...game,
      shots: [{ id: 102, column: 1, y: lowestFilledBottom(game) }],
    }
    game = advanceGame(game, 0.001, () => 0)
    expect(game.rows).toHaveLength(1)
    expect(game.score).toBe(2)

    game = advanceGame(game, 0.001, () => 0)
    expect(game.rows.find((row) => row.id === 2)).toBeUndefined()
    expect(game.score).toBe(4)
  })

  it('adds the Reinforced bonus on a two-line Cascade', () => {
    let game = startGame(createGameAtBaseFallSpeed(() => 0))
    game = {
      ...game,
      rows: [
        {
          id: 1,
          y: 200,
          cells: generatedCells(1),
          reinforced: true,
          cracked: true,
        },
        { id: 2, y: 155, cells: completeCells() },
      ],
      shots: [{ id: 99, column: 1, y: 200 + BLOCK_HEIGHT - 1 }],
    }
    game = advanceGame(game, 0.001, () => 0)
    expect(game.rows.find((row) => row.id === 1)?.cells[1]).toBe(tnt)

    game = advanceGame(game, 0.001, () => 0)
    expect(game.rows.find((row) => row.id === 1)).toBeUndefined()
    expect(game.rows.find((row) => row.id === 2)).toBeUndefined()
    expect(game.score).toBe(4)
  })

  it('returns the same state object for pause, game-over, and non-positive time', () => {
    const playing = startGame(createGameAtBaseFallSpeed(() => 0.3))
    expect(advanceGame(playing, 0, () => 0.3)).toBe(playing)

    const paused = pauseGame(playing)
    expect(advanceGame(paused, 1, () => 0.3)).toBe(paused)

    let lost = startGame(createGameAtBaseFallSpeed(() => 0))
    lost = {
      ...lost,
      rows: [
        {
          id: 1,
          y: PLAYFIELD_HEIGHT - BLOCK_HEIGHT,
          cells: generatedCells(1),
        },
      ],
    }
    lost = advanceGame(lost, 0.001, () => 0)
    expect(lost.phase).toBe('game-over')
    expect(advanceGame(lost, 1, () => 0)).toBe(lost)
  })
})

function randomFrom(values: number[]) {
  let index = 0
  return () => values[index++] ?? 0
}

function createGameAtBaseFallSpeed(random: () => number) {
  return createGame(random, { speedCapMultiplier: 1 })
}

function travelStateAfter(
  playingTime: number,
  elapsedSeconds: number,
  fallSpeedConfig: Parameters<typeof createGame>[1] = {},
) {
  let game = startGame(createGame(() => 0, fallSpeedConfig))
  game = {
    ...game,
    playingTime,
    rows: [{ id: 1, y: 100, cells: generatedCells(1) }],
  }
  return advanceGame(game, elapsedSeconds, () => 0)
}

function travelAfterPlayingTime(
  playingTime: number,
  elapsedSeconds: number,
  fallSpeedConfig: Parameters<typeof createGame>[1] = {},
): number {
  const before = 100
  const game = travelStateAfter(playingTime, elapsedSeconds, fallSpeedConfig)
  return game.rows[0].y - before
}

function lowestFilledBottom(game: { rows: readonly { y: number }[] }): number {
  const lowestY = Math.max(...game.rows.map((row) => row.y))
  return lowestY + BLOCK_HEIGHT - 1
}
