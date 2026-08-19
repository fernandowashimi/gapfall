import { useEffect, useRef, useState } from 'react'
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
import gapfallLogoUrl from '../assets/branding/gapfall-logo.png'
import { VERSUS_FALL_SPEED } from '../game/game-core'
import { GameCanvas } from './GameCanvas'
import {
  applyAudioGate,
  createRound,
  hudOf,
  pauseRound,
  resumeRound,
  type RoundHud,
  type RoundResult,
  type RoundSession,
} from './round'

const REPO_URL = 'https://github.com/fernandowashimi/gapfall'

export default function App() {
  const [shell, setShell] = useState<ShellState>(createShellState)
  const shellRef = useRef(shell)
  useEffect(() => {
    shellRef.current = shell
  }, [shell])

  const sessionRef = useRef<RoundSession | null>(null)
  const [hud, setHud] = useState<RoundHud | null>(null)
  const hudRef = useRef(hud)
  useEffect(() => {
    hudRef.current = hud
  }, [hud])

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
      const session = createRound(
        undefined,
        result.state.roundKind === 'versus' ? VERSUS_FALL_SPEED : undefined,
      )
      sessionRef.current = session
      setHud(hudOf(session))
    } else if (result.effect === 'pause') {
      applyRoundCommand(sessionRef, pauseRound, audio, setHud)
    } else if (result.effect === 'resume') {
      applyRoundCommand(sessionRef, resumeRound, audio, setHud)
    }

    if (intent.type === 'abandon') {
      audio.unsilence()
      sessionRef.current = null
      setHud(null)
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
      dispatchRef.current({
        type: 'escape',
        phase: sessionRef.current?.game.phase ?? hudRef.current?.phase,
      })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleHudChange = (nextHud: RoundHud) => {
    hudRef.current = nextHud
    setHud(nextHud)
    setHighScore((currentHighScore) => {
      if (shellRef.current.roundKind === 'versus') return currentHighScore
      if (nextHud.score <= currentHighScore) return currentHighScore
      localStorage.setItem('gapfall:high-score', String(nextHud.score))
      return nextHud.score
    })
  }

  const inRound = shell.mode === 'round'
  const versusRound = inRound && shell.roundKind === 'versus'
  const showPause =
    inRound &&
    !versusRound &&
    hud?.phase === 'paused' &&
    shell.overlay !== 'settings'
  const showGameOver =
    inRound && hud?.phase === 'game-over' && shell.overlay === 'none'

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="Gapfall">
        {inRound ? (
          <>
            <header className="game-hud">
              <div>
                <p className="eyebrow">Gapfall</p>
                {versusRound ? null : (
                  <h1>
                    Score <span>{hud?.score ?? 0}</span>
                  </h1>
                )}
              </div>
              {versusRound && hud?.phase !== 'game-over' ? (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'abandon' })}
                >
                  Menu principal
                </button>
              ) : null}
            </header>
            <GameCanvas
              audio={audio}
              sessionRef={sessionRef}
              onHudChange={handleHudChange}
              pauseWhenHidden={!versusRound}
            />
          </>
        ) : null}

        {shell.mode === 'main-menu' && shell.overlay === 'none' ? (
          <div
            className="game-overlay menu-overlay"
            role="dialog"
            aria-label="Menu principal"
          >
            <img
              className="menu-logo"
              src={gapfallLogoUrl}
              alt="Gapfall"
              width={1370}
              height={359}
            />
            <span>recorde: {highScore}</span>
            <div className="menu-actions">
              <button type="button" onClick={() => dispatch({ type: 'play' })}>
                Um jogador
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'versus' })}
              >
                Versus
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
              credits
            </a>
          </div>
        ) : null}

        {shell.mode === 'matchmaking' ? (
          <div
            className="game-overlay menu-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Procurando oponente"
          >
            <span>Procurando oponente…</span>
            <button type="button" onClick={() => dispatch({ type: 'cancel' })}>
              Voltar
            </button>
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
                Preencha a Frontline (a linha mais baixa em aberto) para
                remover. Cascades dão mais pontos.
              </li>
              <li>
                Linhas de minério reforçado exigem dois tiros na Frontline:
                primeiro racham, depois remova com TNT na coluna do bloco
                colocado.
              </li>
              <li>Se qualquer bloco tocar a Death Line, a rodada acaba.</li>
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
            {versusRound ? null : (
              <>
                <strong>{hud?.score ?? 0}</strong>
                <span>pontos</span>
                <span>recorde: {highScore}</span>
              </>
            )}
            <div className="menu-actions">
              {versusRound ? null : (
                <button
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'play-again',
                      phase: hud?.phase,
                    })
                  }
                >
                  Jogar novamente
                </button>
              )}
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
              <button
                type="button"
                onClick={() => dispatch({ type: 'resume' })}
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: 'open-settings',
                    phase: hud?.phase,
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

function applyRoundCommand(
  sessionRef: { current: RoundSession | null },
  command: (session: RoundSession) => RoundResult,
  audio: { silence(): void; unsilence(): void },
  setHud: (hud: RoundHud) => void,
) {
  const session = sessionRef.current
  if (!session) return
  const result = command(session)
  sessionRef.current = result.session
  applyAudioGate(result.audioGate, audio)
  setHud(hudOf(result.session))
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
