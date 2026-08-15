import { useState } from "react";
import type { GameState } from "../game/game-core";
import { createGame } from "../game/game-core";
import { GameCanvas } from "./GameCanvas";

export default function App() {
  const [round, setRound] = useState(0);
  const [resumeRequest, setResumeRequest] = useState(0);
  const [game, setGame] = useState<GameState>(() => createGame());
  const [highScore, setHighScore] = useState(readHighScore);

  const handleGameChange = (nextGame: GameState) => {
    setGame(nextGame);
    setHighScore((currentHighScore) => {
      if (nextGame.score <= currentHighScore) return currentHighScore;
      localStorage.setItem("gapfall:high-score", String(nextGame.score));
      return nextGame.score;
    });
  };

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="Gapfall">
        <header className="game-hud">
          <div>
            <p className="eyebrow">Gapfall</p>
            <h1>
              Score <span>{game.score}</span>
            </h1>
          </div>
          <div className="key-hint" aria-label="Teclas: A, S, K e L">
            A&nbsp;S&nbsp;K&nbsp;L
          </div>
        </header>
        <GameCanvas
          key={round}
          onGameChange={handleGameChange}
          resumeRequest={resumeRequest}
        />
        {game.phase === "game-over" && (
          <div
            className="game-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Fim de jogo"
          >
            <p className="eyebrow">FIM DE JOGO</p>
            <strong>{game.score}</strong>
            <span>pontos</span>
            <span>recorde: {highScore}</span>
            <button
              type="button"
              onClick={() => setRound((value) => value + 1)}
            >
              Jogar novamente
            </button>
          </div>
        )}
        {game.phase === "paused" && (
          <div className="game-overlay" role="status" aria-live="polite">
            <p className="eyebrow">PAUSADO</p>
            <span>A partida foi pausada.</span>
            <button
              type="button"
              onClick={() => setResumeRequest((value) => value + 1)}
            >
              Continuar
            </button>
          </div>
        )}
      </section>
      <p className="instructions">
        Toque em uma coluna ou pressione A, S, K ou L para lançar.
      </p>
    </main>
  );
}

function readHighScore(): number {
  const stored = localStorage.getItem("gapfall:high-score");
  const value = Number(stored);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
