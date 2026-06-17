import { Show, createSignal } from "solid-js";
import { CardSpecialty, CardType, type MasterCard } from "@src/types";
import { DigiCardFront } from "./DigiCard";

/** Card currently inspected (hovered) — rendered in the right detail panel. */
export const [inspectedCard, setInspectedCard] = createSignal<MasterCard | null>(null);

/** Maps a raw specialty string to its CSS border class. */
export function specialtyToClass(specialty: string): string {
  switch (specialty) {
    case CardSpecialty.Fire:
      return "spec-fire";
    case CardSpecialty.Nature:
      return "spec-nature";
    case CardSpecialty.Ice:
      return "spec-ice";
    case CardSpecialty.Rare:
      return "spec-rare";
    case CardSpecialty.Darkness:
      return "spec-darkness";
    default:
      return "spec-option";
  }
}

/** Border colour class per card (Options white, digivolve options gold). */
export function specialtyClass(card: MasterCard): string {
  // Cards 293–300 are the digivolve option cards (Download … Digi-devolve).
  const num = parseInt(card.number, 10);
  if (num >= 293 && num <= 300) return "spec-digivolve";
  if (card.type === CardType.Option) return "spec-option";
  return specialtyToClass(card.specialty);
}

/**
 * Card mini-view. By default a compact stat grid; with `art` it renders the
 * full card face (same visual as the detail panel) for the battle board. Either
 * way, hovering inspects the card in the right-hand detail panel, and any
 * `children` (action balloons) overlay the card.
 */
export function CardView(props: {
  card: MasterCard;
  /** Render the visual card art instead of the text stat grid. */
  art?: boolean;
  /**
   * Art mode only: render the card face-down (back showing). Toggling this back
   * to false animates a flip — used for gamble supports revealed at resolution.
   */
  flipped?: boolean;
  /** Extra class on the card root (e.g. "card-incoming" to hide while in flight). */
  class?: string;
  children?: import("solid-js").JSX.Element;
}) {
  const c = () => props.card;
  const isDigimon = () => c().type === CardType.Digimon;
  return (
    <div
      class={`card ${specialtyClass(c())} ${props.class ?? ""}`}
      classList={{ option: c().type === CardType.Option, "card--art": props.art }}
      // A face-down card stays a mystery — don't reveal it in the detail panel.
      onMouseEnter={() => !props.flipped && setInspectedCard(c())}
    >
      <Show when={props.art}>
        <div class="card-flip" classList={{ "is-flipped": props.flipped }}>
          <div class="card-flip-inner">
            <div class="card-flip-face card-flip-front">
              <DigiCardFront card={c()} />
            </div>
            <div class="card-flip-face card-flip-back">
              <img src="/assets/cards/back.png" alt="Card back" />
            </div>
          </div>
        </div>
      </Show>
      <Show when={!props.art}>
      <div class="name-row">
        <span class="name">{c().name}</span>
        <Show when={isDigimon()}>
          <span class="lvl">{c().level}</span>
        </Show>
      </div>
      <Show when={isDigimon()}>
        {/* Two-column stat grid: labels left, numbers right-aligned in a
            fixed 4-digit slot (stats max out at 9990) so rows line up. */}
        <div class="stat-grid">
          <span class="stat">
            <span>HP</span>
            <span class="num">{c().hp}</span>
          </span>
          <span class="stat" />
          <span class="stat">
            <span>DP+</span>
            <span class="num">{c().dp_point}</span>
          </span>
          <span class="stat">
            <span>DP↑</span>
            <span class="num">{c().dp_required}</span>
          </span>
          <span class="stat">
            <span>○</span>
            <span class="num">{c().c_pow}</span>
          </span>
          <span class="stat">
            <span>△</span>
            <span class="num">{c().t_pow}</span>
          </span>
          <span class="stat">
            <span>✕</span>
            <span class="num">{c().x_pow}</span>
          </span>
          <span class="stat" />
        </div>
        <Show when={c().x_effect}>
          <div class="effect effect-x">✕: {c().x_effect}</div>
        </Show>
      </Show>
      <div class="effect effect-support">Support: {c().support || "None"}</div>
      </Show>
      {props.children}
    </div>
  );
}
