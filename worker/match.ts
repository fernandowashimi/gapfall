import { Server, type Connection, type WSMessage } from 'partyserver'
import { decodeLinesRemoved, encodeLinesRemoved } from '../src/match/messages'
import {
  createMatchState,
  reduceMatch,
  type MatchEvent,
  type MatchState,
} from '../src/match/referee'

export class Match extends Server {
  static options = { hibernate: false }

  #match: MatchState | null = null

  onConnect(connection: Connection) {
    const ids = [...this.getConnections()].map((connected) => connected.id)
    if (ids.length > 2) {
      connection.close(4000, 'match-full')
      return
    }
    if (ids.length === 2) {
      this.#match ??= createMatchState(this.name, ids[0], ids[1])
    }
  }

  onMessage(connection: Connection, message: WSMessage) {
    if (typeof message !== 'string' || !this.#match) return
    const decoded = decodeLinesRemoved(message)
    if (!decoded) return
    this.apply({
      type: 'lines-removed',
      from: connection.id,
      n: decoded.n,
    })
  }

  private apply(event: MatchEvent) {
    if (!this.#match) return
    const result = reduceMatch(this.#match, event)
    this.#match = result.state
    for (const message of result.messages) {
      if (message.type !== 'lines-removed') continue
      this.getConnection(message.to)?.send(encodeLinesRemoved(message.n))
    }
  }
}
