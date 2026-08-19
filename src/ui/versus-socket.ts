import { PartySocket } from 'partysocket'
import { decodePaired } from '../match/messages'

const QUEUE_ROOM = 'public'

export function connectQueue(
  onPaired: (matchId: string, playerId: string) => void,
): PartySocket {
  const socket = new PartySocket({
    host: window.location.host,
    party: 'queue',
    room: QUEUE_ROOM,
    maxRetries: 0,
  })
  socket.addEventListener('message', (event) => {
    const message = decodePaired(String(event.data))
    if (message?.type !== 'paired') return
    onPaired(message.matchId, socket.id)
  })
  return socket
}

export function connectMatch(matchId: string, playerId: string): PartySocket {
  return new PartySocket({
    host: window.location.host,
    party: 'match',
    room: matchId,
    id: playerId,
    maxRetries: 0,
  })
}
