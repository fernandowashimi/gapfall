export type PairedMessage = {
  type: 'paired'
  matchId: string
}

export type LinesRemovedMessage = {
  type: 'lines-removed'
  n: number
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
