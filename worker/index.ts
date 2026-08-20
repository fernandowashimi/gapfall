import { routePartykitRequest } from 'partyserver'
import type { Match } from './match'
import type { Queue } from './queue'

export { Match } from './match'
export { Queue } from './queue'

export type Env = {
  Match: DurableObjectNamespace<Match>
  Queue: DurableObjectNamespace<Queue>
  GOOGLE_CLIENT_ID?: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, env)) ??
      new Response('Not Found', { status: 404 })
    )
  },
}
