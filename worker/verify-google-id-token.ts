import type { VerifiedIdentity } from '../src/match/referee'

type TokenInfo = {
  aud?: string
  iss?: string
  name?: string
  picture?: string
  error?: string
}

export async function verifyGoogleIdToken(
  idToken: string,
  audience: string,
): Promise<VerifiedIdentity | null> {
  if (!idToken || !audience) return null
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    )
    if (!response.ok) return null
    const payload = (await response.json()) as TokenInfo
    if (payload.error || payload.aud !== audience) return null
    if (
      payload.iss !== 'accounts.google.com' &&
      payload.iss !== 'https://accounts.google.com'
    ) {
      return null
    }
    if (typeof payload.name !== 'string' || typeof payload.picture !== 'string') {
      return null
    }
    return { name: payload.name, picture: payload.picture }
  } catch {
    return null
  }
}
