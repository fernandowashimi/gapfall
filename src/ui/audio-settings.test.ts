import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AUDIO_VOLUME,
  parseAudioSettings,
  serializeAudioSettings,
} from './audio-settings'

describe('audio settings prefs', () => {
  it('defaults to unmuted with a mid-high volume', () => {
    expect(parseAudioSettings(null, null)).toEqual({
      muted: false,
      volume: DEFAULT_AUDIO_VOLUME,
    })
  })

  it('round-trips mute and volume', () => {
    const stored = serializeAudioSettings({ muted: true, volume: 0.4 })
    expect(parseAudioSettings(stored.muted, stored.volume)).toEqual({
      muted: true,
      volume: 0.4,
    })
  })

  it('clamps invalid volume and treats bad mute as unmuted', () => {
    expect(parseAudioSettings('yes', '2')).toEqual({
      muted: false,
      volume: 1,
    })
    expect(parseAudioSettings('false', '-1')).toEqual({
      muted: false,
      volume: 0,
    })
  })
})
