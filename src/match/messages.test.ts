import { describe, expect, it } from 'vitest'
import {
  decodeLinesRemoved,
  decodePaired,
  encodeLinesRemoved,
  encodePaired,
} from './messages'

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

  it('encodes and decodes a lines-removed count', () => {
    const raw = encodeLinesRemoved(2)

    expect(raw).toBe('{"type":"lines-removed","n":2}')
    expect(decodeLinesRemoved(raw)).toEqual({
      type: 'lines-removed',
      n: 2,
    })
  })

  it('ignores messages that are not a lines-removed count', () => {
    expect(decodeLinesRemoved('not-json')).toBeNull()
    expect(decodeLinesRemoved('{"type":"lines-removed"}')).toBeNull()
    expect(decodeLinesRemoved('{"type":"lines-removed","n":0}')).toBeNull()
    expect(
      decodeLinesRemoved('{"type":"paired","matchId":"match-1"}'),
    ).toBeNull()
  })
})
