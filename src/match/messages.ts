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

export type IdentityMessage = {
  type: 'identity'
  idToken: string | null
}

export type MatchSideIdentity = {
  id: string
  name: string | null
  picture: string | null
}

export type IdentitiesMessage = {
  type: 'identities'
  players: readonly [MatchSideIdentity, MatchSideIdentity]
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

export function encodeIdentity(idToken: string | null): string {
  return JSON.stringify({ type: 'identity', idToken })
}

export function decodeIdentity(raw: string): IdentityMessage | null {
  try {
    const value: unknown = JSON.parse(raw)
    if (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      value.type === 'identity' &&
      'idToken' in value &&
      (typeof value.idToken === 'string' || value.idToken === null)
    ) {
      return { type: 'identity', idToken: value.idToken }
    }
  } catch {
    return null
  }
  return null
}

export function encodeIdentities(
  players: readonly [MatchSideIdentity, MatchSideIdentity],
): string {
  return JSON.stringify({ type: 'identities', players })
}

export function decodeIdentities(raw: string): IdentitiesMessage | null {
  try {
    const value: unknown = JSON.parse(raw)
    if (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      value.type === 'identities' &&
      'players' in value &&
      Array.isArray(value.players) &&
      value.players.length === 2 &&
      isMatchSideIdentity(value.players[0]) &&
      isMatchSideIdentity(value.players[1])
    ) {
      return {
        type: 'identities',
        players: [value.players[0], value.players[1]],
      }
    }
  } catch {
    return null
  }
  return null
}

function isMatchSideIdentity(value: unknown): value is MatchSideIdentity {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    (typeof value.name === 'string' || value.name === null) &&
    'picture' in value &&
    (typeof value.picture === 'string' || value.picture === null)
  )
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
