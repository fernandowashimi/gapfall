import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../game/game-core'
import {
  createShellState,
  reduceShell,
  type ShellIntent,
  type ShellState,
} from './app-shell'
import { createGameAudio } from './audio'
import {
  readAudioSettings,
  writeAudioSettings,
  type AudioSettings,
} from './audio-settings'
import { GameCanvas } from './GameCanvas'

const REPO_URL = 'https://github.com/fernandowashimi/gapfall'

export default function App() {
  const [shell, setShell] = useState<ShellState>(createShellState)
  const shellRef = useRef(shell)
  useEffect(() => {
    shellRef.current = shell
  }, [shell])

  const [round, setRound] = useState(0)
  const [resumeRequest, setResumeRequest] = useState(0)
  const [pauseRequest, setPauseRequest] = useState(0)
  const [game, setGame] = useState<GameState | null>(null)
  const gameRef = useRef(game)
  useEffect(() => {
    gameRef.current = game
  }, [game])

  const [highScore, setHighScore] = useState(readHighScore)
  const [audioSettings, setAudioSettings] = useState(readAudioSettings)
  const [audio] = useState(() => createGameAudio(readAudioSettings()))

  useEffect(() => {
    audio.applySettings(audioSettings)
    writeAudioSettings(audioSettings)
  }, [audio, audioSettings])

  const dispatch = (intent: ShellIntent) => {
    const result = reduceShell(shellRef.current, intent)
    shellRef.current = result.state
    setShell(result.state)

    if (result.effect === 'start' || result.effect === 'remount') {
      audio.unsilence()
      setGame(null)
      setRound((value) => value + 1)
    } else if (result.effect === 'pause') {
      setPauseRequest((value) => value + 1)
    } else if (result.effect === 'resume') {
      setResumeRequest((value) => value + 1)
    }

    if (intent.type === 'abandon') {
      audio.unsilence()
      setGame(null)
    }
  }
  const dispatchRef = useRef(dispatch)
  useEffect(() => {
    dispatchRef.current = dispatch
  })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      event.preventDefault()
      dispatchRef.current({ type: 'escape', phase: gameRef.current?.phase })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleGameChange = (nextGame: GameState) => {
    gameRef.current = nextGame
    setGame(nextGame)
    setHighScore((currentHighScore) => {
      if (nextGame.score <= currentHighScore) return currentHighScore
      localStorage.setItem('gapfall:high-score', String(nextGame.score))
      return nextGame.score
    })
  }

  const inRound = shell.mode === 'round'
  const showPause =
    inRound && game?.phase === 'paused' && shell.overlay !== 'settings'
  const showGameOver =
    inRound && game?.phase === 'game-over' && shell.overlay === 'none'

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="Gapfall">
        {inRound ? (
          <>
            <header className="game-hud">
              <div>
                <p className="eyebrow">Gapfall</p>
                <h1>
                  Score <span>{game?.score ?? 0}</span>
                </h1>
              </div>
            </header>
            <GameCanvas
              key={round}
              audio={audio}
              onGameChange={handleGameChange}
              pauseRequest={pauseRequest}
              resumeRequest={resumeRequest}
            />
          </>
        ) : null}

        {shell.mode === 'main-menu' && shell.overlay === 'none' ? (
          <div
            className="game-overlay menu-overlay"
            role="dialog"
            aria-label="Menu principal"
          >
            <p className="eyebrow">GAPFALL</p>
            <strong className="menu-title">Gapfall</strong>
            <span>recorde: {highScore}</span>
            <div className="menu-actions">
              <button type="button" onClick={() => dispatch({ type: 'play' })}>
                Jogar
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'open-settings' })}
              >
                Configurações
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'open-instructions' })}
              >
                Instruções
              </button>
            </div>
            <a
              className="menu-credit"
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
            >
              made by Shinji
            </a>
          </div>
        ) : null}

        {shell.overlay === 'instructions' ? (
          <div
            className="game-overlay menu-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Instruções"
          >
            <p className="eyebrow">INSTRUÇÕES</p>
            <ul className="instructions-list">
              <li>
                Linhas de quatro colunas caem sem parar. Cada uma tem um espaço
                vazio.
              </li>
              <li>
                Lance TNT para cima com <kbd>A</kbd> <kbd>S</kbd> <kbd>K</kbd>{' '}
                <kbd>L</kbd> ou tocando na coluna.
              </li>
              <li>
                Preencha a Frontline (a linha mais baixa em aberto) para remover.
                Cascades dão mais pontos.
              </li>
              <li>
                Se qualquer bloco tocar a Death Line, a rodada acaba.
              </li>
              <li>
                Esc ou sair da aba pausa. O recorde fica salvo neste navegador.
              </li>
            </ul>
            <button
              type="button"
              onClick={() => dispatch({ type: 'close-overlay' })}
            >
              Voltar
            </button>
          </div>
        ) : null}

        {shell.overlay === 'settings' ? (
          <SettingsOverlay
            settings={audioSettings}
            onChange={setAudioSettings}
            onClose={() => dispatch({ type: 'close-overlay' })}
          />
        ) : null}

        {showGameOver ? (
          <div
            className="game-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Fim de jogo"
          >
            <p className="eyebrow">FIM DE JOGO</p>
            <strong>{game?.score ?? 0}</strong>
            <span>pontos</span>
            <span>recorde: {highScore}</span>
            <div className="menu-actions">
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: 'play-again',
                    phase: game?.phase,
                  })
                }
              >
                Jogar novamente
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'abandon' })}
              >
                Menu principal
              </button>
            </div>
          </div>
        ) : null}

        {showPause ? (
          <div className="game-overlay" role="status" aria-live="polite">
            <p className="eyebrow">PAUSADO</p>
            <span>A partida foi pausada.</span>
            <div className="menu-actions">
              <button type="button" onClick={() => dispatch({ type: 'resume' })}>
                Continuar
              </button>
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: 'open-settings',
                    phase: game?.phase,
                  })
                }
              >
                Configurações
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'abandon' })}
              >
                Menu principal
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}

function SettingsOverlay({
  settings,
  onChange,
  onClose,
}: {
  settings: AudioSettings
  onChange: (settings: AudioSettings) => void
  onClose: () => void
}) {
  return (
    <div
      className="game-overlay menu-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Configurações"
    >
      <p className="eyebrow">CONFIGURAÇÕES</p>
      <label className="settings-row">
        <span>Mudo</span>
        <input
          type="checkbox"
          checked={settings.muted}
          onChange={(event) =>
            onChange({ ...settings, muted: event.target.checked })
          }
        />
      </label>
      <label className="settings-row">
        <span>Volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.volume}
          disabled={settings.muted}
          onChange={(event) =>
            onChange({
              ...settings,
              volume: Number(event.target.value),
            })
          }
        />
      </label>
      <button type="button" onClick={onClose}>
        Voltar
      </button>
    </div>
  )
}

function readHighScore(): number {
  const stored = localStorage.getItem('gapfall:high-score')
  const value = Number(stored)
  return Number.isFinite(value) && value >= 0 ? value : 0
}
