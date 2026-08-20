import { describe, expect, it } from 'vitest'
import {
  parsePlayerSession,
  profileFromIdToken,
  serializePlayerSession,
  type PlayerProfile,
} from './player-session'

const samplePlayer: PlayerProfile = {
  name: 'Ana Silva',
  picture: 'https://example.com/avatar.jpg',
  idToken: 'stored-token',
}

function fakeJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${header}.${body}.sig`
}

describe('player session prefs', () => {
  it('round-trips a Player profile', () => {
    const raw = serializePlayerSession(samplePlayer)
    expect(parsePlayerSession(raw)).toEqual(samplePlayer)
  })

  it('returns null for missing or invalid stored data', () => {
    expect(parsePlayerSession(null)).toBeNull()
    expect(parsePlayerSession('')).toBeNull()
    expect(parsePlayerSession('not-json')).toBeNull()
    expect(parsePlayerSession(JSON.stringify({ name: 'Ana' }))).toBeNull()
  })

  it('builds a profile from a Google ID token payload', () => {
    const token = fakeJwt({
      name: 'Ana Silva',
      picture: 'https://example.com/avatar.jpg',
      sub: '123',
    })
    expect(profileFromIdToken(token)).toEqual({
      name: 'Ana Silva',
      picture: 'https://example.com/avatar.jpg',
      idToken: token,
    })
  })

  it('rejects ID tokens without name and picture claims', () => {
    expect(profileFromIdToken(fakeJwt({ sub: '123' }))).toBeNull()
    expect(profileFromIdToken('bad.token')).toBeNull()
  })
})
