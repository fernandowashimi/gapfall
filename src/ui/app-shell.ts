import type { GamePhase } from '../game/game-core'

export type ShellMode = 'main-menu' | 'round' | 'matchmaking'

export type RoundKind = 'single-player' | 'versus'

export type ShellOverlay = 'none' | 'instructions' | 'settings'

export type SettingsCaller = 'main-menu' | 'pause'

export interface ShellState {
  mode: ShellMode
  overlay: ShellOverlay
  settingsCaller: SettingsCaller | null
  roundKind: RoundKind | null
  versusOutcome: VersusOutcome | null
}

export type VersusOutcome = {
  result: 'win' | 'loss'
  reason: 'death-line' | 'forfeit'
  rematchAvailable: boolean
}

export type ShellIntent =
  | { type: 'play' }
  | { type: 'versus' }
  | { type: 'paired' }
  | { type: 'cancel' }
  | { type: 'play-again'; phase?: GamePhase }
  | { type: 'open-instructions' }
  | { type: 'open-settings'; phase?: GamePhase }
  | { type: 'close-overlay' }
  | { type: 'escape'; phase?: GamePhase }
  | { type: 'resume' }
  | { type: 'abandon' }
  | {
      type: 'outcome'
      result: VersusOutcome['result']
      reason: VersusOutcome['reason']
    }
  | { type: 'rematch-unavailable' }
  | { type: 'rematch-begin' }

export type RoundEffect =
  'none' | 'start' | 'remount' | 'pause' | 'resume' | 'stop'

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
    versusOutcome: null,
  }
}

export function reduceShell(
  state: ShellState,
  intent: ShellIntent,
): ShellResult {
  switch (intent.type) {
    case 'play':
      return startSinglePlayerFromMenu(state)

    case 'versus':
      if (state.mode !== 'main-menu' || state.overlay !== 'none') {
        return noop(state)
      }
      return {
        state: { ...createShellState(), mode: 'matchmaking' },
        effect: 'none',
      }

    case 'paired':
      if (state.mode !== 'matchmaking') return noop(state)
      return {
        state: clearOverlay({
          ...state,
          mode: 'round',
          roundKind: 'versus',
        }),
        effect: 'start',
      }

    case 'cancel':
      return leaveMatchmaking(state)

    case 'play-again':
      if (state.mode !== 'round') return noop(state)
      if (state.roundKind === 'versus') {
        if (!state.versusOutcome) return noop(state)
        return {
          state: { ...createShellState(), mode: 'matchmaking' },
          effect: 'none',
        }
      }
      if (state.roundKind !== 'single-player' || intent.phase !== 'game-over') {
        return noop(state)
      }
      return { state: clearOverlay(state), effect: 'remount' }

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
      if (state.roundKind === 'versus') return noop(state)
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
      if (state.mode === 'matchmaking') return leaveMatchmaking(state)
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
      return { state, effect: 'resume' }

    case 'abandon':
      if (state.mode !== 'round') return noop(state)
      return { state: createShellState(), effect: 'none' }

    case 'outcome':
      if (
        state.mode !== 'round' ||
        state.roundKind !== 'versus' ||
        state.versusOutcome
      ) {
        return noop(state)
      }
      return {
        state: {
          ...state,
          versusOutcome: {
            result: intent.result,
            reason: intent.reason,
            rematchAvailable: intent.reason !== 'forfeit',
          },
        },
        effect: 'stop',
      }

    case 'rematch-unavailable':
      if (!state.versusOutcome?.rematchAvailable) return noop(state)
      return {
        state: {
          ...state,
          versusOutcome: { ...state.versusOutcome, rematchAvailable: false },
        },
        effect: 'none',
      }

    case 'rematch-begin':
      if (state.mode !== 'round' || state.roundKind !== 'versus') {
        return noop(state)
      }
      return {
        state: { ...state, versusOutcome: null },
        effect: 'start',
      }

    default:
      return noop(state)
  }
}

function leaveMatchmaking(state: ShellState): ShellResult {
  if (state.mode !== 'matchmaking') return noop(state)
  return { state: createShellState(), effect: 'none' }
}

function startSinglePlayerFromMenu(state: ShellState): ShellResult {
  if (state.mode !== 'main-menu' || state.overlay !== 'none') {
    return noop(state)
  }
  return {
    state: clearOverlay({
      ...state,
      mode: 'round',
      roundKind: 'single-player',
    }),
    effect: 'start',
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
