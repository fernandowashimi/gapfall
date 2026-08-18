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
    expect(result.match).toEqual(createMatchState('match-1', 'a', 'b'))
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
  })

  it('does not flip a declared outcome when the same death is applied twice', () => {
    const first = reduceMatch(match, { type: 'death', from: 'a' })
    const twice = reduceMatch(first.state, { type: 'death', from: 'a' })

    expect(twice.state.outcome).toEqual(first.state.outcome)
    expect(twice.messages).toEqual([])
  })
})
