import { routePartykitRequest, Server, type Connection } from 'partyserver'
import {
  createMatchState,
  createQueueState,
  reduceMatch,
  reduceQueue,
  type MatchEvent,
  type MatchState,
  type QueueState,
  type RefereeMessage,
} from '../src/match/referee'

export class Queue extends Server {
  queue: QueueState = createQueueState()

  onConnect(connection: Connection) {
    const result = reduceQueue(
      this.queue,
      {
        type: 'join',
        playerId: connection.id,
      },
      () => crypto.randomUUID(),
    )
    this.queue = result.state
    if (result.match) {
      for (const message of result.messages) {
        this.sendTo(message)
      }
    }
  }

  onClose(connection: Connection) {
    const result = reduceQueue(
      this.queue,
      {
        type: 'leave',
        playerId: connection.id,
      },
      () => crypto.randomUUID(),
    )
    this.queue = result.state
  }

  private sendTo(message: RefereeMessage) {
    const target = [...this.getConnections()].find(
      (connection) => connection.id === message.to,
    )
    target?.send(JSON.stringify(message))
  }
}

export class Match extends Server {
  match: MatchState | null = null

  onConnect(connection: Connection) {
    const connections = [...this.getConnections()]
    if (connections.length > 2) {
      connection.close(4000, 'full')
      return
    }
    if (connections.length === 2 && !this.match) {
      const [first, second] = connections
      this.match = createMatchState(this.name, first.id, second.id)
    }
  }

  onMessage(connection: Connection, message: string | ArrayBuffer) {
    if (!this.match || typeof message !== 'string') return
    const parsed = JSON.parse(message) as Omit<MatchEvent, 'from'>
    const event = { ...parsed, from: connection.id } as MatchEvent
    const result = reduceMatch(this.match, event)
    this.match = result.state
    for (const outgoing of result.messages) {
      const target = [...this.getConnections()].find(
        (item) => item.id === outgoing.to,
      )
      target?.send(JSON.stringify(outgoing))
    }
  }

  onClose(connection: Connection) {
    if (!this.match) return
    const result = reduceMatch(this.match, {
      type: 'close',
      from: connection.id,
    })
    this.match = result.state
    for (const outgoing of result.messages) {
      const target = [...this.getConnections()].find(
        (item) => item.id === outgoing.to,
      )
      target?.send(JSON.stringify(outgoing))
    }
  }
}

export default {
  async fetch(
    request: Request,
    env: Record<string, unknown>,
  ): Promise<Response> {
    return (
      (await routePartykitRequest(request, env as never)) ||
      new Response('Not Found', { status: 404 })
    )
  },
}
