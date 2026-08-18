import {
  createMatchState,
  reduceMatch,
  type MatchEvent,
  type MatchState,
  type RefereeMessage,
} from './referee'

const QUEUE_CHANNEL = 'gapfall-versus-queue'

type QueueBusMessage =
  | { type: 'join'; playerId: string }
  | { type: 'leave'; playerId: string }
  | { type: 'paired'; matchId: string; players: readonly [string, string] }
  | { type: 'match-event'; matchId: string; event: MatchEvent }

export type VersusSession = {
  playerId: string
  cancel(): void
  send(
    event:
      | { type: 'lines-removed'; n: number }
      | { type: 'death' }
      | { type: 'close' }
      | { type: 'rematch' },
  ): void
}

export function openVersusQueue(
  onMessage: (message: RefereeMessage) => void,
): VersusSession {
  const playerId = crypto.randomUUID()
  const queue = new BroadcastChannel(QUEUE_CHANNEL)
  const waiters = new Set<string>([playerId])
  let matchId: string | null = null
  let matchState: MatchState | null = null

  const apply = (event: MatchEvent) => {
    if (!matchState) return
    const result = reduceMatch(matchState, event)
    matchState = result.state
    for (const message of result.messages) {
      if (message.to === playerId) onMessage(message)
    }
  }

  const send: VersusSession['send'] = (event) => {
    if (!matchId) return
    const full = { ...event, from: playerId } as MatchEvent
    apply(full)
    queue.postMessage({
      type: 'match-event',
      matchId,
      event: full,
    } satisfies QueueBusMessage)
  }

  const joinMatch = (id: string, players: readonly [string, string]) => {
    matchId = id
    matchState = createMatchState(id, players[0], players[1])
    onMessage({ to: playerId, type: 'paired', matchId: id })
  }

  queue.onmessage = (message: MessageEvent<QueueBusMessage>) => {
    const data = message.data
    if (data.type === 'join' && data.playerId !== playerId) {
      waiters.add(data.playerId)
      if (waiters.size === 2) {
        const [first, second] = [...waiters].sort() as [string, string]
        if (playerId === first) {
          const id = crypto.randomUUID()
          const players = [first, second] as const
          waiters.clear()
          queue.postMessage({
            type: 'paired',
            matchId: id,
            players,
          } satisfies QueueBusMessage)
          joinMatch(id, players)
        }
      }
    }
    if (data.type === 'leave') {
      waiters.delete(data.playerId)
    }
    if (data.type === 'paired' && data.players.includes(playerId) && !matchId) {
      waiters.clear()
      joinMatch(data.matchId, data.players)
    }
    if (
      data.type === 'match-event' &&
      data.matchId === matchId &&
      data.event.from !== playerId
    ) {
      apply(data.event)
    }
  }

  queue.postMessage({ type: 'join', playerId } satisfies QueueBusMessage)

  let closed = false
  const cancel = () => {
    if (closed) return
    closed = true
    window.removeEventListener('pagehide', cancel)
    if (matchState && !matchState.outcome) {
      send({ type: 'close' })
    }
    queue.postMessage({ type: 'leave', playerId } satisfies QueueBusMessage)
    queue.close()
  }

  window.addEventListener('pagehide', cancel)

  return {
    playerId,
    send,
    cancel,
  }
}
