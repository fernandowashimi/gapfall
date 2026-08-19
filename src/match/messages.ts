export type PairedMessage = {
  type: 'paired'
  matchId: string
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
