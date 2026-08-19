import { describe, expect, it } from 'vitest'
import { createShellState, reduceShell, type ShellState } from './app-shell'

function startVersusRound(): ShellState {
  const matchmaking = reduceShell(createShellState(), { type: 'versus' }).state
  return reduceShell(matchmaking, { type: 'paired' }).state
}

describe('app-shell navigator', () => {
  it('opens on the Main Menu', () => {
    expect(createShellState()).toEqual({
      mode: 'main-menu',
      overlay: 'none',
      settingsCaller: null,
      roundKind: null,
      versusOutcome: null,
    })
  })

  it('starts a Single Player Round from Um jogador', () => {
    const result = reduceShell(createShellState(), { type: 'play' })
    expect(result).toEqual({
      state: {
        mode: 'round',
        overlay: 'none',
        settingsCaller: null,
        roundKind: 'single-player',
        versusOutcome: null,
      },
      effect: 'start',
    })
  })

  it('enters Matchmaking from Versus', () => {
    const result = reduceShell(createShellState(), { type: 'versus' })
    expect(result).toEqual({
      state: {
        mode: 'matchmaking',
        overlay: 'none',
        settingsCaller: null,
        roundKind: null,
        versusOutcome: null,
      },
      effect: 'none',
    })
  })

  it('starts a Versus Round when Matchmaking pairs', () => {
    const matchmaking = reduceShell(createShellState(), {
      type: 'versus',
    }).state
    const result = reduceShell(matchmaking, { type: 'paired' })
    expect(result).toEqual({
      state: {
        mode: 'round',
        overlay: 'none',
        settingsCaller: null,
        roundKind: 'versus',
        versusOutcome: null,
      },
      effect: 'start',
    })
  })

  it('returns to the Main Menu from Matchmaking on cancel or Esc', () => {
    const matchmaking = reduceShell(createShellState(), {
      type: 'versus',
    }).state

    expect(reduceShell(matchmaking, { type: 'cancel' })).toEqual({
      state: createShellState(),
      effect: 'none',
    })
    expect(reduceShell(matchmaking, { type: 'escape' })).toEqual({
      state: createShellState(),
      effect: 'none',
    })
  })

  it('opens Instructions from the Main Menu and returns on close or Esc', () => {
    const opened = reduceShell(createShellState(), {
      type: 'open-instructions',
    })
    expect(opened.state.overlay).toBe('instructions')
    expect(opened.effect).toBe('none')

    expect(reduceShell(opened.state, { type: 'close-overlay' }).state).toEqual(
      createShellState(),
    )
    expect(reduceShell(opened.state, { type: 'escape' }).state).toEqual(
      createShellState(),
    )
  })

  it('opens Settings from the Main Menu and returns there on close or Esc', () => {
    const opened = reduceShell(createShellState(), { type: 'open-settings' })
    expect(opened.state).toEqual({
      mode: 'main-menu',
      overlay: 'settings',
      settingsCaller: 'main-menu',
      roundKind: null,
      versusOutcome: null,
    })

    expect(reduceShell(opened.state, { type: 'close-overlay' }).state).toEqual(
      createShellState(),
    )
    expect(reduceShell(opened.state, { type: 'escape' }).state).toEqual(
      createShellState(),
    )
  })

  it('opens Settings from pause and returns to the paused Round', () => {
    const round = reduceShell(createShellState(), { type: 'play' }).state
    const opened = reduceShell(round, {
      type: 'open-settings',
      phase: 'paused',
    })
    expect(opened.state).toEqual({
      mode: 'round',
      overlay: 'settings',
      settingsCaller: 'pause',
      roundKind: 'single-player',
      versusOutcome: null,
    })

    const closed = reduceShell(opened.state, { type: 'escape' })
    expect(closed.state).toEqual({
      mode: 'round',
      overlay: 'none',
      settingsCaller: null,
      roundKind: 'single-player',
      versusOutcome: null,
    })
    expect(closed.effect).toBe('none')
  })

  it('does not open Settings from a Round that is not paused', () => {
    const round = reduceShell(createShellState(), { type: 'play' }).state
    expect(
      reduceShell(round, { type: 'open-settings', phase: 'playing' }),
    ).toEqual({ state: round, effect: 'none' })
  })

  it('does not open Settings from a Versus Round', () => {
    const round = startVersusRound()
    expect(
      reduceShell(round, { type: 'open-settings', phase: 'playing' }),
    ).toEqual({ state: round, effect: 'none' })
    expect(
      reduceShell(round, { type: 'open-settings', phase: 'paused' }),
    ).toEqual({ state: round, effect: 'none' })
  })

  it('ignores Esc on the Main Menu', () => {
    const result = reduceShell(createShellState(), { type: 'escape' })
    expect(result).toEqual({ state: createShellState(), effect: 'none' })
  })

  it('pauses and resumes a Round with Esc', () => {
    const round = reduceShell(createShellState(), { type: 'play' }).state

    expect(reduceShell(round, { type: 'escape', phase: 'preparing' })).toEqual({
      state: round,
      effect: 'pause',
    })
    expect(reduceShell(round, { type: 'escape', phase: 'playing' })).toEqual({
      state: round,
      effect: 'pause',
    })
    expect(reduceShell(round, { type: 'escape', phase: 'paused' })).toEqual({
      state: round,
      effect: 'resume',
    })
    expect(reduceShell(round, { type: 'escape', phase: 'game-over' })).toEqual({
      state: round,
      effect: 'none',
    })
  })

  it('does not pause a Versus Round with Esc', () => {
    const round = startVersusRound()

    expect(reduceShell(round, { type: 'escape', phase: 'preparing' })).toEqual({
      state: round,
      effect: 'none',
    })
    expect(reduceShell(round, { type: 'escape', phase: 'playing' })).toEqual({
      state: round,
      effect: 'none',
    })
  })

  it('abandons a Round to the Main Menu', () => {
    const round = reduceShell(createShellState(), { type: 'play' }).state
    const settings = reduceShell(round, {
      type: 'open-settings',
      phase: 'paused',
    }).state
    expect(reduceShell(settings, { type: 'abandon' })).toEqual({
      state: createShellState(),
      effect: 'none',
    })
  })

  it('abandons a Versus Round to the Main Menu', () => {
    const round = startVersusRound()
    expect(reduceShell(round, { type: 'abandon' })).toEqual({
      state: createShellState(),
      effect: 'none',
    })
  })

  it('remounts a Round on Play again only after game-over', () => {
    const round = reduceShell(createShellState(), { type: 'play' }).state
    expect(
      reduceShell(round, { type: 'play-again', phase: 'playing' }),
    ).toEqual({ state: round, effect: 'none' })
    expect(
      reduceShell(round, { type: 'play-again', phase: 'game-over' }),
    ).toEqual({
      state: round,
      effect: 'remount',
    })
  })

  it('does not remount a Versus Round on Play again', () => {
    const round = startVersusRound()
    expect(
      reduceShell(round, { type: 'play-again', phase: 'game-over' }),
    ).toEqual({ state: round, effect: 'none' })
  })

  it('records a Versus outcome with Rematch available and stops the Round', () => {
    const round = startVersusRound()
    const result = reduceShell(round, {
      type: 'outcome',
      result: 'win',
      reason: 'death-line',
    })

    expect(result.state.versusOutcome).toEqual({
      result: 'win',
      reason: 'death-line',
      rematchAvailable: true,
    })
    expect(result.effect).toBe('stop')
  })

  it('hides Rematch when the Opponent is gone', () => {
    const forfeited = reduceShell(startVersusRound(), {
      type: 'outcome',
      result: 'win',
      reason: 'forfeit',
    })
    expect(forfeited.state.versusOutcome?.rematchAvailable).toBe(false)

    const ended = reduceShell(startVersusRound(), {
      type: 'outcome',
      result: 'win',
      reason: 'death-line',
    }).state
    const result = reduceShell(ended, { type: 'rematch-unavailable' })

    expect(result.state.versusOutcome?.rematchAvailable).toBe(false)
    expect(result.effect).toBe('none')
  })

  it('re-enters Matchmaking from Versus Play again after outcome', () => {
    const ended = reduceShell(startVersusRound(), {
      type: 'outcome',
      result: 'loss',
      reason: 'death-line',
    }).state
    const result = reduceShell(ended, {
      type: 'play-again',
      phase: 'game-over',
    })

    expect(result).toEqual({
      state: {
        mode: 'matchmaking',
        overlay: 'none',
        settingsCaller: null,
        roundKind: null,
        versusOutcome: null,
      },
      effect: 'none',
    })
  })

  it('returns to the Main Menu from Versus game-over', () => {
    const ended = reduceShell(startVersusRound(), {
      type: 'outcome',
      result: 'loss',
      reason: 'death-line',
    }).state

    expect(reduceShell(ended, { type: 'abandon' })).toEqual({
      state: createShellState(),
      effect: 'none',
    })
  })

  it('starts a new Versus Round when Rematch begins', () => {
    const ended = reduceShell(startVersusRound(), {
      type: 'outcome',
      result: 'win',
      reason: 'death-line',
    }).state
    const result = reduceShell(ended, { type: 'rematch-begin' })

    expect(result.state.mode).toBe('round')
    expect(result.state.roundKind).toBe('versus')
    expect(result.state.versusOutcome).toBeNull()
    expect(result.effect).toBe('start')
  })

  it('resumes from the pause overlay action', () => {
    const round = reduceShell(createShellState(), { type: 'play' }).state
    expect(reduceShell(round, { type: 'resume' })).toEqual({
      state: round,
      effect: 'resume',
    })
  })
})
