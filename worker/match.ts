import { Server, type Connection, type WSMessage } from 'partyserver'
import {
  decodeDeath,
  decodeLinesRemoved,
  decodeRematch,
  encodeLinesRemoved,
  encodeOutcome,
  encodeRematchBegin,
  encodeRematchUnavailable,
} from '../src/match/messages'
import {
  createMatchState,
  reduceMatch,
  type MatchEvent,
  type MatchState,
  type RefereeMessage,
} from '../src/match/referee'

export class Match extends Server {
  static options = { hibernate: false }

  #match: MatchState | null = null

  async onStart() {
    this.#match = (await this.ctx.storage.get<MatchState>('match')) ?? null
  }

  async onConnect(connection: Connection) {
    const ids = [...this.getConnections()].map((connected) => connected.id)
    if (ids.length > 2) {
      connection.close(4000, 'match-full')
      return
    }
    if (ids.length === 2) {
      this.#match ??= createMatchState(this.name, ids[0], ids[1])
      await this.ctx.storage.put('match', this.#match)
    }
  }

  async onMessage(connection: Connection, message: WSMessage) {
    if (typeof message !== 'string' || !this.#match) return
    const event = clientEvent(connection.id, message)
    if (event) await this.apply(event)
  }

  async onClose(connection: Connection) {
    await this.apply({ type: 'close', from: connection.id })
  }

  private async apply(event: MatchEvent) {
    if (!this.#match) return
    const result = reduceMatch(this.#match, event)
    this.#match = result.state
    if (event.type !== 'lines-removed') {
      await this.ctx.storage.put('match', result.state)
    }
    for (const message of result.messages) {
      const raw = encodeRefereeMessage(message)
      if (raw) this.getConnection(message.to)?.send(raw)
    }
  }
}

function clientEvent(from: string, raw: string): MatchEvent | null {
  if (decodeDeath(raw)) return { type: 'death', from }
  if (decodeRematch(raw)) return { type: 'rematch', from }
  const lines = decodeLinesRemoved(raw)
  if (lines) return { type: 'lines-removed', from, n: lines.n }
  return null
}

function encodeRefereeMessage(message: RefereeMessage): string | null {
  switch (message.type) {
    case 'lines-removed':
      return encodeLinesRemoved(message.n)
    case 'outcome':
      return encodeOutcome(message.winner, message.loser, message.reason)
    case 'rematch-begin':
      return encodeRematchBegin()
    case 'rematch-unavailable':
      return encodeRematchUnavailable()
    case 'paired':
      return null
  }
}
