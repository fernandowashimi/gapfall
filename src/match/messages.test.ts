import { describe, expect, it } from 'vitest'
import {
  decodeDeath,
  decodeIdentities,
  decodeIdentity,
  decodeLinesRemoved,
  decodeOutcome,
  decodePaired,
  decodeRematch,
  decodeRematchBegin,
  decodeRematchUnavailable,
  encodeDeath,
  encodeIdentities,
  encodeIdentity,
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

  it('encodes and decodes a client identity token claim', () => {
    expect(encodeIdentity('tok')).toBe('{"type":"identity","idToken":"tok"}')
    expect(decodeIdentity(encodeIdentity('tok'))).toEqual({
      type: 'identity',
      idToken: 'tok',
    })
    expect(encodeIdentity(null)).toBe('{"type":"identity","idToken":null}')
    expect(decodeIdentity(encodeIdentity(null))).toEqual({
      type: 'identity',
      idToken: null,
    })
  })

  it('ignores messages that are not an identity claim', () => {
    expect(decodeIdentity('not-json')).toBeNull()
    expect(decodeIdentity('{"type":"identity"}')).toBeNull()
    expect(decodeIdentity('{"type":"identity","idToken":1}')).toBeNull()
    expect(decodeIdentity('{"type":"death"}')).toBeNull()
  })

  it('encodes and decodes verified Match identities', () => {
    const sides = [
      { id: 'a', name: 'Ana', picture: 'https://example.com/a.jpg' },
      { id: 'b', name: null, picture: null },
    ] as const
    const raw = encodeIdentities(sides)

    expect(raw).toBe(
      '{"type":"identities","players":[{"id":"a","name":"Ana","picture":"https://example.com/a.jpg"},{"id":"b","name":null,"picture":null}]}',
    )
    expect(decodeIdentities(raw)).toEqual({
      type: 'identities',
      players: [
        { id: 'a', name: 'Ana', picture: 'https://example.com/a.jpg' },
        { id: 'b', name: null, picture: null },
      ],
    })
  })

  it('ignores messages that are not verified Match identities', () => {
    expect(decodeIdentities('not-json')).toBeNull()
    expect(decodeIdentities('{"type":"identities"}')).toBeNull()
    expect(
      decodeIdentities(
        '{"type":"identities","players":[{"id":"a","name":"Ana"}]}',
      ),
    ).toBeNull()
    expect(decodeIdentities('{"type":"identity","idToken":null}')).toBeNull()
  })
})
