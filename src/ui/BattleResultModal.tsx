import { For, Show, createSignal, createMemo, onMount } from "solid-js";
import type { MasterCard } from "@src/types";
import type { GameEngine } from "@src/engine/game-engine";
import { CardView, setInspectedCard } from "./CardView";
import { createTicker } from "./Ticker";
import { MASTER_CARDS } from "@src/data/master-cards";
import { DIGIPARTS } from "@src/data/digiparts";
import { partnerLevelFromExp, partnerExpToNextLevel, PARTNER_MAX_LEVEL } from "@src/data/partners";

/** Snapshot of one partner's EXP gain from a single match. */
export interface PartnerExpGain {
  /** Display name ("Veemon", etc.). */
  partnerName: string;
  /** Rookie card number — used to look up card art/stats. */
  cardNumber: string;
  /** EXP granted this match. */
  expGained: number;
  /** Total EXP before this match. */
  oldExp: number;
  /** Total EXP after this match (clamped to 9999). */
  newExp: number;
  /** Level before this match. */
  oldLevel: number;
  /** Level after this match. */
  newLevel: number;
  /** True if at least one level transition occurred. */
  leveledUp: boolean;
  /** Stat bonus deltas (before state, for animation start). */
  oldBonusHp: number;
  oldBonusCircle: number;
  oldBonusTriangle: number;
  oldBonusCross: number;
  /** Stat bonus deltas (after state, for animation target). */
  newBonusHp: number;
  newBonusCircle: number;
  newBonusTriangle: number;
  newBonusCross: number;
  /** DigiPart ids earned for the first time in this match (can be empty). */
  newDigiparts: number[];
}

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
  /** Partner EXP gains for partners whose Rookie was in the player's deck. */
  partnerGains: PartnerExpGain[];
}

// ---------------------------------------------------------------------------
// Per-partner animated row
// ---------------------------------------------------------------------------

/** One partner's result block: animated EXP tickers, stat bonuses, DigiParts. */
function PartnerExpRow(props: { gain: PartnerExpGain }) {
  const g = props.gain;
  const card = MASTER_CARDS.find((c) => c.number === g.cardNumber);

  // Ticker signals: start at the pre-match values so they animate to the
  // post-match values once the mount delay fires.
  const [expTarget, setExpTarget] = createSignal(g.oldExp);
  const [nextLvTarget, setNextLvTarget] = createSignal(
    g.oldLevel < PARTNER_MAX_LEVEL ? partnerExpToNextLevel(g.oldExp) : 0,
  );
  const [hpBonusTarget, setHpBonusTarget] = createSignal(g.oldBonusHp);
  const [circBonusTarget, setCircBonusTarget] = createSignal(g.oldBonusCircle);
  const [triBonusTarget, setTriBonusTarget] = createSignal(g.oldBonusTriangle);
  const [crossBonusTarget, setCrossBonusTarget] = createSignal(g.oldBonusCross);

  const displayExp = createTicker(expTarget, 1000);
  const displayNextLv = createTicker(nextLvTarget, 1000);
  const displayHpBonus = createTicker(hpBonusTarget, 1200);
  const displayCircBonus = createTicker(circBonusTarget, 1200);
  const displayTriBonus = createTicker(triBonusTarget, 1200);
  const displayCrossBonus = createTicker(crossBonusTarget, 1200);

  // Small delay so the initial render shows old values before animating.
  onMount(() => {
    setTimeout(() => {
      setExpTarget(g.newExp);
      setNextLvTarget(g.newLevel < PARTNER_MAX_LEVEL ? partnerExpToNextLevel(g.newExp) : 0);
      setHpBonusTarget(g.newBonusHp);
      setCircBonusTarget(g.newBonusCircle);
      setTriBonusTarget(g.newBonusTriangle);
      setCrossBonusTarget(g.newBonusCross);
    }, 400);
  });

  return (
    <div class="partner-exp-row">
      {/* Partner Rookie card (left column, spans the height of the stat block). */}
      <div class="partner-exp-card" onMouseEnter={() => card && setInspectedCard(card)}>
        {card ? <CardView card={card} /> : <div class="card">{g.partnerName}</div>}
      </div>

      {/* Right column: identity, stats, EXP progress, DigiPart rewards. */}
      <div class="partner-exp-stats">
        <div class="partner-exp-header">
          <span class="partner-exp-name">{g.partnerName}</span>
          <span class="partner-exp-level">Lv {g.newLevel}</span>
          <Show when={g.leveledUp}>
            <span class="partner-exp-levelup">✦ LEVEL UP!</span>
          </Show>
        </div>

        <div class="partner-exp-gained">+{g.expGained} EXP</div>

        {/* Base card stats + animated bonus column. */}
        <div class="partner-exp-statgrid">
          <span>HP</span>
          <span>
            {card?.hp ?? "—"}
            <span class="partner-bonus"> +{displayHpBonus()}</span>
          </span>
          <span>○</span>
          <span>
            {card?.c_pow ?? "—"}
            <span class="partner-bonus"> +{displayCircBonus()}</span>
          </span>
          <span>△</span>
          <span>
            {card?.t_pow ?? "—"}
            <span class="partner-bonus"> +{displayTriBonus()}</span>
          </span>
          <span>✕</span>
          <span>
            {card?.x_pow ?? "—"}
            <span class="partner-bonus"> +{displayCrossBonus()}</span>
          </span>
        </div>

        {/* EXP count-up. */}
        <div class="partner-exp-exprow">
          <span class="partner-exp-label">EXP</span>
          <span class="partner-exp-num">{displayExp()}</span>
        </div>

        {/* Next-level countdown (hidden at max level). */}
        <Show when={g.newLevel < PARTNER_MAX_LEVEL}>
          <div class="partner-exp-nextrow">
            <span class="partner-exp-label">Next Lv</span>
            <span class="partner-exp-num">{displayNextLv()}</span>
          </div>
        </Show>

        {/* Newly earned DigiParts. */}
        <Show when={g.newDigiparts.length > 0}>
          <div class="partner-exp-digiparts">
            <span class="partner-exp-dp-label">DigiParts obtained:</span>
            <div class="partner-exp-dp-list">
              <For each={g.newDigiparts}>
                {(id) => (
                  <span class="partner-exp-digipart">{DIGIPARTS[id]?.name ?? `Part #${id}`}</span>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

/**
 * Post-match flow. Defeat: scoreboard with "Back To Lobby" only — no
 * rematch. Victory: scoreboard → EXP dialog → partner EXP dialog (when
 * applicable) → prize pack dialog → back to the lobby.
 */
export function BattleResultModal(props: {
  g: GameEngine;
  playerPortrait?: string;
  cpuPortrait?: string;
  /** Claims (and persists) the rewards; must be idempotent per match. */
  claimRewards: () => MatchRewards;
  onBackToLobby: () => void;
}) {
  const [step, setStep] = createSignal<"result" | "exp" | "partner-exp" | "prize">("result");
  const won = () => props.g.winner === "player";
  const rewards = createMemo(() => props.claimRewards());
  const hasPrize = () => rewards().packName !== null || rewards().bonusCards.length > 0;
  const hasPartnerGains = () => rewards().partnerGains.length > 0;

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
            <button
              class="primary"
              onClick={() => {
                if (hasPartnerGains()) setStep("partner-exp");
                else if (hasPrize()) setStep("prize");
                else props.onBackToLobby();
              }}
            >
              {hasPartnerGains() || hasPrize() ? "Next ▶" : "Back To Lobby"}
            </button>
          </div>
        </div>
      </Show>

      {/* Step 3 (win, when applicable): partner EXP gains. */}
      <Show when={step() === "partner-exp"}>
        <div class="modal modal-partner-exp">
          <h2>Partner Growth</h2>
          <div class="partner-exp-list">
            <For each={rewards().partnerGains}>
              {(gain) => <PartnerExpRow gain={gain} />}
            </For>
          </div>
          <div class="setup-actions">
            <button class="primary" onClick={() => (hasPrize() ? setStep("prize") : props.onBackToLobby())}>
              {hasPrize() ? "Next ▶" : "Back To Lobby"}
            </button>
          </div>
        </div>
      </Show>

      {/* Step 4 (win): the prize pack. */}
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
