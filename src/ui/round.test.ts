import { describe, expect, it } from 'vitest'
import {
  BLOCK_HEIGHT,
  PLAYFIELD_HEIGHT,
  type Cell,
  type Column,
} from '../game/game-core'
import {
  createRound,
  launchRound,
  pauseRound,
  resumeRound,
  tickRound,
} from './round'

describe('Round commands', () => {
  it('creates a preparing Round with no detonations', () => {
    const session = createRound(() => 0.3)

    expect(session.game.phase).toBe('preparing')
    expect(session.game.score).toBe(0)
    expect(session.detonations).toEqual([])
  })

  it('ticks past preparation into playing', () => {
    const result = tickRound(
      createRound(() => 0.3),
      3.1,
      () => 0.3,
    )

    expect(result.session.game.phase).toBe('playing')
    expect(result.session.game.playingTime).toBeGreaterThan(0)
    expect(result.sounds).toEqual([])
    expect(result.audioGate).toBe('unchanged')
  })

  it('does not launch a Shot during preparation', () => {
    const before = createRound(() => 0.3)
    const result = launchRound(before, 1)

    expect(result.session.game.shots).toEqual([])
    expect(result.sounds).toEqual([])
    expect(result.audioGate).toBe('unchanged')
  })

  it('emits launch when a Shot is added during play', () => {
    const playing = tickRound(
      createRound(() => 0.3),
      3.1,
      () => 0.3,
    ).session
    const result = launchRound(playing, 1)

    expect(result.session.game.shots).toHaveLength(1)
    expect(result.sounds).toEqual(['launch'])
    expect(result.audioGate).toBe('unchanged')
  })

  it('pauses play and silences audio', () => {
    const playing = tickRound(
      createRound(() => 0.3),
      3.1,
      () => 0.3,
    ).session
    const result = pauseRound(playing)

    expect(result.session.game.phase).toBe('paused')
    expect(result.session.game.playingTime).toBe(playing.game.playingTime)
    expect(result.sounds).toEqual([])
    expect(result.audioGate).toBe('silence')
    expect(result.hudChanged).toBe(true)
  })

  it('does not advance the board while paused', () => {
    const paused = pauseRound(
      tickRound(
        createRound(() => 0.3),
        3.1,
        () => 0.3,
      ).session,
    ).session
    const result = tickRound(paused, 1, () => 0.3)

    expect(result.session.game).toBe(paused.game)
    expect(result.session.game.playingTime).toBe(paused.game.playingTime)
    expect(result.sounds).toEqual([])
    expect(result.audioGate).toBe('unchanged')
  })

  it('resumes play and unsilences audio', () => {
    const paused = pauseRound(
      tickRound(
        createRound(() => 0.3),
        3.1,
        () => 0.3,
      ).session,
    ).session
    const result = resumeRound(paused)

    expect(result.session.game.phase).toBe('playing')
    expect(result.session.game.playingTime).toBe(paused.game.playingTime)
    expect(result.sounds).toEqual([])
    expect(result.audioGate).toBe('unsilence')
  })

  it('records a detonation when a line is removed', () => {
    let session = tickRound(
      createRound(() => 0.3),
      3.1,
      () => 0.3,
    ).session
    session = launchRound(session, 1).session
    session = tickRound(session, 1.5, () => 0.3).session
    const result = tickRound(session, 0.001, () => 0.3)

    expect(result.session.game.score).toBe(1)
    expect(result.session.detonations).toHaveLength(1)
    expect(result.sounds).toEqual(['detonate'])
    expect(result.hudChanged).toBe(true)
  })

  it('records stacked detonations for a two-line cascade', () => {
    let session = tickRound(
      createRound(() => 0.3),
      3.1,
      () => 0.3,
    ).session
    session = tickRound(session, 1, () => 0.3).session
    session = launchRound(session, 1).session
    session = tickRound(session, 1.5, () => 0.8).session
    session = launchRound(session, 1).session
    session = tickRound(session, 1.5, () => 0.8).session
    const result = tickRound(session, 0.001, () => 0.8)

    expect(result.session.game.score).toBe(3)
    expect(result.sounds).toEqual(['detonate', 'detonate'])
    expect(result.session.detonations).toHaveLength(2)
    expect(result.hudChanged).toBe(true)
  })

  it('freezes detonations while paused', () => {
    const withDetonation = removeFrontline()
    const paused = pauseRound(withDetonation).session
    const ticked = tickRound(paused, 0.1, () => 0.3)

    expect(ticked.session.detonations).toEqual(withDetonation.detonations)
  })

  it('ages detonations after resume until they finish', () => {
    const paused = pauseRound(removeFrontline()).session
    const resumed = resumeRound(paused).session
    const aged = tickRound(resumed, 0.05, () => 0.3)

    expect(aged.session.detonations).toHaveLength(1)
    expect(aged.session.detonations[0].age).toBeGreaterThan(
      paused.detonations[0].age,
    )

    const finished = tickRound(aged.session, 0.2, () => 0.3)
    expect(finished.session.detonations).toEqual([])
  })

  it('emits no sounds on a quiet playing tick', () => {
    const playing = tickRound(
      createRound(() => 0.3),
      3.1,
      () => 0.3,
    ).session
    const result = tickRound(playing, 0.001, () => 0.3)

    expect(result.sounds).toEqual([])
    expect(result.session.detonations).toEqual([])
    expect(result.hudChanged).toBe(false)
  })

  it('emits miss when a shot stacks into a partial line', () => {
    let session = tickRound(
      createRound(() => 0),
      3.1,
      () => 0,
    ).session
    session = {
      ...session,
      game: {
        ...session.game,
        rows: [{ id: 1, y: 200, cells: generatedCells(1) }],
        shots: [],
      },
    }
    session = launchRound(session, 0).session
    const result = tickRound(session, 1.5, () => 0)

    expect(result.sounds).toEqual(['miss'])
  })

  it('emits death when the frontline reaches the death line with no shot', () => {
    let session = tickRound(
      createRound(() => 0),
      3.1,
      () => 0,
    ).session
    session = {
      ...session,
      game: {
        ...session.game,
        rows: [
          {
            id: 1,
            y: PLAYFIELD_HEIGHT - BLOCK_HEIGHT,
            cells: generatedCells(1),
          },
        ],
        shots: [],
      },
    }
    const result = tickRound(session, 0.001, () => 0)

    expect(result.session.game.phase).toBe('game-over')
    expect(result.sounds).toEqual(['death'])
    expect(result.hudChanged).toBe(true)
  })

  it('does not repeat death on later game-over ticks', () => {
    let session = tickRound(
      createRound(() => 0),
      3.1,
      () => 0,
    ).session
    session = {
      ...session,
      game: {
        ...session.game,
        rows: [
          {
            id: 1,
            y: PLAYFIELD_HEIGHT - BLOCK_HEIGHT,
            cells: generatedCells(1),
          },
        ],
        shots: [{ id: 99, column: 1, y: 400 }],
      },
    }
    const lost = tickRound(session, 0.001, () => 0)
    const later = tickRound(lost.session, 0.1, () => 0)

    expect(lost.sounds).toEqual(['death'])
    expect(later.sounds).toEqual([])
    expect(later.session.game).toBe(lost.session.game)
    expect(later.hudChanged).toBe(false)
  })
})

function generatedCells(gap: Column): Cell[] {
  const cells: Cell[] = ['stone', 'stone', 'stone', 'stone']
  cells[gap] = 'empty'
  return cells
}

function removeFrontline() {
  let session = tickRound(
    createRound(() => 0.3),
    3.1,
    () => 0.3,
  ).session
  session = launchRound(session, 1).session
  session = tickRound(session, 1.5, () => 0.3).session
  return tickRound(session, 0.001, () => 0.3).session
}
