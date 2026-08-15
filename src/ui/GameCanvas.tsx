import { useEffect, useRef } from 'react'
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

interface GameCanvasProps {
  onGameChange: (game: GameState) => void
  resumeRequest: number
}

const keyColumns: Record<string, Column> = { a: 0, s: 1, k: 2, l: 3 }

export function GameCanvas({ onGameChange, resumeRequest }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<GameState>(createGame())
  const callbackRef = useRef(onGameChange)

  callbackRef.current = onGameChange

  useEffect(() => {
    callbackRef.current(gameRef.current)
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context) return

    let frameId = 0
    let lastFrame = performance.now()

    const tick = (now: number) => {
      const delta = Math.min((now - lastFrame) / 1000, 0.1)
      lastFrame = now
      const before = gameRef.current
      const next = advanceGame(before, delta)
      gameRef.current = next
      drawGame(context, next)
      if (before.score !== next.score || before.phase !== next.phase) callbackRef.current(next)
      frameId = requestAnimationFrame(tick)
    }

    drawGame(context, gameRef.current)
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [])

  useEffect(() => {
    gameRef.current = resumeGame(gameRef.current)
    callbackRef.current(gameRef.current)
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
      callbackRef.current(gameRef.current)
    }
    const handleBlur = () => {
      gameRef.current = pauseGame(gameRef.current)
      callbackRef.current(gameRef.current)
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
    const column = Math.min(COLUMN_COUNT - 1, Math.max(0, Math.floor(x / BLOCK_WIDTH))) as Column
    gameRef.current = launchBlock(gameRef.current, column)
  }

  return <canvas ref={canvasRef} className="game-canvas" width={GAME_WIDTH} height={GAME_HEIGHT} onPointerDown={handlePointerDown} aria-label="Campo do jogo. Toque em uma coluna para lançar um bloco." />
}

function drawGame(context: CanvasRenderingContext2D, game: GameState) {
  context.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
  const background = context.createLinearGradient(0, 0, 0, GAME_HEIGHT)
  background.addColorStop(0, '#111d3a')
  background.addColorStop(1, '#080d1c')
  context.fillStyle = background
  context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

  drawGrid(context)
  for (const row of game.rows) drawRow(context, row)
  for (const shot of game.shots) drawBlock(context, shot.column, shot.y, '#22c55e', '#bbf7d0')
  drawLauncher(context)
  if (game.phase === 'preparing') drawPreparation(context, game.preparationRemaining)
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

function drawRow(context: CanvasRenderingContext2D, row: GameState['rows'][number]) {
  row.cells.forEach((filled, column) => {
    if (filled) drawBlock(context, column, row.y, '#2563eb', '#93c5fd')
  })
}

function drawBlock(context: CanvasRenderingContext2D, column: number, y: number, fill: string, highlight: string) {
  const x = column * BLOCK_WIDTH
  context.fillStyle = 'rgba(0, 0, 0, 0.22)'
  context.fillRect(x + 5, y + 5, BLOCK_WIDTH - 10, BLOCK_HEIGHT - 10)
  context.fillStyle = fill
  context.fillRect(x + 3, y + 3, BLOCK_WIDTH - 6, BLOCK_HEIGHT - 6)
  context.fillStyle = highlight
  context.fillRect(x + 8, y + 8, BLOCK_WIDTH - 16, 4)
}

function drawLauncher(context: CanvasRenderingContext2D) {
  context.fillStyle = '#0b1226'
  context.fillRect(0, PLAYFIELD_HEIGHT, GAME_WIDTH, GAME_HEIGHT - PLAYFIELD_HEIGHT)
  context.fillStyle = 'rgba(255, 255, 255, 0.45)'
  context.font = '700 16px ui-monospace, monospace'
  context.textAlign = 'center'
  ;['A', 'S', 'K', 'L'].forEach((key, column) => context.fillText(key, column * BLOCK_WIDTH + BLOCK_WIDTH / 2, 770))
}

function drawPreparation(context: CanvasRenderingContext2D, remaining: number) {
  context.fillStyle = 'rgba(8, 13, 28, 0.62)'
  context.fillRect(0, 0, GAME_WIDTH, PLAYFIELD_HEIGHT)
  context.fillStyle = '#ffffff'
  context.font = '900 56px ui-monospace, monospace'
  context.textAlign = 'center'
  context.fillText(String(Math.ceil(remaining)), GAME_WIDTH / 2, PLAYFIELD_HEIGHT / 2)
}
