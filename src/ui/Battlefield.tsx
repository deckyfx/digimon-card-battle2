import { For, Show } from "solid-js";
import type { MasterCard } from "@src/types";
import type { GameEngine, PlayerId, PlayerState } from "@src/engine/game-engine";
import { quantizeStat } from "@src/engine/battle-context";
import { CardView, setInspectedCard, specialtyClass, specialtyToClass } from "./CardView";
import { Ticker } from "./Ticker";

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
    <Show when={a()} fallback={<div class="card empty">— no active Digimon —</div>}>
      <div class={`card battler ${battlerSpecialtyClass()}`} onMouseEnter={() => setInspectedCard(a()!.card)}>
        <div class="name-row">
          <span class="name">{a()!.card.name}</span>
          <span class="lvl">{a()!.card.level}</span>
        </div>
        <div>
          HP: <Ticker value={a()!.hp} fromZero />/<Ticker value={a()!.maxHp} fromZero />
          {a()!.penalty < 1 ? ` · ×${a()!.penalty}` : ""}
        </div>
        <div class="hp-bar">
          <div style={{ width: `${Math.max(0, Math.min(100, (a()!.hp / a()!.maxHp) * 100))}%` }} />
        </div>
        <div class="stat-split">
          <span>
            ○ <Ticker value={pow("c")} fromZero />
          </span>
          <span>
            △ <Ticker value={pow("t")} fromZero />
          </span>
        </div>
        <div>
          ✕ <Ticker value={pow("x")} fromZero />
        </div>
        <Show when={a()!.card.x_effect}>
          <div class="effect effect-x">✕: {a()!.card.x_effect}</div>
        </Show>
        <Show when={a()!.stack.length > 0}>
          <div class="tag">Stacked: {a()!.stack.map((c) => c.name).join(" → ")}</div>
        </Show>
      </div>
    </Show>
  );
}

/** DP stack readout flanking the battle zone. (The armor side deck stays
    hidden — it is not rendered on the battle board.) */
function DpRail(props: { p: PlayerState; g: GameEngine; side: PlayerId }) {
  return (
    <div class={`rail dp-rail dp-${props.side}`}>
      <div class="rail-stat">
        <div class="rail-label">DP</div>
        <div class="rail-num">
          <Ticker value={props.g.dpTotal(props.p)} />
        </div>
        <div class="dp-slots">
          <For each={Array.from({ length: 8 })}>
            {(_, i) => <div class="dp-slot" classList={{ filled: i() < props.p.dpSlot.length }} />}
          </For>
        </div>
      </div>
    </div>
  );
}

/** Docked support card display (face up or mystery-down). */
function SupportDock(props: { s: { card: MasterCard | null; faceUp: boolean } | null }) {
  return (
    <Show when={props.s}>
      <div class="support-card">
        <div class="tag">Support</div>
        <Show when={props.s!.faceUp && props.s!.card} fallback={<div class="card mystery">?</div>}>
          <CardView card={props.s!.card as MasterCard} />
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
            <SupportDock s={supportFor("cpu")} />
            <ActiveDigimonView p={props.g.players.cpu} g={props.g} />
          </div>
        </div>
        <DpRail p={props.g.players.cpu} g={props.g} side="cpu" />
      </div>
    </div>
  );
}
