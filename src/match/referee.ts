export type PlayerId = string

export type QueueState = {
  waiters: readonly PlayerId[]
}

export type MatchReason = 'death-line' | 'forfeit'

export type MatchOutcome = {
  winner: PlayerId
  loser: PlayerId
  reason: MatchReason
}

export type MatchPhase = 'playing' | 'ended'

export type MatchState = {
  id: string
  players: readonly [PlayerId, PlayerId]
  phase: MatchPhase
  outcome: MatchOutcome | null
  rematchVotes: readonly PlayerId[]
}

export type QueueEvent =
  { type: 'join'; playerId: PlayerId } | { type: 'leave'; playerId: PlayerId }

export type MatchEvent =
  | { type: 'lines-removed'; from: PlayerId; n: number }
  | { type: 'death'; from: PlayerId }
  | { type: 'close'; from: PlayerId }
  | { type: 'rematch'; from: PlayerId }

export type RefereeMessage =
  | { to: PlayerId; type: 'paired'; matchId: string }
  | { to: PlayerId; type: 'lines-removed'; n: number }
  | {
      to: PlayerId
      type: 'outcome'
      winner: PlayerId
      loser: PlayerId
      reason: MatchReason
    }
  | { to: PlayerId; type: 'rematch-begin' }
  | { to: PlayerId; type: 'rematch-unavailable' }

export type QueueResult = {
  state: QueueState
  messages: readonly RefereeMessage[]
  match?: MatchState
}

export type MatchResult = {
  state: MatchState
  messages: readonly RefereeMessage[]
}

export function createQueueState(): QueueState {
  return { waiters: [] }
}

export function createMatchState(
  id: string,
  playerA: PlayerId,
  playerB: PlayerId,
): MatchState {
  return {
    id,
    players: [playerA, playerB],
    phase: 'playing',
    outcome: null,
    rematchVotes: [],
  }
}

export function reduceQueue(
  state: QueueState,
  event: QueueEvent,
  mintMatchId: () => string,
): QueueResult {
  if (event.type === 'leave') {
    return {
      state: {
        waiters: state.waiters.filter((id) => id !== event.playerId),
      },
      messages: [],
    }
  }

  if (state.waiters.includes(event.playerId)) {
    return { state, messages: [] }
  }

  if (state.waiters.length === 0) {
    return { state: { waiters: [event.playerId] }, messages: [] }
  }

  const opponent = state.waiters[0]
  const matchId = mintMatchId()
  const match = createMatchState(matchId, opponent, event.playerId)
  return {
    state: { waiters: state.waiters.slice(1) },
    match,
    messages: [
      { to: opponent, type: 'paired', matchId },
      { to: event.playerId, type: 'paired', matchId },
    ],
  }
}

export function reduceMatch(state: MatchState, event: MatchEvent): MatchResult {
  switch (event.type) {
    case 'lines-removed':
      return relayLinesRemoved(state, event.from, event.n)
    case 'death':
      return declareOutcome(state, event.from, 'death-line')
    case 'close':
      return closePlayer(state, event.from)
    case 'rematch':
      return voteRematch(state, event.from)
    default:
      return { state, messages: [] }
  }
}

function otherPlayer(state: MatchState, playerId: PlayerId): PlayerId | null {
  if (state.players[0] === playerId) return state.players[1]
  if (state.players[1] === playerId) return state.players[0]
  return null
}

function relayLinesRemoved(
  state: MatchState,
  from: PlayerId,
  n: number,
): MatchResult {
  const opponent = otherPlayer(state, from)
  if (!opponent || state.phase !== 'playing' || n <= 0) {
    return { state, messages: [] }
  }
  return {
    state,
    messages: [{ to: opponent, type: 'lines-removed', n }],
  }
}

function declareOutcome(
  state: MatchState,
  loser: PlayerId,
  reason: MatchReason,
): MatchResult {
  if (state.outcome || state.phase === 'ended') {
    return { state, messages: [] }
  }
  const winner = otherPlayer(state, loser)
  if (!winner) return { state, messages: [] }

  const outcome = { winner, loser, reason }
  return {
    state: { ...state, phase: 'ended', outcome, rematchVotes: [] },
    messages: outcomeMessages(state, outcome),
  }
}

function closePlayer(state: MatchState, playerId: PlayerId): MatchResult {
  if (state.outcome) {
    const remaining = otherPlayer(state, playerId)
    if (!remaining) return { state, messages: [] }
    return {
      state: {
        ...state,
        rematchVotes: state.rematchVotes.filter((id) => id !== playerId),
      },
      messages: [{ to: remaining, type: 'rematch-unavailable' }],
    }
  }
  return declareOutcome(state, playerId, 'forfeit')
}

function voteRematch(state: MatchState, playerId: PlayerId): MatchResult {
  if (!state.outcome || !state.players.includes(playerId)) {
    return { state, messages: [] }
  }
  if (state.rematchVotes.includes(playerId)) {
    return { state, messages: [] }
  }

  const rematchVotes = [...state.rematchVotes, playerId]
  if (rematchVotes.length < 2) {
    return { state: { ...state, rematchVotes }, messages: [] }
  }

  return {
    state: {
      ...state,
      phase: 'playing',
      outcome: null,
      rematchVotes: [],
    },
    messages: state.players.map((to) => ({ to, type: 'rematch-begin' })),
  }
}

function outcomeMessages(
  state: MatchState,
  outcome: MatchOutcome,
): RefereeMessage[] {
  return state.players.map((to) => ({
    to,
    type: 'outcome',
    winner: outcome.winner,
    loser: outcome.loser,
    reason: outcome.reason,
  }))
}
