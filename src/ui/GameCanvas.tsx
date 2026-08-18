import { useEffect, useRef } from 'react'
import type { MutableRefObject, PointerEvent } from 'react'
import {
  BLOCK_HEIGHT,
  BLOCK_WIDTH,
  COLUMN_COUNT,
  GAME_HEIGHT,
  GAME_WIDTH,
  isOccupied,
  PLAYFIELD_HEIGHT,
  type Column,
  type GameState,
} from '../game/game-core'
import type { GameAudio } from './audio'
import {
  DETONATION_DURATION,
  applyAudioGate,
  hudOf,
  launchRound,
  pauseRound,
  tickRound,
  type ActiveDetonation,
  type RoundHud,
  type RoundResult,
  type RoundSession,
} from './round'
import {
  EXPLOSION_FRAME_COUNT,
  EXPLOSION_FRAME_HEIGHT,
  EXPLOSION_FRAME_WIDTH,
  loadGameSprites,
  type GameSprites,
} from './sprites'

interface GameCanvasProps {
  sessionRef: MutableRefObject<RoundSession | null>
  onHudChange: (hud: RoundHud) => void
  audio: GameAudio
  pauseOnBlur?: boolean
  onTick?: (result: RoundResult) => void
}

const keyColumns: Record<string, Column> = { a: 0, s: 1, k: 2, l: 3 }

export function GameCanvas({
  sessionRef,
  onHudChange,
  audio,
  pauseOnBlur = true,
  onTick,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fpsRef = useRef<HTMLDivElement>(null)
  const spritesRef = useRef<GameSprites | null>(null)
  const audioRef = useRef(audio)
  const onHudChangeRef = useRef(onHudChange)
  const pauseOnBlurRef = useRef(pauseOnBlur)
  const onTickRef = useRef(onTick)

  useEffect(() => {
    audioRef.current = audio
  }, [audio])

  useEffect(() => {
    onHudChangeRef.current = onHudChange
  }, [onHudChange])

  useEffect(() => {
    pauseOnBlurRef.current = pauseOnBlur
  }, [pauseOnBlur])

  useEffect(() => {
    onTickRef.current = onTick
  }, [onTick])

  useEffect(() => {
    let cancelled = false
    loadGameSprites()
      .then((sprites) => {
        if (!cancelled) spritesRef.current = sprites
      })
      .catch((error) => console.error(error))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const session = sessionRef.current
    if (session) notifyHudChange(onHudChangeRef, session)

    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context) return

    context.imageSmoothingEnabled = false

    let frameId = 0
    let lastFrame = performance.now()

    const tick = (now: number) => {
      const delta = Math.min((now - lastFrame) / 1000, 0.1)
      lastFrame = now
      const current = sessionRef.current
      if (current) {
        const result = tickRound(current, delta)
        commitRound(sessionRef, result, audioRef.current, onHudChangeRef)
        onTickRef.current?.(result)
        drawGame(
          context,
          result.session.game,
          spritesRef.current,
          result.session.detonations,
        )
      }
      if (import.meta.env.DEV && fpsRef.current) {
        fpsRef.current.textContent = `${Math.round(1 / Math.max(delta, 1 / 1000))} FPS`
      }
      frameId = requestAnimationFrame(tick)
    }

    if (session) {
      drawGame(context, session.game, spritesRef.current, session.detonations)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [sessionRef])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const column = keyColumns[event.key.toLowerCase()]
      if (column === undefined || event.repeat) return
      event.preventDefault()
      const current = sessionRef.current
      if (!current) return
      audioRef.current.unlock()
      commitRound(
        sessionRef,
        launchRound(current, column),
        audioRef.current,
        onHudChangeRef,
      )
    }
    const handleVisibility = () => {
      const current = sessionRef.current
      if (!current || !document.hidden || !pauseOnBlurRef.current) return
      commitRound(
        sessionRef,
        pauseRound(current),
        audioRef.current,
        onHudChangeRef,
      )
    }
    const handleBlur = () => {
      const current = sessionRef.current
      if (!current || !pauseOnBlurRef.current) return
      commitRound(
        sessionRef,
        pauseRound(current),
        audioRef.current,
        onHudChangeRef,
      )
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [sessionRef])

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const current = sessionRef.current
    if (!current) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) * (GAME_WIDTH / bounds.width)
    const column = Math.min(
      COLUMN_COUNT - 1,
      Math.max(0, Math.floor(x / BLOCK_WIDTH)),
    ) as Column
    audioRef.current.unlock()
    commitRound(
      sessionRef,
      launchRound(current, column),
      audioRef.current,
      onHudChangeRef,
    )
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="game-canvas"
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        onPointerDown={handlePointerDown}
        aria-label="Campo do jogo. Toque em uma coluna para lançar TNT."
      />
      {import.meta.env.DEV ? (
        <div ref={fpsRef} className="fps-overlay" aria-hidden="true" />
      ) : null}
    </>
  )
}

function notifyHudChange(
  onHudChangeRef: MutableRefObject<(hud: RoundHud) => void>,
  session: RoundSession,
) {
  onHudChangeRef.current(hudOf(session))
}

function commitRound(
  sessionRef: MutableRefObject<RoundSession | null>,
  result: RoundResult,
  audio: GameAudio,
  onHudChangeRef: MutableRefObject<(hud: RoundHud) => void>,
) {
  const previous = sessionRef.current
  sessionRef.current = result.session
  applyAudioGate(result.audioGate, audio)
  for (const sound of result.sounds) audio.play(sound)
  if (!previous || result.hudChanged) {
    notifyHudChange(onHudChangeRef, result.session)
  }
}

function drawGame(
  context: CanvasRenderingContext2D,
  game: GameState,
  sprites: GameSprites | null,
  detonations: readonly ActiveDetonation[],
) {
  context.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

  if (sprites) {
    context.drawImage(
      sprites.playfieldBackground,
      0,
      0,
      GAME_WIDTH,
      PLAYFIELD_HEIGHT,
    )
  } else {
    const background = context.createLinearGradient(0, 0, 0, GAME_HEIGHT)
    background.addColorStop(0, '#111d3a')
    background.addColorStop(1, '#080d1c')
    context.fillStyle = background
    context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
  }

  if (!sprites) drawGrid(context)

  for (const row of game.rows) drawRow(context, row, sprites)
  for (const shot of game.shots)
    drawSprite(
      context,
      sprites?.tntBlock ?? null,
      shot.column,
      shot.y,
      '#22c55e',
      '#bbf7d0',
    )
  drawDetonations(context, detonations, sprites)
  drawLauncher(context, sprites)
  if (game.phase === 'preparing')
    drawPreparation(context, game.preparationRemaining)
}

function drawDetonations(
  context: CanvasRenderingContext2D,
  detonations: readonly ActiveDetonation[],
  sprites: GameSprites | null,
) {
  const strip = sprites?.explosionStrip ?? null
  if (!strip) return

  for (const detonation of detonations) {
    const frame = Math.min(
      EXPLOSION_FRAME_COUNT - 1,
      Math.floor(
        (detonation.age / DETONATION_DURATION) * EXPLOSION_FRAME_COUNT,
      ),
    )
    detonation.cells.forEach((cell, column) => {
      if (!isOccupied(cell)) return
      context.drawImage(
        strip,
        frame * EXPLOSION_FRAME_WIDTH,
        0,
        EXPLOSION_FRAME_WIDTH,
        EXPLOSION_FRAME_HEIGHT,
        column * BLOCK_WIDTH,
        detonation.y,
        BLOCK_WIDTH,
        BLOCK_HEIGHT,
      )
    })
  }
}

function drawGrid(context: CanvasRenderingContext2D) {
  context.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  context.lineWidth = 1
  for (let column = 1; column < COLUMN_COUNT; column += 1) {
    const x = column * BLOCK_WIDTH
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, PLAYFIELD_HEIGHT)
    context.stroke()
  }
  context.strokeStyle = 'rgba(255, 255, 255, 0.14)'
  context.strokeRect(0.5, 0.5, GAME_WIDTH - 1, PLAYFIELD_HEIGHT - 1)
}

function drawRow(
  context: CanvasRenderingContext2D,
  row: GameState['rows'][number],
  sprites: GameSprites | null,
) {
  row.cells.forEach((cell, column) => {
    if (cell === 'empty') return
    if (cell === 'tnt') {
      drawSprite(
        context,
        sprites?.tntBlock ?? null,
        column,
        row.y,
        '#22c55e',
        '#bbf7d0',
      )
      return
    }
    const oreSprite = row.reinforced
      ? row.cracked
        ? (sprites?.crackedOre ?? sprites?.stoneBlock)
        : (sprites?.reinforcedOre ?? sprites?.stoneBlock)
      : (row.id + column) % 2 === 0
        ? sprites?.stoneBlock
        : sprites?.stoneBlockVariant
    drawSprite(
      context,
      oreSprite ?? sprites?.stoneBlock ?? null,
      column,
      row.y,
      row.reinforced ? '#64748b' : '#2563eb',
      row.reinforced ? '#cbd5e1' : '#93c5fd',
    )
  })
}

function drawSprite(
  context: CanvasRenderingContext2D,
  sprite: HTMLImageElement | null,
  column: number,
  y: number,
  fill: string,
  highlight: string,
) {
  const x = column * BLOCK_WIDTH

  if (sprite) {
    context.drawImage(sprite, x, y, BLOCK_WIDTH, BLOCK_HEIGHT)
    return
  }

  context.fillStyle = 'rgba(0, 0, 0, 0.22)'
  context.fillRect(x + 5, y + 5, BLOCK_WIDTH - 10, BLOCK_HEIGHT - 10)
  context.fillStyle = fill
  context.fillRect(x + 3, y + 3, BLOCK_WIDTH - 6, BLOCK_HEIGHT - 6)
  context.fillStyle = highlight
  context.fillRect(x + 8, y + 8, BLOCK_WIDTH - 16, 4)
}

function drawLauncher(
  context: CanvasRenderingContext2D,
  sprites: GameSprites | null,
) {
  const launcherHeight = GAME_HEIGHT - PLAYFIELD_HEIGHT

  if (sprites) {
    context.drawImage(
      sprites.launcherPanel,
      0,
      PLAYFIELD_HEIGHT,
      GAME_WIDTH,
      launcherHeight,
    )
  } else {
    context.fillStyle = '#0b1226'
    context.fillRect(0, PLAYFIELD_HEIGHT, GAME_WIDTH, launcherHeight)
  }
}

function drawPreparation(context: CanvasRenderingContext2D, remaining: number) {
  context.fillStyle = 'rgba(8, 13, 28, 0.62)'
  context.fillRect(0, 0, GAME_WIDTH, PLAYFIELD_HEIGHT)
  context.fillStyle = '#ffffff'
  context.font = '900 56px ui-monospace, monospace'
  context.textAlign = 'center'
  context.fillText(
    String(Math.ceil(remaining)),
    GAME_WIDTH / 2,
    PLAYFIELD_HEIGHT / 2,
  )
}
