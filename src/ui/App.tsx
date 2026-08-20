import { useEffect, useRef, useState } from 'react'
import {
  createShellState,
  reduceShell,
  type ShellIntent,
  type ShellState,
} from './app-shell'
import { requestGoogleCredential } from './google-sign-in'
import {
  clearPlayerSession,
  profileFromIdToken,
  readPlayerSession,
  writePlayerSession,
} from './player-session'
import { createGameAudio } from './audio'
import {
  readAudioSettings,
  writeAudioSettings,
  type AudioSettings,
} from './audio-settings'
import gapfallLogoUrl from '../assets/branding/gapfall-logo.png'
import { VERSUS_FALL_SPEED } from '../game/game-core'
import {
  decodeIdentities,
  decodeLinesRemoved,
  decodeOutcome,
  decodeRematchBegin,
  decodeRematchUnavailable,
  encodeDeath,
  encodeIdentity,
  encodeLinesRemoved,
  encodeRematch,
  type MatchSideIdentity,
} from '../match/messages'
import { GameCanvas } from './GameCanvas'
import {
  applyAudioGate,
  applySentGeneratedLines,
  createRound,
  hudOf,
  pauseRound,
  resumeRound,
  stopRound,
  type RoundHud,
  type RoundResult,
  type RoundSession,
} from './round'
import { connectMatch, connectQueue } from './versus-socket'
import type { PartySocket } from 'partysocket'

const REPO_URL = 'https://github.com/fernandowashimi/gapfall'

export default function App() {
  const [shell, setShell] = useState<ShellState>(() =>
    createShellState(readPlayerSession()),
  )
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
  const matchSocketRef = useRef<PartySocket | null>(null)
  const [matchIdentities, setMatchIdentities] = useState<
    readonly [MatchSideIdentity, MatchSideIdentity] | null
  >(null)
  const frozenTokenRef = useRef<string | null>(null)

  useEffect(() => {
    audio.applySettings(audioSettings)
    writeAudioSettings(audioSettings)
  }, [audio, audioSettings])

  const dispatch = (intent: ShellIntent) => {
    const previousPlayer = shellRef.current.player
    const result = reduceShell(shellRef.current, intent)
    shellRef.current = result.state
    setShell(result.state)

    if (result.state.player && result.state.player !== previousPlayer) {
      writePlayerSession(result.state.player)
    } else if (previousPlayer && !result.state.player) {
      clearPlayerSession()
    }

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
    } else if (result.effect === 'stop') {
      applyRoundCommand(sessionRef, stopRound, audio, setHud)
    }

    if (
      intent.type === 'abandon' ||
      (intent.type === 'play-again' && result.state.mode === 'matchmaking')
    ) {
      audio.unsilence()
      sessionRef.current = null
      setHud(null)
      setMatchIdentities(null)
      matchSocketRef.current?.close()
      matchSocketRef.current = null
    }
  }
  const dispatchRef = useRef(dispatch)
  useEffect(() => {
    dispatchRef.current = dispatch
  })

  const applySentGeneratedLinesRef = useRef((n: number) => {
    const session = sessionRef.current
    if (!session) return
    sessionRef.current = applySentGeneratedLines(session, n)
  })

  useEffect(() => {
    if (shell.mode !== 'matchmaking') return

    frozenTokenRef.current = shell.frozenPlayer?.idToken ?? null
    let match: PartySocket | null = null
    const queue = connectQueue((matchId, playerId) => {
      match?.close()
      match = connectMatch(matchId, playerId)
      match.addEventListener('message', (event) => {
        const raw = String(event.data)
        const identities = decodeIdentities(raw)
        if (identities) {
          setMatchIdentities(identities.players)
          return
        }
        const lines = decodeLinesRemoved(raw)
        if (lines) {
          applySentGeneratedLinesRef.current(lines.n)
          return
        }
        const outcome = decodeOutcome(raw)
        if (outcome) {
          const selfId = match?.id
          if (!selfId) return
          dispatchRef.current({
            type: 'outcome',
            result: outcome.winner === selfId ? 'win' : 'loss',
            reason: outcome.reason,
          })
          return
        }
        if (decodeRematchBegin(raw)) {
          dispatchRef.current({ type: 'rematch-begin' })
          return
        }
        if (decodeRematchUnavailable(raw)) {
          dispatchRef.current({ type: 'rematch-unavailable' })
        }
      })
      match.addEventListener(
        'open',
        () => {
          matchSocketRef.current?.close()
          matchSocketRef.current = match
          match?.send(encodeIdentity(frozenTokenRef.current))
          dispatchRef.current({ type: 'paired' })
        },
        { once: true },
      )
    })
    return () => {
      queue.close()
      if (match && match !== matchSocketRef.current) match.close()
    }
  }, [shell.mode])

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
    if (
      shellRef.current.roundKind === 'versus' &&
      !shellRef.current.versusOutcome &&
      nextHud.phase === 'game-over'
    ) {
      matchSocketRef.current?.send(encodeDeath())
    }
    setHighScore((currentHighScore) => {
      if (shellRef.current.roundKind === 'versus') return currentHighScore
      if (nextHud.score <= currentHighScore) return currentHighScore
      localStorage.setItem('gapfall:high-score', String(nextHud.score))
      return nextHud.score
    })
  }

  const handleEntrar = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID is not configured')
      return
    }
    try {
      const credential = await requestGoogleCredential(clientId)
      const profile = profileFromIdToken(credential)
      if (!profile) return
      dispatch({ type: 'sign-in', profile })
    } catch (error) {
      console.warn('Google sign-in failed', error)
    }
  }

  const inRound = shell.mode === 'round'
  const versusRound = inRound && shell.roundKind === 'versus'
  const versusPreparing =
    versusRound && hud?.phase === 'preparing' && !shell.versusOutcome
  const showPause =
    inRound &&
    !versusRound &&
    hud?.phase === 'paused' &&
    shell.overlay !== 'settings'
  const showGameOver =
    inRound &&
    shell.overlay === 'none' &&
    (versusRound ? shell.versusOutcome !== null : hud?.phase === 'game-over')

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="Gapfall">
        {inRound ? (
          <>
            <header className="game-hud">
              {versusRound ? (
                <VersusMatchup sides={matchIdentities} />
              ) : (
                <div>
                  <p className="eyebrow">Gapfall</p>
                  <h1>
                    Score <span>{hud?.score ?? 0}</span>
                  </h1>
                </div>
              )}
              {versusRound &&
              !shell.versusOutcome &&
              hud?.phase !== 'game-over' ? (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'abandon' })}
                >
                  Desistir
                </button>
              ) : null}
            </header>
            <GameCanvas
              audio={audio}
              sessionRef={sessionRef}
              onHudChange={handleHudChange}
              onLinesRemoved={
                versusRound
                  ? (n) => matchSocketRef.current?.send(encodeLinesRemoved(n))
                  : undefined
              }
              pauseWhenHidden={!versusRound}
              showPreparationCountdown={!versusRound}
            />
            {versusPreparing ? (
              <div
                className="versus-preparation"
                role="status"
                aria-live="polite"
                aria-label="Preparação"
              >
                <VersusMatchup sides={matchIdentities} size="large" />
                <strong className="versus-preparation-count">
                  {Math.ceil(hud.preparationRemaining)}
                </strong>
              </div>
            ) : null}
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
            <div className="menu-recorde-slot">
              <span>recorde: {highScore}</span>
              {shell.player ? (
                <button
                  type="button"
                  className="menu-player"
                  onClick={() => dispatch({ type: 'open-sign-out' })}
                >
                  <img src={shell.player.picture} alt="" />
                  <span>{shell.player.name}</span>
                </button>
              ) : (
                <button type="button" onClick={() => void handleEntrar()}>
                  Entrar
                </button>
              )}
            </div>
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

        {shell.overlay === 'sign-out-confirm' ? (
          <div
            className="game-overlay menu-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Sair da conta"
          >
            <p className="eyebrow">SAIR</p>
            <span>Sair da conta Google?</span>
            <div className="menu-actions">
              <button
                type="button"
                onClick={() => dispatch({ type: 'confirm-sign-out' })}
              >
                Sair
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'cancel-sign-out' })}
              >
                Cancelar
              </button>
            </div>
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
            {versusRound && shell.versusOutcome ? (
              <>
                <strong>
                  {shell.versusOutcome.result === 'win'
                    ? 'Você venceu'
                    : 'Você perdeu'}
                </strong>
                {shell.versusOutcome.result === 'win' &&
                shell.versusOutcome.reason === 'forfeit' ? (
                  <span>O oponente saiu</span>
                ) : null}
              </>
            ) : (
              <>
                <strong>{hud?.score ?? 0}</strong>
                <span>pontos</span>
                <span>recorde: {highScore}</span>
              </>
            )}
            <div className="menu-actions">
              {versusRound && shell.versusOutcome?.rematchAvailable ? (
                <button
                  type="button"
                  onClick={() => matchSocketRef.current?.send(encodeRematch())}
                >
                  Revanche
                </button>
              ) : null}
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

function VersusMatchup({
  sides,
  size = 'compact',
}: {
  sides: readonly [MatchSideIdentity, MatchSideIdentity] | null
  size?: 'compact' | 'large'
}) {
  return (
    <div
      className={
        size === 'large'
          ? 'versus-identities versus-preparation-matchup'
          : 'versus-identities'
      }
      aria-label="Versus"
    >
      <VersusIdentitySide side={sides?.[0] ?? null} size={size} />
      <span className="versus-identities-vs" aria-hidden="true">
        vs
      </span>
      <VersusIdentitySide side={sides?.[1] ?? null} size={size} />
    </div>
  )
}

function VersusIdentitySide({
  side,
  size = 'compact',
}: {
  side: MatchSideIdentity | null
  size?: 'compact' | 'large'
}) {
  const anonymous = !side || side.name === null || side.picture === null
  const label = anonymous ? 'Oponente' : side.name

  return (
    <div
      className={
        size === 'large'
          ? 'versus-identity versus-identity-large'
          : 'versus-identity'
      }
    >
      {anonymous ? (
        <span className="versus-identity-placeholder" aria-hidden="true" />
      ) : (
        <img src={side.picture!} alt="" />
      )}
      <span>{label}</span>
    </div>
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
