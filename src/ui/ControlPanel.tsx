import { Show } from "solid-js";
import type { GameEngine } from "@src/engine/game-engine";

/** Left-column control panel: phase hints + the few non-prompt actions. */
export function ControlPanel(props: { g: GameEngine }) {
  const isMyTurn = () => props.g.turn === "player";
  const isMyDeploy = () => props.g.phase === "deploy" && isMyTurn();
  const isMyDigivolve = () => props.g.phase === "digivolve" && isMyTurn();
  const isBattleSelect = () => props.g.phase === "battle-select";

  return (
    <div class="area controls">
      <h2>Controls</h2>

      {/* Deploy/redraw/finalize/armor decisions live in the floating
          prompt dialogs — the panel only hints during the deploy phase. */}
      <Show when={isMyDeploy()}>
        <div class="tag">Deploy a Digimon from your hand.</div>
      </Show>

      <Show when={isMyDigivolve()}>
        <button class="primary" onClick={() => props.g.endPrep()}>
          {props.g.opponentOf("player").active ? "To Battle" : "Pass Turn"}
        </button>
        <Show when={props.g.canCancelStockDp()}>
          <button onClick={() => props.g.cancelStockDp()}>Undo DP Stock</button>
        </Show>
      </Show>

      <Show when={isBattleSelect()}>
        <div class="tag">⚔ Battle — answer the prompt.</div>
      </Show>

      <Show when={props.g.phase === "battle-resolve"}>
        <div class="tag">⚔ Battle resolving…</div>
      </Show>

      <Show when={!isMyDeploy() && !isMyDigivolve() && !isBattleSelect() && props.g.phase !== "battle-resolve"}>
        <div class="tag">Waiting…</div>
      </Show>
    </div>
  );
}
