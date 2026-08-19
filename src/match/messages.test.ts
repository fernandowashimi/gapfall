import { describe, expect, it } from 'vitest'
import {
  decodeDeath,
  decodeLinesRemoved,
  decodeOutcome,
  decodePaired,
  decodeRematch,
  decodeRematchBegin,
  decodeRematchUnavailable,
  encodeDeath,
  encodeLinesRemoved,
  encodeOutcome,
  encodePaired,
  encodeRematch,
  encodeRematchBegin,
  encodeRematchUnavailable,
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

  it('encodes and decodes a Death Line report', () => {
    const raw = encodeDeath()

    expect(raw).toBe('{"type":"death"}')
    expect(decodeDeath(raw)).toEqual({ type: 'death' })
  })

  it('encodes and decodes a Match outcome', () => {
    const raw = encodeOutcome('b', 'a', 'death-line')

    expect(raw).toBe(
      '{"type":"outcome","winner":"b","loser":"a","reason":"death-line"}',
    )
    expect(decodeOutcome(raw)).toEqual({
      type: 'outcome',
      winner: 'b',
      loser: 'a',
      reason: 'death-line',
    })
  })

  it('encodes and decodes Rematch votes and room replies', () => {
    expect(encodeRematch()).toBe('{"type":"rematch"}')
    expect(decodeRematch(encodeRematch())).toEqual({ type: 'rematch' })
    expect(encodeRematchBegin()).toBe('{"type":"rematch-begin"}')
    expect(decodeRematchBegin(encodeRematchBegin())).toEqual({
      type: 'rematch-begin',
    })
    expect(encodeRematchUnavailable()).toBe('{"type":"rematch-unavailable"}')
    expect(decodeRematchUnavailable(encodeRematchUnavailable())).toEqual({
      type: 'rematch-unavailable',
    })
  })

  it('ignores messages that are not a Match outcome', () => {
    expect(decodeOutcome('not-json')).toBeNull()
    expect(decodeOutcome('{"type":"outcome"}')).toBeNull()
    expect(decodeOutcome('{"type":"death"}')).toBeNull()
    expect(decodeDeath('{"type":"rematch"}')).toBeNull()
  })
})
