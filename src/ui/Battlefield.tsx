import { For, Show, createSignal } from "solid-js";
import type { MasterCard } from "@src/types";
import type { GameEngine, PlayerId, PlayerState } from "@src/engine/game-engine";
import { quantizeStat } from "@src/engine/battle-context";
import { CardView, setInspectedCard, specialtyClass, specialtyToClass } from "./CardView";
import { DigiCardFront } from "./DigiCard";
import { Ticker } from "./Ticker";
import { registerZone, pendingZone } from "./card-animation";

/**
 * Battle-zone card: shows EFFECTIVE values — penalty-adjusted powers, live
 * battle boosts while a battle is resolving, and current HP.
 */
function ActiveDigimonView(props: { p: PlayerState; g: GameEngine }) {
  // Read props.p.active directly — the object is mutated in place, so going
  // through Show's memoized children accessor would freeze HP updates.
  const a = () => props.p.active;

  /** Live battle side for this player, when a battle is resolving. */
  const side = () => {
    const b = props.g.activeBattle;
    if (!b) return null;
    return b.ownerId === props.p.id ? b.owner : b.defender;
  };

  const pow = (t: "c" | "t" | "x") => {
    const sd = side();
    if (sd) return quantizeStat(sd.ctx[`${t}_power`]);
    const act = a();
    return act ? quantizeStat(act.card[`${t}_pow`] * act.penalty) : 0;
  };

  // Specialty changes persist on the ActiveDigimon (like HP) until KO.
  // During a battle, read from the live ctx; between rounds, from active.specialty
  // (the persisted override) falling back to the card's original specialty.
  const battlerSpecialtyClass = () => {
    const sd = side();
    const act = a()!;
    const spec = sd ? sd.ctx.specialty : (act.specialty ?? act.card.specialty);
    return specialtyToClass(spec);
  };

  return (
    <div
      class="battler-wrap"
      onMouseEnter={() => a() && setInspectedCard(a()!.card)}
    >
      {/* Name row — always rendered to prevent layout shift */}
      <div class="battler-name" classList={{ "battler-name--waiting": !a() }}>
        {a() ? a()!.card.name : "Waiting…"}
      </div>

      <div
        class={`battler-slot ${a() ? battlerSpecialtyClass() : "battler-slot--empty"}${
          pendingZone(`${props.p.id}-battler`) ? " is-incoming" : ""
        }`}
      >
        <div class="battler-art" ref={(el) => registerZone(`${props.p.id}-battler`, el)}>
          <Show when={a()}>
            <DigiCardFront card={a()!.card} />
          </Show>
        </div>

        <Show when={a()}>
          <div class="battler-stats">
            <div class="battler-hp-bar">
              <div
                class="battler-hp-fill"
                style={{ width: `${Math.max(0, Math.min(100, (a()!.hp / a()!.maxHp) * 100))}%` }}
              />
            </div>
            <div class="battler-hp-vals">
              HP <Ticker value={a()!.hp} fromZero />/<Ticker value={a()!.maxHp} fromZero />
              {a()!.penalty < 1 ? <span class="battler-penalty"> ×{a()!.penalty}</span> : ""}
            </div>
            <div class="battler-atk-list">
              <div class="battler-atk">
                <img src="/assets/icons/button-circle.png" class="battler-atk-icon" alt="○" />
                <Ticker value={pow("c")} fromZero />
              </div>
              <div class="battler-atk">
                <img src="/assets/icons/button-triangle.png" class="battler-atk-icon" alt="△" />
                <Ticker value={pow("t")} fromZero />
              </div>
              <div class="battler-atk">
                <img src="/assets/icons/button-cross.png" class="battler-atk-icon" alt="✕" />
                <Ticker value={pow("x")} fromZero />
              </div>
            </div>
            <Show when={a()!.card.x_effect}>
              <div class="battler-xeffect">
                <img src="/assets/icons/button-cross.png" class="battler-atk-icon" alt="✕" />
                {a()!.card.x_effect}
              </div>
            </Show>
            <Show when={a()!.stack.length > 0}>
              <div class="battler-stack">{a()!.stack.map((c) => c.name).join(" → ")}</div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}

/** DP stack readout flanking the battle zone. (The armor side deck stays
    hidden — it is not rendered on the battle board.) */
function DpRail(props: { p: PlayerState; g: GameEngine; side: PlayerId }) {
  const [open, setOpen] = createSignal(false);
  const dpCards = () => props.p.dpSlot;
  const top = () => dpCards()[dpCards().length - 1];
  // Only the player's own stock is shown — the CPU's DP cards stay hidden.
  const ownSide = () => props.side === "player";
  const canView = () => ownSide() && dpCards().length > 0;
  return (
    <div class={`rail dp-rail dp-${props.side}`}>
      <div class="dp-heading">DP</div>
      {/* DP stack: latest card (own side) or an empty frame (CPU is hidden),
          with the DP total centered over it. Click (own, non-empty) to view all. */}
      <button
        class="dp-stack"
        classList={{ "dp-stack--view": canView() }}
        disabled={!canView()}
        title={canView() ? "View stocked DP cards" : undefined}
        ref={(el) => registerZone(props.side === "player" ? "player-dp" : "cpu-dp", el)}
        onClick={() => canView() && setOpen(true)}
      >
        <Show when={ownSide() && top()} keyed fallback={<div class="dp-empty" />}>
          {(card) => (
            <div class="dp-stack-card">
              <CardView card={card} art />
            </div>
          )}
        </Show>
        <span class="dp-value">
          <Ticker value={props.g.dpTotal(props.p)} />
        </span>
      </button>
      <div class="dp-slots">
        <For each={Array.from({ length: 8 })}>
          {(_, i) => <div class="dp-slot" classList={{ filled: i() < props.p.dpSlot.length }} />}
        </For>
      </div>

      <Show when={open()}>
        <div class="modal-overlay" onClick={() => setOpen(false)}>
          <div class="modal dp-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Stocked DP — {dpCards().length} card{dpCards().length === 1 ? "" : "s"}</h2>
            <div class="dp-card-list">
              <For each={dpCards()}>{(c) => <CardView card={c} art />}</For>
            </div>
            <div class="setup-actions">
              <button class="primary" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}

/** Docked support card display (face up or mystery-down). */
function SupportDock(props: {
  s: { card: MasterCard | null; faceUp: boolean } | null;
  /** CPU side: align the "Support" label to the top-right to mirror the player. */
  mirror?: boolean;
}) {
  return (
    <Show when={props.s}>
      <div class="support-card" classList={{ "support-card--mirror": props.mirror }}>
        <div class="tag">Support</div>
        <Show
          when={props.s!.card}
          fallback={
            /* Gamble chosen but not yet drawn: a generic face-down back. */
            <div class="card card--art card-back">
              <img src="/assets/cards/back.png" alt="Face-down support" />
            </div>
          }
        >
          {/* Gamble supports render face-down (back) and flip to reveal once
              the resolver sets the side revealed. */}
          <CardView card={props.s!.card as MasterCard} art flipped={!props.s!.faceUp} />
        </Show>
      </div>
    </Show>
  );
}

/** Shared battle zone: both active Digimon overlapping face-to-face. */
export function Battlefield(props: {
  g: GameEngine;
  support: MasterCard | "deck" | null;
  /** When true the opponent's hand is open — their hand supports show face-up. */
  revealOpponentHand: boolean;
}) {
  const battle = () => props.g.activeBattle;
  const fx = () => props.g.currentFx;

  const sideFor = (id: PlayerId) => {
    const b = battle();
    return b ? (b.ownerId === id ? b.owner : b.defender) : null;
  };

  /** Support to display for a side: live battle side, or the player's pick. */
  const supportFor = (id: PlayerId): { card: MasterCard | null; faceUp: boolean } | null => {
    const side = sideFor(id);
    if (side) {
      if (!side.support) return null;
      // Hand supports are known to their owner — and to the opponent too
      // when hands are open (vs CPU). Deck gambles stay a mystery "?" for
      // everyone until the resolver reveals them.
      const handKnown = id === "player" || props.revealOpponentHand;
      const faceUp = side.revealed || (!side.fromDeck && handKnown);
      return { card: side.support, faceUp };
    }
    if (id === "player" && props.support) {
      return props.support === "deck" ? { card: null, faceUp: false } : { card: props.support, faceUp: true };
    }
    return null;
  };

  const sideClass = (id: PlayerId) => ({
    "fx-strike": fx()?.kind === "strike" && fx()?.side === id,
    "fx-hit": fx()?.kind === "strike" && fx()?.side !== id && battle() !== null,
    "fx-glow": (fx()?.kind === "support" || fx()?.kind === "x-effect") && fx()?.side === id,
  });

  return (
    <div class="area">
      <div class="with-rail">
        {/* DP stacks flank the battle zone: yours bottom-left, theirs top-right. */}
        <DpRail p={props.g.players.player} g={props.g} side="player" />
        <div class="vs-zone rail-main">
          <div class="vs-side vs-player vs-with-support" classList={sideClass("player")}>
            <ActiveDigimonView p={props.g.players.player} g={props.g} />
            <SupportDock s={supportFor("player")} />
          </div>
          <div class="vs-side vs-cpu vs-with-support" classList={sideClass("cpu")}>
            <SupportDock s={supportFor("cpu")} mirror />
            <ActiveDigimonView p={props.g.players.cpu} g={props.g} />
          </div>
        </div>
        <DpRail p={props.g.players.cpu} g={props.g} side="cpu" />
      </div>
    </div>
  );
}
