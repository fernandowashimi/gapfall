export type PairedMessage = {
  type: 'paired'
  matchId: string
}

export type LinesRemovedMessage = {
  type: 'lines-removed'
  n: number
}

export type DeathMessage = {
  type: 'death'
}

export type OutcomeMessage = {
  type: 'outcome'
  winner: string
  loser: string
  reason: 'death-line' | 'forfeit'
}

export type RematchMessage = {
  type: 'rematch'
}

export type RematchBeginMessage = {
  type: 'rematch-begin'
}

export type RematchUnavailableMessage = {
  type: 'rematch-unavailable'
}

export function encodePaired(matchId: string): string {
  return JSON.stringify({ type: 'paired', matchId })
}

export function decodePaired(raw: string): PairedMessage | null {
  try {
    const value: unknown = JSON.parse(raw)
    if (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      value.type === 'paired' &&
      'matchId' in value &&
      typeof value.matchId === 'string'
    ) {
      return { type: 'paired', matchId: value.matchId }
    }
  } catch {
    return null
  }
  return null
}

export function encodeLinesRemoved(n: number): string {
  return JSON.stringify({ type: 'lines-removed', n })
}

export function decodeLinesRemoved(raw: string): LinesRemovedMessage | null {
  try {
    const value: unknown = JSON.parse(raw)
    if (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      value.type === 'lines-removed' &&
      'n' in value &&
      typeof value.n === 'number' &&
      Number.isInteger(value.n) &&
      value.n > 0
    ) {
      return { type: 'lines-removed', n: value.n }
    }
  } catch {
    return null
  }
  return null
}

export function encodeDeath(): string {
  return JSON.stringify({ type: 'death' })
}

export function decodeDeath(raw: string): DeathMessage | null {
  return decodeTyped(raw, 'death')
}

export function encodeOutcome(
  winner: string,
  loser: string,
  reason: OutcomeMessage['reason'],
): string {
  return JSON.stringify({ type: 'outcome', winner, loser, reason })
}

export function decodeOutcome(raw: string): OutcomeMessage | null {
  try {
    const value: unknown = JSON.parse(raw)
    if (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      value.type === 'outcome' &&
      'winner' in value &&
      typeof value.winner === 'string' &&
      'loser' in value &&
      typeof value.loser === 'string' &&
      'reason' in value &&
      (value.reason === 'death-line' || value.reason === 'forfeit')
    ) {
      return {
        type: 'outcome',
        winner: value.winner,
        loser: value.loser,
        reason: value.reason,
      }
    }
  } catch {
    return null
  }
  return null
}

export function encodeRematch(): string {
  return JSON.stringify({ type: 'rematch' })
}

export function decodeRematch(raw: string): RematchMessage | null {
  return decodeTyped(raw, 'rematch')
}

export function encodeRematchBegin(): string {
  return JSON.stringify({ type: 'rematch-begin' })
}

export function decodeRematchBegin(raw: string): RematchBeginMessage | null {
  return decodeTyped(raw, 'rematch-begin')
}

export function encodeRematchUnavailable(): string {
  return JSON.stringify({ type: 'rematch-unavailable' })
}

export function decodeRematchUnavailable(
  raw: string,
): RematchUnavailableMessage | null {
  return decodeTyped(raw, 'rematch-unavailable')
}

function decodeTyped<T extends string>(
  raw: string,
  type: T,
): { type: T } | null {
  try {
    const value: unknown = JSON.parse(raw)
    if (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      value.type === type
    ) {
      return { type }
    }
  } catch {
    return null
  }
  return null
}
