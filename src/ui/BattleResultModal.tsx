import { For, Show, createSignal, createMemo } from "solid-js";
import type { MasterCard } from "@src/types";
import type { GameEngine } from "@src/engine/game-engine";
import { CardView, setInspectedCard } from "./CardView";

/** Everything granted for a victory, claimed exactly once per match. */
export interface MatchRewards {
  /** Experience points obtained (more gain factors will join later). */
  exp: number;
  /** Name of the opened prize pack (null = opponent awards none). */
  packName: string | null;
  /** The pack's three draws. */
  cards: MasterCard[];
  /** Direct bonus drops (e.g. Apokarimon's own card). */
  bonusCards: MasterCard[];
}

/**
 * Post-match flow. Defeat: scoreboard with "Back To Lobby" only — no
 * rematch. Victory: scoreboard → EXP dialog (kept separate; future gain
 * factors will extend it) → prize pack dialog → back to the lobby.
 */
export function BattleResultModal(props: {
  g: GameEngine;
  playerPortrait?: string;
  cpuPortrait?: string;
  /** Claims (and persists) the rewards; must be idempotent per match. */
  claimRewards: () => MatchRewards;
  onBackToLobby: () => void;
}) {
  const [step, setStep] = createSignal<"result" | "exp" | "prize">("result");
  const won = () => props.g.winner === "player";
  const rewards = createMemo(() => props.claimRewards());
  const hasPrize = () => rewards().packName !== null || rewards().bonusCards.length > 0;

  return (
    <div class="modal-overlay">
      {/* Step 1: the scoreboard. */}
      <Show when={step() === "result"}>
        <div class="modal">
          <h2>{won() ? "Victory!" : "Defeat…"}</h2>
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
            <Show when={won()} fallback={<button class="primary" onClick={props.onBackToLobby}>Back To Lobby</button>}>
              <button class="primary" onClick={() => setStep("exp")}>
                Next ▶
              </button>
            </Show>
          </div>
        </div>
      </Show>

      {/* Step 2 (win): experience obtained — its own dialog, more gain
          factors will be itemized here later. */}
      <Show when={step() === "exp"}>
        <div class="modal">
          <h2>Experience</h2>
          <div class="reward-exp">
            ⭐ +{rewards().exp} <span class="reward-exp-label">EXP</span>
          </div>
          <div class="setup-actions">
            <button class="primary" onClick={() => (hasPrize() ? setStep("prize") : props.onBackToLobby())}>
              {hasPrize() ? "Next ▶" : "Back To Lobby"}
            </button>
          </div>
        </div>
      </Show>

      {/* Step 3 (win): the prize pack. */}
      <Show when={step() === "prize"}>
        <div class="modal">
          <h2>Prize</h2>
          <Show when={rewards().packName}>
            <div class="tag">📦 {rewards().packName}</div>
            <div class="reward-cards">
              <For each={rewards().cards}>
                {(card) => (
                  <div onMouseEnter={() => setInspectedCard(card)}>
                    <CardView card={card} />
                  </div>
                )}
              </For>
            </div>
          </Show>
          <Show when={rewards().bonusCards.length > 0}>
            <div class="tag">✨ Bonus card{rewards().bonusCards.length > 1 ? "s" : ""}</div>
            <div class="reward-cards">
              <For each={rewards().bonusCards}>
                {(card) => (
                  <div onMouseEnter={() => setInspectedCard(card)}>
                    <CardView card={card} />
                  </div>
                )}
              </For>
            </div>
          </Show>
          <div class="tag">Added to your card bag.</div>
          <div class="setup-actions">
            <button class="primary" onClick={props.onBackToLobby}>
              Back To Lobby
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}
