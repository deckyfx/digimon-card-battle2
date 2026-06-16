import { For, Show, createSignal, createMemo, onMount, Index } from "solid-js";
import { CardType, type MasterCard } from "@src/types";
import type { GameEngine } from "@src/engine/game-engine";
import type { ExpBonusLine } from "@src/engine/battle-stats";
import { setInspectedCard } from "./CardView";
import { DigiCardFront, EffectText } from "./DigiCard";
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
  /** Total EXP granted (sum of expBreakdown). */
  exp: number;
  /** Itemised breakdown: Base EXP first, then each triggered challenge bonus. */
  expBreakdown: ExpBonusLine[];
  /** Name of the opened prize pack (null = opponent awards none). */
  packName: string | null;
  /** The pack's three draws. */
  cards: MasterCard[];
  /** Direct bonus drops (e.g. Apokarimon's own card). */
  bonusCards: MasterCard[];
  /** Seal status per pack card (aligned with `cards`). */
  cardStatus: PrizeStatus[];
  /** Seal status per bonus card (aligned with `bonusCards`). */
  bonusCardStatus: PrizeStatus[];
  /** Partner EXP gains for partners whose Rookie was in the player's deck. */
  partnerGains: PartnerExpGain[];
}

/** Collection state of a freshly obtained prize card. */
export type PrizeStatus = "new" | "full" | "obtained";

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
  // Reveal the level-up flourish only after the EXP/next-level tickers settle.
  const [revealed, setRevealed] = createSignal(false);

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
    // Tickers run ~1000ms from the 400ms start; reveal the level-up after.
    if (g.leveledUp) setTimeout(() => setRevealed(true), 1500);
  });

  return (
    <div class="partner-exp-row">
      {/* Partner Rookie card (left column, spans the height of the stat block). */}
      <div class="partner-exp-card" onMouseEnter={() => card && setInspectedCard(card)}>
        <Show when={card} fallback={<div class="card">{g.partnerName}</div>}>
          <div class="partner-exp-cardwrap">
            <DigiCardFront card={card!} />
          </div>
        </Show>
      </div>

      {/* Right column: identity, stats, EXP progress, DigiPart rewards. */}
      <div class="partner-exp-stats">
        <div class="partner-exp-header">
          <span class="partner-exp-name">{g.partnerName}</span>
          <Show
            when={g.leveledUp}
            fallback={<span class="partner-exp-level">Lv {g.newLevel}</span>}
          >
            <span class="partner-exp-level">Lv {g.oldLevel}</span>
            <Show when={revealed()}>
              <span class="partner-exp-arrow">→</span>
              <span class="partner-exp-level partner-exp-level--new">Lv {g.newLevel}</span>
              <span class="partner-exp-levelup">✦ LEVEL UP!</span>
            </Show>
          </Show>
        </div>

        <div class="partner-exp-gained">+{g.expGained} EXP</div>

        {/* Base card stats + animated bonus column. */}
        <div class="partner-exp-statgrid">
          <div class="pe-stat">
            <span class="pe-stat-key">HP</span>
            <span class="pe-stat-val">
              {card?.hp ?? "—"}
              <span class="partner-bonus"> +{displayHpBonus()}</span>
            </span>
          </div>
          <div class="pe-stat">
            <img class="pe-stat-icon" src="/assets/icons/button-circle.png" alt="○" />
            <span class="pe-stat-val">
              {card?.c_pow ?? "—"}
              <span class="partner-bonus"> +{displayCircBonus()}</span>
            </span>
          </div>
          <div class="pe-stat">
            <img class="pe-stat-icon" src="/assets/icons/button-triangle.png" alt="△" />
            <span class="pe-stat-val">
              {card?.t_pow ?? "—"}
              <span class="partner-bonus"> +{displayTriBonus()}</span>
            </span>
          </div>
          <div class="pe-stat">
            <img class="pe-stat-icon" src="/assets/icons/button-cross.png" alt="✕" />
            <span class="pe-stat-val">
              {card?.x_pow ?? "—"}
              <span class="partner-bonus"> +{displayCrossBonus()}</span>
            </span>
          </div>
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
// Prize card row — mirrors the partner-growth layout (card + name + stats)
// ---------------------------------------------------------------------------

const PRIZE_SEAL: Record<PrizeStatus, string> = {
  new: "New Card",
  full: "Full Set",
  obtained: "Obtained",
};

function PrizeCardRow(props: { card: MasterCard; status: PrizeStatus }) {
  const c = () => props.card;
  const isDigimon = () => c().type === CardType.Digimon;
  return (
    <div class="partner-exp-row" onMouseEnter={() => setInspectedCard(c())}>
      <div class="partner-exp-card">
        <div class="partner-exp-cardwrap">
          <DigiCardFront card={c()} />
        </div>
      </div>
      <div class="partner-exp-stats">
        <div class="partner-exp-header prize-header">
          <span class="prize-card-number">CARD #{c().number}</span>
          <span class="partner-exp-name">{c().name}</span>
        </div>
        <Show
          when={isDigimon()}
          fallback={
            <p class="prize-card-effect">
              <EffectText text={(c().support || c().x_effect || "").trim() || "Option card."} />
            </p>
          }
        >
          <div class="partner-exp-statgrid">
            <div class="pe-stat">
              <span class="pe-stat-key">HP</span>
              <span class="pe-stat-val">{c().hp}</span>
            </div>
            <div class="pe-stat">
              <img class="pe-stat-icon" src="/assets/icons/button-circle.png" alt="○" />
              <span class="pe-stat-val">{c().c_pow}</span>
            </div>
            <div class="pe-stat">
              <img class="pe-stat-icon" src="/assets/icons/button-triangle.png" alt="△" />
              <span class="pe-stat-val">{c().t_pow}</span>
            </div>
            <div class="pe-stat">
              <img class="pe-stat-icon" src="/assets/icons/button-cross.png" alt="✕" />
              <span class="pe-stat-val">{c().x_pow}</span>
            </div>
          </div>
        </Show>
      </div>
      <div class="prize-stamp" classList={{ [`prize-stamp--${props.status}`]: true }}>
        {PRIZE_SEAL[props.status]}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EXP breakdown step
// ---------------------------------------------------------------------------

/** Staggered table: bonus rows appear one by one, then the Total row last. */
function ExpBreakdownStep(props: {
  rewards: MatchRewards;
  onNext: () => void;
  nextLabel: string;
}) {
  const lines = () => props.rewards.expBreakdown;
  const total = () => props.rewards.exp;

  // How many rows are currently visible (0 = none yet).
  const [visible, setVisible] = createSignal(0);

  onMount(() => {
    // Reveal each bonus row with a staggered delay, then the Total row.
    const n = lines().length;
    for (let i = 0; i < n; i++) {
      setTimeout(() => setVisible(i + 1), (i + 1) * 200);
    }
    // Total row appears after all bonus rows.
    setTimeout(() => setVisible(n + 1), (n + 1) * 200);
  });

  const showTotal = () => visible() > lines().length;

  return (
    <div class="modal modal-exp">
      <h2>Experience</h2>
      <div class="exp-breakdown-scroll">
        <table class="exp-breakdown-table">
          <tbody>
            <Index each={lines()}>
              {(line, i) => (
                <Show when={visible() > i}>
                  <tr class="exp-breakdown-row">
                    <td class="exp-breakdown-name"><EffectText text={line().name} /></td>
                    <td class="exp-breakdown-exp">+{line().exp}</td>
                  </tr>
                </Show>
              )}
            </Index>
            <Show when={showTotal()}>
              <tr class="exp-breakdown-row exp-breakdown-total">
                <td class="exp-breakdown-name">Total</td>
                <td class="exp-breakdown-exp">+{total()}</td>
              </tr>
            </Show>
          </tbody>
        </table>
      </div>
      <Show when={showTotal()}>
        <div class="setup-actions">
          <button class="primary" onClick={props.onNext}>
            {props.nextLabel}
          </button>
        </div>
      </Show>
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
        <div class="modal modal-result">
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

      {/* Step 2 (win): EXP breakdown table, staggered row appearance. */}
      <Show when={step() === "exp"}>
        <ExpBreakdownStep
          rewards={rewards()}
          onNext={() => {
            if (hasPartnerGains()) setStep("partner-exp");
            else if (hasPrize()) setStep("prize");
            else props.onBackToLobby();
          }}
          nextLabel={hasPartnerGains() || hasPrize() ? "Next ▶" : "Back To Lobby"}
        />
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
        <div class="modal modal-partner-exp">
          <h2>📦 {rewards().packName || "Prize"}</h2>
          <div class="partner-exp-list">
            <For each={rewards().cards}>
              {(card, i) => <PrizeCardRow card={card} status={rewards().cardStatus[i()] ?? "obtained"} />}
            </For>
            <Show when={rewards().bonusCards.length > 0}>
              <div class="tag">✨ Bonus card{rewards().bonusCards.length > 1 ? "s" : ""}</div>
              <For each={rewards().bonusCards}>
                {(card, i) => <PrizeCardRow card={card} status={rewards().bonusCardStatus[i()] ?? "obtained"} />}
              </For>
            </Show>
          </div>
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
