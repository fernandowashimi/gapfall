import type { GamePhase } from '../game/game-core'

export type ShellMode = 'main-menu' | 'matchmaking' | 'round'

export type ShellOverlay = 'none' | 'instructions' | 'settings'

export type SettingsCaller = 'main-menu' | 'pause'

export type RoundKind = 'single-player' | 'versus' | null

export interface ShellState {
  mode: ShellMode
  overlay: ShellOverlay
  settingsCaller: SettingsCaller | null
  roundKind: RoundKind
  rematchAvailable: boolean
}

export type ShellIntent =
  | { type: 'play' }
  | { type: 'versus' }
  | { type: 'paired' }
  | { type: 'play-again'; phase?: GamePhase }
  | { type: 'rematch'; phase?: GamePhase }
  | { type: 'opponent-gone' }
  | { type: 'open-instructions' }
  | { type: 'open-settings'; phase?: GamePhase }
  | { type: 'close-overlay' }
  | { type: 'escape'; phase?: GamePhase }
  | { type: 'resume' }
  | { type: 'abandon' }

export type RoundEffect = 'none' | 'start' | 'remount' | 'pause' | 'resume'

export interface ShellResult {
  state: ShellState
  effect: RoundEffect
}

export function createShellState(): ShellState {
  return {
    mode: 'main-menu',
    overlay: 'none',
    settingsCaller: null,
    roundKind: null,
    rematchAvailable: false,
  }
}

export function reduceShell(
  state: ShellState,
  intent: ShellIntent,
): ShellResult {
  switch (intent.type) {
    case 'play':
      if (state.mode !== 'main-menu' || state.overlay !== 'none') {
        return noop(state)
      }
      return {
        state: {
          ...clearOverlay(state),
          mode: 'round',
          roundKind: 'single-player',
          rematchAvailable: false,
        },
        effect: 'start',
      }

    case 'versus':
      if (state.mode !== 'main-menu' || state.overlay !== 'none') {
        return noop(state)
      }
      return {
        state: {
          ...clearOverlay(state),
          mode: 'matchmaking',
          roundKind: 'versus',
          rematchAvailable: false,
        },
        effect: 'none',
      }

    case 'paired':
      if (state.mode !== 'matchmaking') return noop(state)
      return {
        state: {
          ...clearOverlay(state),
          mode: 'round',
          roundKind: 'versus',
          rematchAvailable: true,
        },
        effect: 'start',
      }

    case 'play-again':
      if (state.mode !== 'round' || intent.phase !== 'game-over') {
        return noop(state)
      }
      if (state.roundKind === 'versus') {
        return {
          state: {
            ...clearOverlay(state),
            mode: 'matchmaking',
            rematchAvailable: false,
          },
          effect: 'none',
        }
      }
      return { state: clearOverlay(state), effect: 'remount' }

    case 'rematch':
      if (
        state.mode !== 'round' ||
        state.roundKind !== 'versus' ||
        intent.phase !== 'game-over' ||
        !state.rematchAvailable
      ) {
        return noop(state)
      }
      return { state: clearOverlay(state), effect: 'remount' }

    case 'opponent-gone':
      if (state.roundKind !== 'versus') return noop(state)
      return { state: { ...state, rematchAvailable: false }, effect: 'none' }

    case 'open-instructions':
      if (state.mode !== 'main-menu' || state.overlay !== 'none') {
        return noop(state)
      }
      return {
        state: { ...state, overlay: 'instructions', settingsCaller: null },
        effect: 'none',
      }

    case 'open-settings':
      if (state.overlay !== 'none') return noop(state)
      if (state.mode === 'main-menu') {
        return {
          state: {
            ...state,
            overlay: 'settings',
            settingsCaller: 'main-menu',
          },
          effect: 'none',
        }
      }
      if (state.roundKind === 'versus') return noop(state)
      if (intent.phase !== 'paused') return noop(state)
      return {
        state: {
          ...state,
          overlay: 'settings',
          settingsCaller: 'pause',
        },
        effect: 'none',
      }

    case 'close-overlay':
      return closeOverlay(state)

    case 'escape':
      if (state.overlay === 'settings' || state.overlay === 'instructions') {
        return closeOverlay(state)
      }
      if (state.mode === 'matchmaking') {
        return { state: createShellState(), effect: 'none' }
      }
      if (state.mode === 'main-menu') return noop(state)
      if (state.roundKind === 'versus') return noop(state)
      if (intent.phase === 'preparing' || intent.phase === 'playing') {
        return { state, effect: 'pause' }
      }
      if (intent.phase === 'paused') {
        return { state, effect: 'resume' }
      }
      return noop(state)

    case 'resume':
      if (state.mode !== 'round' || state.overlay !== 'none') {
        return noop(state)
      }
      if (state.roundKind === 'versus') return noop(state)
      return { state, effect: 'resume' }

    case 'abandon':
      if (state.mode !== 'round' && state.mode !== 'matchmaking') {
        return noop(state)
      }
      return { state: createShellState(), effect: 'none' }

    default:
      return noop(state)
  }
}

function closeOverlay(state: ShellState): ShellResult {
  if (state.overlay === 'none') return noop(state)

  if (state.overlay === 'instructions') {
    return { state: createShellState(), effect: 'none' }
  }

  if (state.settingsCaller === 'pause') {
    return {
      state: clearOverlay({ ...state, mode: 'round' }),
      effect: 'none',
    }
  }

  return { state: createShellState(), effect: 'none' }
}

function clearOverlay(state: ShellState): ShellState {
  return { ...state, overlay: 'none', settingsCaller: null }
}

function noop(state: ShellState): ShellResult {
  return { state, effect: 'none' }
}
