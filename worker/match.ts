import { Server, type Connection } from 'partyserver'

export class Match extends Server {
  static options = { hibernate: false }

  onConnect(connection: Connection) {
    if ([...this.getConnections()].length > 2) {
      connection.close(4000, 'match-full')
    }
  }
}
