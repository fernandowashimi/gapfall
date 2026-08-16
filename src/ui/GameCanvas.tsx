import { useEffect, useEffectEvent, useRef } from 'react'
import type { PointerEvent } from 'react'
import {
  advanceGame,
  BLOCK_HEIGHT,
  BLOCK_WIDTH,
  COLUMN_COUNT,
  createGame,
  GAME_HEIGHT,
  GAME_WIDTH,
  launchBlock,
  pauseGame,
  PLAYFIELD_HEIGHT,
  resumeGame,
  type Column,
  type GameState,
} from '../game/game-core'
import { loadGameSprites, type GameSprites } from './sprites'

interface GameCanvasProps {
  onGameChange: (game: GameState) => void
  resumeRequest: number
}

const keyColumns: Record<string, Column> = { a: 0, s: 1, k: 2, l: 3 }

export function GameCanvas({ onGameChange, resumeRequest }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<GameState>(createGame())
  const spritesRef = useRef<GameSprites | null>(null)
  const notifyGameChange = useEffectEvent(onGameChange)

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
    notifyGameChange(gameRef.current)
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context) return

    context.imageSmoothingEnabled = false

    let frameId = 0
    let lastFrame = performance.now()

    const tick = (now: number) => {
      const delta = Math.min((now - lastFrame) / 1000, 0.1)
      lastFrame = now
      const before = gameRef.current
      const next = advanceGame(before, delta)
      gameRef.current = next
      drawGame(context, next, spritesRef.current)
      if (before.score !== next.score || before.phase !== next.phase)
        notifyGameChange(next)
      frameId = requestAnimationFrame(tick)
    }

    drawGame(context, gameRef.current, spritesRef.current)
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [])

  useEffect(() => {
    gameRef.current = resumeGame(gameRef.current)
    notifyGameChange(gameRef.current)
  }, [resumeRequest])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const column = keyColumns[event.key.toLowerCase()]
      if (column === undefined || event.repeat) return
      event.preventDefault()
      gameRef.current = launchBlock(gameRef.current, column)
    }
    const handleVisibility = () => {
      if (document.hidden) gameRef.current = pauseGame(gameRef.current)
      notifyGameChange(gameRef.current)
    }
    const handleBlur = () => {
      gameRef.current = pauseGame(gameRef.current)
      notifyGameChange(gameRef.current)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) * (GAME_WIDTH / bounds.width)
    const column = Math.min(
      COLUMN_COUNT - 1,
      Math.max(0, Math.floor(x / BLOCK_WIDTH)),
    ) as Column
    gameRef.current = launchBlock(gameRef.current, column)
  }

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      onPointerDown={handlePointerDown}
      aria-label="Campo do jogo. Toque em uma coluna para lançar TNT."
    />
  )
}

function drawGame(
  context: CanvasRenderingContext2D,
  game: GameState,
  sprites: GameSprites | null,
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
  drawLauncher(context, sprites)
  if (game.phase === 'preparing')
    drawPreparation(context, game.preparationRemaining)
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
  row.cells.forEach((filled, column) => {
    if (!filled) return
    const stoneSprite =
      (row.id + column) % 2 === 0
        ? sprites?.stoneBlock
        : sprites?.stoneBlockVariant
    drawSprite(
      context,
      stoneSprite ?? sprites?.stoneBlock ?? null,
      column,
      row.y,
      '#2563eb',
      '#93c5fd',
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
