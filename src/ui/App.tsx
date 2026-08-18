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
import { GameCanvas } from './GameCanvas'
import { openVersusQueue, type VersusSession } from '../match/local-bus'
import type { MatchReason, RefereeMessage } from '../match/referee'
import {
  applyAudioGate,
  applyVersusLines,
  createRound,
  freezeRound,
  hudOf,
  pauseRound,
  resumeRound,
  type RoundHud,
  type RoundResult,
  type RoundSession,
} from './round'

const REPO_URL = 'https://github.com/fernandowashimi/gapfall'

type VersusOutcome = { won: boolean; reason: MatchReason }

export default function App() {
  const [shell, setShell] = useState<ShellState>(createShellState)
  const shellRef = useRef(shell)
  useEffect(() => {
    shellRef.current = shell
  }, [shell])

  const sessionRef = useRef<RoundSession | null>(null)
  const versusRef = useRef<VersusSession | null>(null)
  const [hud, setHud] = useState<RoundHud | null>(null)
  const hudRef = useRef(hud)
  useEffect(() => {
    hudRef.current = hud
  }, [hud])

  const [highScore, setHighScore] = useState(readHighScore)
  const [audioSettings, setAudioSettings] = useState(readAudioSettings)
  const [audio] = useState(() => createGameAudio(readAudioSettings()))
  const [versusOutcome, setVersusOutcome] = useState<VersusOutcome | null>(null)
  const versusOutcomeRef = useRef<VersusOutcome | null>(null)
  const deathSentRef = useRef(false)

  useEffect(() => {
    audio.applySettings(audioSettings)
    writeAudioSettings(audioSettings)
  }, [audio, audioSettings])

  const applyShell = (intent: ShellIntent) => {
    const result = reduceShell(shellRef.current, intent)
    shellRef.current = result.state
    setShell(result.state)

    if (result.state.mode !== 'round') {
      audio.unsilence()
      sessionRef.current = null
      setHud(null)
      versusOutcomeRef.current = null
      setVersusOutcome(null)
    }

    if (result.effect === 'start' || result.effect === 'remount') {
      audio.unsilence()
      const kind =
        result.state.roundKind === 'versus' ? 'versus' : 'single-player'
      const session = createRound(undefined, kind)
      sessionRef.current = session
      setHud(hudOf(session))
      versusOutcomeRef.current = null
      deathSentRef.current = false
      setVersusOutcome(null)
    } else if (result.effect === 'pause') {
      applyRoundCommand(sessionRef, pauseRound, audio, setHud)
    } else if (result.effect === 'resume') {
      applyRoundCommand(sessionRef, resumeRound, audio, setHud)
    }
  }

  const beginQueue = () => {
    versusRef.current?.cancel()
    versusRef.current = openVersusQueue((message) => {
      handleVersusMessage(message)
    })
    applyShell({ type: 'versus' })
  }

  const leaveQueue = () => {
    versusRef.current?.cancel()
    versusRef.current = null
    applyShell({ type: 'abandon' })
  }

  const handleVersusMessage = (message: RefereeMessage) => {
    if (message.type === 'paired') {
      applyShell({ type: 'paired' })
      return
    }
    if (message.type === 'lines-removed') {
      const session = sessionRef.current
      if (!session) return
      sessionRef.current = applyVersusLines(session, message.n)
      return
    }
    if (message.type === 'outcome') {
      const session = sessionRef.current
      if (session) sessionRef.current = freezeRound(session)
      const self = versusRef.current?.playerId
      if (self) {
        const next = {
          won: message.winner === self,
          reason: message.reason,
        }
        versusOutcomeRef.current = next
        setVersusOutcome(next)
      }
      if (message.reason === 'forfeit') {
        applyShell({ type: 'opponent-gone' })
      }
      return
    }
    if (message.type === 'rematch-begin') {
      applyShell({ type: 'rematch', phase: 'game-over' })
      return
    }
    if (message.type === 'rematch-unavailable') {
      applyShell({ type: 'opponent-gone' })
    }
  }

  const dispatch = (intent: ShellIntent) => {
    if (intent.type === 'versus') {
      beginQueue()
      return
    }
    if (
      (intent.type === 'abandon' || intent.type === 'escape') &&
      (shellRef.current.mode === 'matchmaking' ||
        shellRef.current.roundKind === 'versus')
    ) {
      if (intent.type === 'escape' && shellRef.current.mode === 'round') {
        applyShell(intent)
        return
      }
      leaveQueue()
      if (intent.type === 'abandon' && shellRef.current.mode === 'round') {
        return
      }
      if (intent.type === 'escape' && shellRef.current.mode === 'matchmaking') {
        return
      }
    }
    if (
      intent.type === 'play-again' &&
      shellRef.current.roundKind === 'versus'
    ) {
      versusRef.current?.cancel()
      versusRef.current = openVersusQueue((message) => {
        handleVersusMessage(message)
      })
      applyShell(intent)
      return
    }
    if (intent.type === 'rematch') {
      versusRef.current?.send({ type: 'rematch' })
      return
    }
    applyShell(intent)
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
    if (shellRef.current.roundKind === 'versus') return
    setHighScore((currentHighScore) => {
      if (nextHud.score <= currentHighScore) return currentHighScore
      localStorage.setItem('gapfall:high-score', String(nextHud.score))
      return nextHud.score
    })
  }

  const handleTick = (result: RoundResult) => {
    if (shellRef.current.roundKind !== 'versus') return
    if (result.linesRemoved > 0) {
      versusRef.current?.send({ type: 'lines-removed', n: result.linesRemoved })
    }
    if (result.session.game.phase === 'game-over' && !deathSentRef.current) {
      deathSentRef.current = true
      versusRef.current?.send({ type: 'death' })
    }
  }

  const inRound = shell.mode === 'round'
  const isVersus = shell.roundKind === 'versus'
  const showPause =
    inRound &&
    !isVersus &&
    hud?.phase === 'paused' &&
    shell.overlay !== 'settings'
  const showGameOver =
    inRound &&
    shell.overlay === 'none' &&
    (isVersus ? versusOutcome !== null : hud?.phase === 'game-over')

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="Gapfall">
        {inRound ? (
          <>
            <header className="game-hud">
              <div>
                <p className="eyebrow">Gapfall</p>
                {isVersus ? (
                  <h1>Versus</h1>
                ) : (
                  <h1>
                    Score <span>{hud?.score ?? 0}</span>
                  </h1>
                )}
              </div>
              {isVersus && !versusOutcome ? (
                <button
                  type="button"
                  className="hud-abandon"
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
              pauseOnBlur={!isVersus}
              onTick={handleTick}
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
            aria-label="Matchmaking"
          >
            <p className="eyebrow">VERSUS</p>
            <span>Procurando oponente…</span>
            <button type="button" onClick={() => dispatch({ type: 'escape' })}>
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

        {showGameOver && isVersus && versusOutcome ? (
          <div
            className="game-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Fim de jogo"
          >
            <p className="eyebrow">VERSUS</p>
            <strong>{versusOutcome.won ? 'Você venceu' : 'Você perdeu'}</strong>
            {versusOutcome.won && versusOutcome.reason === 'forfeit' ? (
              <span>Oponente saiu</span>
            ) : null}
            <div className="menu-actions">
              {shell.rematchAvailable ? (
                <button
                  type="button"
                  onClick={() =>
                    dispatch({ type: 'rematch', phase: 'game-over' })
                  }
                >
                  Revanche
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: 'play-again', phase: 'game-over' })
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

        {showGameOver && !isVersus ? (
          <div
            className="game-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Fim de jogo"
          >
            <p className="eyebrow">FIM DE JOGO</p>
            <strong>{hud?.score ?? 0}</strong>
            <span>pontos</span>
            <span>recorde: {highScore}</span>
            <div className="menu-actions">
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
