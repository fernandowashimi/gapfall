export const DEFAULT_AUDIO_VOLUME = 0.8

export const AUDIO_MUTED_KEY = 'gapfall:audio-muted'
export const AUDIO_VOLUME_KEY = 'gapfall:audio-volume'

export interface AudioSettings {
  muted: boolean
  volume: number
}

export function parseAudioSettings(
  mutedRaw: string | null,
  volumeRaw: string | null,
): AudioSettings {
  const muted = mutedRaw === 'true'
  const parsedVolume = volumeRaw === null ? DEFAULT_AUDIO_VOLUME : Number(volumeRaw)
  const volume = Number.isFinite(parsedVolume)
    ? Math.min(1, Math.max(0, parsedVolume))
    : DEFAULT_AUDIO_VOLUME
  return { muted, volume }
}

export function serializeAudioSettings(settings: AudioSettings): {
  muted: string
  volume: string
} {
  return {
    muted: settings.muted ? 'true' : 'false',
    volume: String(settings.volume),
  }
}

export function readAudioSettings(
  storage: Pick<Storage, 'getItem'> = localStorage,
): AudioSettings {
  return parseAudioSettings(
    storage.getItem(AUDIO_MUTED_KEY),
    storage.getItem(AUDIO_VOLUME_KEY),
  )
}

export function writeAudioSettings(
  settings: AudioSettings,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  const stored = serializeAudioSettings(settings)
  storage.setItem(AUDIO_MUTED_KEY, stored.muted)
  storage.setItem(AUDIO_VOLUME_KEY, stored.volume)
}
