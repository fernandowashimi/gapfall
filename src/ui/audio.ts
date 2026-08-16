import launchUrl from '../assets/audio/launch.wav'
import detonateUrl from '../assets/audio/detonate.wav'
import missUrl from '../assets/audio/miss.wav'
import deathUrl from '../assets/audio/death.wav'
import type { FeedbackSound } from './cues'

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
}

export function createGameAudio(): GameAudio {
  const buffers = new Map<FeedbackSound, HTMLAudioElement>()
  const active = new Set<HTMLAudioElement>()
  let unlocked = false
  let muted = false

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
            audio.volume = 1
          })
          .catch(() => {
            audio.volume = 1
          })
      }
    },
    play(sound) {
      if (muted || !unlocked) return
      const template = buffers.get(sound)
      if (!template) return
      const instance = template.cloneNode(true) as HTMLAudioElement
      instance.volume = 1
      active.add(instance)
      instance.addEventListener('ended', () => active.delete(instance), {
        once: true,
      })
      void instance.play().catch(() => {
        active.delete(instance)
      })
    },
    silence() {
      muted = true
      for (const instance of active) {
        instance.pause()
        instance.currentTime = 0
      }
      active.clear()
    },
    unsilence() {
      muted = false
    },
  }
}
