import launchUrl from '../assets/audio/launch.wav'
import detonateUrl from '../assets/audio/detonate.wav'
import missUrl from '../assets/audio/miss.wav'
import deathUrl from '../assets/audio/death.wav'
import type { FeedbackSound } from './cues'
import {
  DEFAULT_AUDIO_VOLUME,
  type AudioSettings,
} from './audio-settings'

const soundUrls: Record<FeedbackSound, string> = {
  launch: launchUrl,
  detonate: detonateUrl,
  miss: missUrl,
  death: deathUrl,
}

export interface GameAudio {
  play(sound: FeedbackSound): void
  silence(): void
  unsilence(): void
  unlock(): void
  applySettings(settings: AudioSettings): void
}

export function createGameAudio(
  initial: AudioSettings = {
    muted: false,
    volume: DEFAULT_AUDIO_VOLUME,
  },
): GameAudio {
  const buffers = new Map<FeedbackSound, HTMLAudioElement>()
  const active = new Set<HTMLAudioElement>()
  let unlocked = false
  let suppressed = false
  let userMuted = initial.muted
  let volume = initial.volume

  for (const [name, url] of Object.entries(soundUrls) as [
    FeedbackSound,
    string,
  ][]) {
    const audio = new Audio(url)
    audio.preload = 'auto'
    buffers.set(name, audio)
  }

  return {
    unlock() {
      if (unlocked) return
      unlocked = true
      for (const audio of buffers.values()) {
        audio.volume = 0
        void audio
          .play()
          .then(() => {
            audio.pause()
            audio.currentTime = 0
            audio.volume = volume
          })
          .catch(() => {
            audio.volume = volume
          })
      }
    },
    play(sound) {
      if (suppressed || userMuted || !unlocked) return
      const template = buffers.get(sound)
      if (!template) return
      const instance = template.cloneNode(true) as HTMLAudioElement
      instance.volume = volume
      active.add(instance)
      instance.addEventListener('ended', () => active.delete(instance), {
        once: true,
      })
      void instance.play().catch(() => {
        active.delete(instance)
      })
    },
    silence() {
      suppressed = true
      for (const instance of active) {
        instance.pause()
        instance.currentTime = 0
      }
      active.clear()
    },
    unsilence() {
      suppressed = false
    },
    applySettings(settings) {
      userMuted = settings.muted
      volume = settings.volume
      if (userMuted) {
        for (const instance of active) {
          instance.pause()
          instance.currentTime = 0
        }
        active.clear()
      } else {
        for (const instance of active) instance.volume = volume
      }
    },
  }
}
