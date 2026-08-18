import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openVersusQueue } from './local-bus'

describe('openVersusQueue', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      addEventListener() {},
      removeEventListener() {},
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    {
      name: 'the later join would sort first',
      ids: ['player-b', 'player-a'],
    },
    {
      name: 'the earlier join would sort first',
      ids: ['player-a', 'player-b'],
    },
  ])(
    'pairs two sequential Versus Matchmaking joins when $name',
    async ({ ids }) => {
      let next = 0
      vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
        const id = ids[next++] ?? 'extra'
        return id as ReturnType<typeof crypto.randomUUID>
      })

      const firstMessages: string[] = []
      const secondMessages: string[] = []
      const first = openVersusQueue((message) => {
        firstMessages.push(message.type)
      })
      const second = openVersusQueue((message) => {
        secondMessages.push(message.type)
      })

      await vi.waitFor(() => {
        expect(firstMessages).toContain('paired')
        expect(secondMessages).toContain('paired')
      })

      first.cancel()
      second.cancel()
    },
  )
})
