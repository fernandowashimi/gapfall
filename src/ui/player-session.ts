export interface PlayerProfile {
  name: string
  picture: string
  idToken: string
}

export const PLAYER_SESSION_KEY = 'gapfall:player-session'

export function parsePlayerSession(raw: string | null): PlayerProfile | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as PlayerProfile).name === 'string' &&
      typeof (parsed as PlayerProfile).picture === 'string' &&
      typeof (parsed as PlayerProfile).idToken === 'string' &&
      (parsed as PlayerProfile).name.length > 0
    ) {
      return parsed as PlayerProfile
    }
  } catch {
    return null
  }
  return null
}

export function serializePlayerSession(profile: PlayerProfile): string {
  return JSON.stringify(profile)
}

export function readPlayerSession(
  storage: Pick<Storage, 'getItem'> = localStorage,
): PlayerProfile | null {
  return parsePlayerSession(storage.getItem(PLAYER_SESSION_KEY))
}

export function writePlayerSession(
  profile: PlayerProfile,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(PLAYER_SESSION_KEY, serializePlayerSession(profile))
}

export function clearPlayerSession(
  storage: Pick<Storage, 'removeItem'> = localStorage,
): void {
  storage.removeItem(PLAYER_SESSION_KEY)
}

export function profileFromIdToken(idToken: string): PlayerProfile | null {
  const segment = idToken.split('.')[1]
  if (!segment) return null
  try {
    const payload = JSON.parse(
      atob(segment.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { name?: string; picture?: string }
    if (typeof payload.name !== 'string' || typeof payload.picture !== 'string') {
      return null
    }
    return { name: payload.name, picture: payload.picture, idToken }
  } catch {
    return null
  }
}
