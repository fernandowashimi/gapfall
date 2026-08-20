import { describe, expect, it } from 'vitest'
import {
  createMatchState,
  createQueueState,
  reduceMatch,
  reduceQueue,
} from './referee'

const mint = () => 'match-1'

describe('Match referee queue', () => {
  it('keeps a single waiter queued', () => {
    const result = reduceQueue(
      createQueueState(),
      { type: 'join', playerId: 'a' },
      mint,
    )

    expect(result.state.waiters).toEqual(['a'])
    expect(result.messages).toEqual([])
    expect(result.match).toBeUndefined()
  })

  it('pairs the second waiter into a Match', () => {
    const waiting = reduceQueue(
      createQueueState(),
      { type: 'join', playerId: 'a' },
      mint,
    ).state
    const result = reduceQueue(waiting, { type: 'join', playerId: 'b' }, mint)

    expect(result.state.waiters).toEqual([])
    expect(result.match).toEqual({
      id: 'match-1',
      players: ['a', 'b'],
      phase: 'playing',
      outcome: null,
      rematchVotes: [],
      rematchAvailable: true,
      identities: { a: undefined, b: undefined },
    })
    expect(result.messages).toEqual([
      { to: 'a', type: 'paired', matchId: 'match-1' },
      { to: 'b', type: 'paired', matchId: 'match-1' },
    ])
  })

  it('removes a queued waiter on leave without pairing', () => {
    const waiting = reduceQueue(
      createQueueState(),
      { type: 'join', playerId: 'a' },
      mint,
    ).state
    const result = reduceQueue(waiting, { type: 'leave', playerId: 'a' }, mint)

    expect(result.state.waiters).toEqual([])
    expect(result.match).toBeUndefined()
    expect(result.messages).toEqual([])
  })
})

describe('Match referee live Match', () => {
  const match = createMatchState('match-1', 'a', 'b')

  it('relays a lines-removed count to the opponent only', () => {
    const result = reduceMatch(match, {
      type: 'lines-removed',
      from: 'a',
      n: 2,
    })

    expect(result.state).toBe(match)
    expect(result.messages).toEqual([{ to: 'b', type: 'lines-removed', n: 2 }])
  })

  it('lets the first Death Line report lose', () => {
    const first = reduceMatch(match, { type: 'death', from: 'a' })
    const second = reduceMatch(first.state, { type: 'death', from: 'b' })

    expect(first.state.outcome).toEqual({
      winner: 'b',
      loser: 'a',
      reason: 'death-line',
    })
    expect(first.messages).toEqual([
      {
        to: 'a',
        type: 'outcome',
        winner: 'b',
        loser: 'a',
        reason: 'death-line',
      },
      {
        to: 'b',
        type: 'outcome',
        winner: 'b',
        loser: 'a',
        reason: 'death-line',
      },
    ])
    expect(second.state.outcome).toEqual(first.state.outcome)
    expect(second.messages).toEqual([])
  })

  it('treats close during a live Match as a forfeit', () => {
    const result = reduceMatch(match, { type: 'close', from: 'a' })

    expect(result.state.outcome).toEqual({
      winner: 'b',
      loser: 'a',
      reason: 'forfeit',
    })
  })

  it('does not forfeit again after an outcome', () => {
    const ended = reduceMatch(match, { type: 'death', from: 'a' }).state
    const again = reduceMatch(ended, { type: 'close', from: 'a' })

    expect(again.state.outcome).toEqual(ended.outcome)
    expect(again.messages).toEqual([{ to: 'b', type: 'rematch-unavailable' }])

    const twice = reduceMatch(again.state, { type: 'close', from: 'a' })
    expect(twice.state.outcome).toEqual(ended.outcome)
    expect(twice.messages).toEqual([])
  })

  it('starts a new Round when both players vote Rematch', () => {
    const ended = reduceMatch(match, { type: 'death', from: 'a' }).state
    const firstVote = reduceMatch(ended, { type: 'rematch', from: 'a' })
    const both = reduceMatch(firstVote.state, { type: 'rematch', from: 'b' })

    expect(firstVote.state.phase).toBe('ended')
    expect(both.state.phase).toBe('playing')
    expect(both.state.outcome).toBeNull()
    expect(both.messages).toEqual([
      { to: 'a', type: 'rematch-begin' },
      { to: 'b', type: 'rematch-begin' },
    ])
  })

  it('makes Rematch unavailable when one voter closes', () => {
    const ended = reduceMatch(match, { type: 'death', from: 'a' }).state
    const waiting = reduceMatch(ended, { type: 'rematch', from: 'a' }).state
    const closed = reduceMatch(waiting, { type: 'close', from: 'a' })

    expect(closed.messages).toEqual([{ to: 'b', type: 'rematch-unavailable' }])
    const leftover = reduceMatch(closed.state, { type: 'rematch', from: 'b' })
    expect(leftover.state.phase).toBe('ended')
    expect(leftover.messages).toEqual([])
    const closerAlso = reduceMatch(leftover.state, {
      type: 'rematch',
      from: 'a',
    })
    expect(closerAlso.state.phase).toBe('ended')
    expect(closerAlso.messages).toEqual([])
  })

  it('does not start Rematch after a forfeit close', () => {
    const forfeited = reduceMatch(match, { type: 'close', from: 'a' }).state
    const first = reduceMatch(forfeited, { type: 'rematch', from: 'a' })
    const both = reduceMatch(first.state, { type: 'rematch', from: 'b' })

    expect(both.state.phase).toBe('ended')
    expect(both.state.outcome).toEqual(forfeited.outcome)
    expect(both.messages).toEqual([])
  })

  it('does not flip a declared outcome when the same death is applied twice', () => {
    const first = reduceMatch(match, { type: 'death', from: 'a' })
    const twice = reduceMatch(first.state, { type: 'death', from: 'a' })

    expect(twice.state.outcome).toEqual(first.state.outcome)
    expect(twice.messages).toEqual([])
  })
})

describe('Match referee verified identities', () => {
  const match = createMatchState('match-1', 'a', 'b')

  it('keeps identity slots unset until both sides report', () => {
    const result = reduceMatch(match, {
      type: 'identity',
      from: 'a',
      claims: { name: 'Ana', picture: 'https://example.com/a.jpg' },
    })

    expect(result.state.identities).toEqual({
      a: { name: 'Ana', picture: 'https://example.com/a.jpg' },
      b: undefined,
    })
    expect(result.messages).toEqual([])
  })

  it('broadcasts verified identities once both sides report', () => {
    const one = reduceMatch(match, {
      type: 'identity',
      from: 'a',
      claims: { name: 'Ana', picture: 'https://example.com/a.jpg' },
    }).state
    const result = reduceMatch(one, {
      type: 'identity',
      from: 'b',
      claims: null,
    })

    expect(result.state.identities).toEqual({
      a: { name: 'Ana', picture: 'https://example.com/a.jpg' },
      b: null,
    })
    expect(result.messages).toEqual([
      {
        to: 'a',
        type: 'identities',
        players: [
          { id: 'a', name: 'Ana', picture: 'https://example.com/a.jpg' },
          { id: 'b', name: null, picture: null },
        ],
      },
      {
        to: 'b',
        type: 'identities',
        players: [
          { id: 'a', name: 'Ana', picture: 'https://example.com/a.jpg' },
          { id: 'b', name: null, picture: null },
        ],
      },
    ])
  })

  it('accepts both anonymous sides', () => {
    const one = reduceMatch(match, {
      type: 'identity',
      from: 'a',
      claims: null,
    }).state
    const result = reduceMatch(one, {
      type: 'identity',
      from: 'b',
      claims: null,
    })

    expect(result.state.identities).toEqual({ a: null, b: null })
    expect(result.messages).toHaveLength(2)
    expect(result.messages[0]).toMatchObject({
      type: 'identities',
      players: [
        { id: 'a', name: null, picture: null },
        { id: 'b', name: null, picture: null },
      ],
    })
  })

  it('ignores a second identity report from the same participant', () => {
    const one = reduceMatch(match, {
      type: 'identity',
      from: 'a',
      claims: null,
    }).state
    const again = reduceMatch(one, {
      type: 'identity',
      from: 'a',
      claims: { name: 'Spoof', picture: 'https://evil.example/x.png' },
    })

    expect(again.state.identities).toEqual({ a: null, b: undefined })
    expect(again.messages).toEqual([])
  })

  it('keeps identities across Rematch', () => {
    const identified = reduceMatch(
      reduceMatch(match, {
        type: 'identity',
        from: 'a',
        claims: { name: 'Ana', picture: 'https://example.com/a.jpg' },
      }).state,
      { type: 'identity', from: 'b', claims: null },
    ).state
    const ended = reduceMatch(identified, { type: 'death', from: 'a' }).state
    const rematch = reduceMatch(
      reduceMatch(ended, { type: 'rematch', from: 'a' }).state,
      { type: 'rematch', from: 'b' },
    )

    expect(rematch.state.identities).toEqual(identified.identities)
    expect(rematch.state.phase).toBe('playing')
  })
})
