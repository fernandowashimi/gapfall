import {
  advanceGame,
  createGame,
  launchBlock,
  pauseGame,
  resumeGame,
  type Column,
  type GameState,
} from '../game/game-core'
import { readCues, type DetonationCue, type FeedbackSound } from './cues'

export const DETONATION_DURATION = 0.2

export type AudioGate = 'silence' | 'unsilence' | 'unchanged'

export interface ActiveDetonation extends DetonationCue {
  age: number
}

export interface RoundSession {
  game: GameState
  detonations: readonly ActiveDetonation[]
}

export interface RoundHud {
  phase: GameState['phase']
  score: number
}

export interface RoundResult {
  session: RoundSession
  sounds: readonly FeedbackSound[]
  audioGate: AudioGate
}

export function createRound(random?: () => number): RoundSession {
  return {
    game: createGame(random),
    detonations: [],
  }
}

export function hudOf(session: RoundSession): RoundHud {
  return { phase: session.game.phase, score: session.game.score }
}

export function applyAudioGate(
  gate: AudioGate,
  audio: { silence(): void; unsilence(): void },
): void {
  if (gate === 'silence') audio.silence()
  else if (gate === 'unsilence') audio.unsilence()
}

export function tickRound(
  session: RoundSession,
  dt: number,
  random: () => number = Math.random,
): RoundResult {
  const game = advanceGame(session.game, dt, random)
  if (game.phase === 'paused') {
    return {
      session: { game, detonations: session.detonations },
      sounds: [],
      audioGate: audioGateFor(session.game.phase, game.phase),
    }
  }

  const cues = readCues(session.game, game)
  const spawned = cues.detonations.map((detonation) => ({
    ...detonation,
    age: 0,
  }))
  return {
    session: {
      game,
      detonations: ageDetonations([...session.detonations, ...spawned], dt),
    },
    sounds: cues.sounds,
    audioGate: audioGateFor(session.game.phase, game.phase),
  }
}

export function launchRound(
  session: RoundSession,
  column: Column,
): RoundResult {
  const game = launchBlock(session.game, column)
  if (game.phase !== 'playing') {
    return {
      session,
      sounds: [],
      audioGate: 'unchanged',
    }
  }

  const cues = readCues(session.game, game)
  const spawned = cues.detonations.map((detonation) => ({
    ...detonation,
    age: 0,
  }))
  return {
    session: { game, detonations: [...session.detonations, ...spawned] },
    sounds: cues.sounds,
    audioGate: 'unchanged',
  }
}

export function pauseRound(session: RoundSession): RoundResult {
  const game = pauseGame(session.game)
  return {
    session: { game, detonations: session.detonations },
    sounds: [],
    audioGate: audioGateFor(session.game.phase, game.phase),
  }
}

export function resumeRound(session: RoundSession): RoundResult {
  const game = resumeGame(session.game)
  return {
    session: { game, detonations: session.detonations },
    sounds: [],
    audioGate: audioGateFor(session.game.phase, game.phase),
  }
}

function audioGateFor(
  previousPhase: GameState['phase'],
  nextPhase: GameState['phase'],
): AudioGate {
  const wasPaused = previousPhase === 'paused'
  const isPaused = nextPhase === 'paused'
  if (!wasPaused && isPaused) return 'silence'
  if (wasPaused && !isPaused) return 'unsilence'
  return 'unchanged'
}

function ageDetonations(
  detonations: readonly ActiveDetonation[],
  dt: number,
): ActiveDetonation[] {
  return detonations
    .map((detonation) => ({ ...detonation, age: detonation.age + dt }))
    .filter((detonation) => detonation.age < DETONATION_DURATION)
}
