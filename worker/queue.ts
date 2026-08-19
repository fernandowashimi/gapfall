import { Server, type Connection } from 'partyserver'
import { encodePaired } from '../src/match/messages'
import {
  createQueueState,
  reduceQueue,
  type QueueEvent,
  type QueueState,
} from '../src/match/referee'

export class Queue extends Server {
  #queue: QueueState = createQueueState()

  onConnect(connection: Connection) {
    this.apply({ type: 'join', playerId: connection.id })
  }

  onClose(connection: Connection) {
    this.apply({ type: 'leave', playerId: connection.id })
  }

  private apply(event: QueueEvent) {
    const result = reduceQueue(this.#queue, event, () => crypto.randomUUID())
    this.#queue = result.state
    for (const message of result.messages) {
      if (message.type !== 'paired') continue
      this.getConnection(message.to)?.send(encodePaired(message.matchId))
    }
  }
}
