import { describe, expect, it } from 'vitest'
import { decodePaired, encodePaired } from './messages'

describe('Match message codec', () => {
  it('encodes and decodes a paired Match id', () => {
    const raw = encodePaired('match-1')

    expect(raw).toBe('{"type":"paired","matchId":"match-1"}')
    expect(decodePaired(raw)).toEqual({
      type: 'paired',
      matchId: 'match-1',
    })
  })

  it('ignores messages that are not a paired Match id', () => {
    expect(decodePaired('not-json')).toBeNull()
    expect(decodePaired('{"type":"paired"}')).toBeNull()
    expect(decodePaired('{"type":"outcome","matchId":"match-1"}')).toBeNull()
  })
})
