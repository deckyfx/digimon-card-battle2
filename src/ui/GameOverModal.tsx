import type { GameEngine } from "@src/engine/game-engine";

/** Match-settled dialog with the final scoreboard. */
export function GameOverModal(props: {
  g: GameEngine;
  playerPortrait?: string;
  cpuPortrait?: string;
  onPlayAgain: () => void;
  onChangeSetup: () => void;
}) {
  return (
    <div class="modal-overlay">
      <div class="modal">
        <h2>Match Settled</h2>
        <div class="scoreboard">
          <div class="score-side" classList={{ winner: props.g.winner === "player" }}>
            <img class="portrait" src={props.playerPortrait} alt={props.g.players.player.name} />
            <div class="score-name">{props.g.players.player.name}</div>
            <div class="score-points">{props.g.players.player.score}</div>
          </div>
          <div class="score-vs">—</div>
          <div class="score-side" classList={{ winner: props.g.winner === "cpu" }}>
            <img class="portrait" src={props.cpuPortrait} alt={props.g.players.cpu.name} />
            <div class="score-name">{props.g.players.cpu.name}</div>
            <div class="score-points">{props.g.players.cpu.score}</div>
          </div>
        </div>
        <div class="modal-verdict">🏆 {props.g.players[props.g.winner ?? "player"].name} Wins!</div>
        <div class="setup-actions">
          <button class="primary" onClick={props.onPlayAgain}>
            ▶ Play Again
          </button>
          <button onClick={props.onChangeSetup}>Change Setup</button>
        </div>
      </div>
    </div>
  );
}
