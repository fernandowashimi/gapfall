import { describe, expect, it } from 'vitest'
import { createShellState, reduceShell } from './app-shell'

describe('app-shell navigator', () => {
  it('opens on the Main Menu', () => {
    expect(createShellState()).toEqual({
      mode: 'main-menu',
      overlay: 'none',
      settingsCaller: null,
      roundKind: null,
      rematchAvailable: false,
    })
  })

  it('starts a Round from Play', () => {
    const result = reduceShell(createShellState(), { type: 'play' })
    expect(result).toEqual({
      state: {
        mode: 'round',
        overlay: 'none',
        settingsCaller: null,
        roundKind: 'single-player',
        rematchAvailable: false,
      },
      effect: 'start',
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
      rematchAvailable: false,
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
      rematchAvailable: false,
    })

    const closed = reduceShell(opened.state, { type: 'escape' })
    expect(closed.state).toEqual({
      mode: 'round',
      overlay: 'none',
      settingsCaller: null,
      roundKind: 'single-player',
      rematchAvailable: false,
    })
    expect(closed.effect).toBe('none')
  })

  it('does not open Settings from a Round that is not paused', () => {
    const round = reduceShell(createShellState(), { type: 'play' }).state
    expect(
      reduceShell(round, { type: 'open-settings', phase: 'playing' }),
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

  it('resumes from the pause overlay action', () => {
    const round = reduceShell(createShellState(), { type: 'play' }).state
    expect(reduceShell(round, { type: 'resume' })).toEqual({
      state: round,
      effect: 'resume',
    })
  })
})

describe('Versus navigator', () => {
  it('enters Matchmaking from Versus and returns on Esc', () => {
    const queued = reduceShell(createShellState(), { type: 'versus' })
    expect(queued).toEqual({
      state: {
        mode: 'matchmaking',
        overlay: 'none',
        settingsCaller: null,
        roundKind: 'versus',
        rematchAvailable: false,
      },
      effect: 'none',
    })
    expect(reduceShell(queued.state, { type: 'escape' })).toEqual({
      state: createShellState(),
      effect: 'none',
    })
  })

  it('starts a Versus Round when paired', () => {
    const queued = reduceShell(createShellState(), { type: 'versus' }).state
    const paired = reduceShell(queued, { type: 'paired' })
    expect(paired).toEqual({
      state: {
        mode: 'round',
        overlay: 'none',
        settingsCaller: null,
        roundKind: 'versus',
        rematchAvailable: true,
      },
      effect: 'start',
    })
  })

  it('does not pause a Versus Round on Esc', () => {
    const round = reduceShell(
      reduceShell(createShellState(), { type: 'versus' }).state,
      { type: 'paired' },
    ).state
    expect(reduceShell(round, { type: 'escape', phase: 'preparing' })).toEqual({
      state: round,
      effect: 'none',
    })
    expect(reduceShell(round, { type: 'escape', phase: 'playing' })).toEqual({
      state: round,
      effect: 'none',
    })
  })

  it('does not open Settings from a Versus Round', () => {
    const round = reduceShell(
      reduceShell(createShellState(), { type: 'versus' }).state,
      { type: 'paired' },
    ).state
    expect(
      reduceShell(round, { type: 'open-settings', phase: 'playing' }),
    ).toEqual({ state: round, effect: 'none' })
  })

  it('abandons a Versus Round to the Main Menu', () => {
    const round = reduceShell(
      reduceShell(createShellState(), { type: 'versus' }).state,
      { type: 'paired' },
    ).state
    expect(reduceShell(round, { type: 'abandon' })).toEqual({
      state: createShellState(),
      effect: 'none',
    })
  })

  it('requeues Versus Jogar novamente and remounts Rematch while the opponent is there', () => {
    const round = reduceShell(
      reduceShell(createShellState(), { type: 'versus' }).state,
      { type: 'paired' },
    ).state
    expect(
      reduceShell(round, { type: 'play-again', phase: 'game-over' }),
    ).toEqual({
      state: {
        ...round,
        mode: 'matchmaking',
        rematchAvailable: false,
      },
      effect: 'none',
    })
    expect(reduceShell(round, { type: 'rematch', phase: 'game-over' })).toEqual(
      { state: round, effect: 'remount' },
    )
  })

  it('hides Rematch when the opponent is gone', () => {
    const round = reduceShell(
      reduceShell(createShellState(), { type: 'versus' }).state,
      { type: 'paired' },
    ).state
    const gone = reduceShell(round, { type: 'opponent-gone' }).state
    expect(gone.rematchAvailable).toBe(false)
    expect(reduceShell(gone, { type: 'rematch', phase: 'game-over' })).toEqual({
      state: gone,
      effect: 'none',
    })
  })
})
