import { describe, expect, it } from 'vitest'
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
})

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
