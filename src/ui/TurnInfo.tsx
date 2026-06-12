import type { GameEngine } from "@src/engine/game-engine";

/** Right-panel turn & phase readout. */
export function TurnInfo(props: { g: GameEngine }) {
  const phaseLabel = () =>
    ({
      setup: "Setting up…",
      deploy: "Deploy Phase",
      digivolve: "Digivolve Phase",
      "battle-select": "Battle — choose attack & support",
      "battle-resolve": "Battle!",
      "game-over": "Match over",
    })[props.g.phase];
  const turnLabel = () =>
    props.g.phase === "game-over"
      ? `${props.g.players[props.g.winner ?? "player"].name} wins`
      : props.g.turn === "player"
        ? "Your turn"
        : `${props.g.players.cpu.name}'s turn`;
  return (
    <div class="area">
      <h2>Turn {props.g.turnCount}</h2>
      <div class="turn-info-name">{turnLabel()}</div>
      <div class="tag">{phaseLabel()}</div>
    </div>
  );
}
