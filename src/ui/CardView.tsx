import { Show, createSignal } from "solid-js";
import { CardSpecialty, CardType, type MasterCard } from "@src/types";

/** Card currently inspected (hovered) — rendered in the right detail panel. */
export const [inspectedCard, setInspectedCard] = createSignal<MasterCard | null>(null);

/** Border colour class per specialty (Options white, digivolve options gold). */
export function specialtyClass(card: MasterCard): string {
  // Cards 293–300 are the digivolve option cards (Download … Digi-devolve).
  const num = parseInt(card.number, 10);
  if (num >= 293 && num <= 300) return "spec-digivolve";
  if (card.type === CardType.Option) return "spec-option";
  switch (card.specialty) {
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

/**
 * Compact card: stats only. Attack names, card number, and full effect text
 * live in the right-hand detail panel (hover the card to inspect it).
 */
export function CardView(props: { card: MasterCard; children?: import("solid-js").JSX.Element }) {
  const c = () => props.card;
  const isDigimon = () => c().type === CardType.Digimon;
  return (
    <div
      class={`card ${specialtyClass(c())}`}
      classList={{ option: c().type === CardType.Option }}
      onMouseEnter={() => setInspectedCard(c())}
    >
      <div class="name-row">
        <span class="name">{c().name}</span>
        <Show when={isDigimon()}>
          <span class="lvl">{c().level}</span>
        </Show>
      </div>
      <Show when={isDigimon()}>
        <div>HP: {c().hp}</div>
        <div class="stat-split">
          <span>DP+: {c().dp_point}</span>
          <span>DP↑: {c().dp_required}</span>
        </div>
        <div class="stat-split">
          <span>○ {c().c_pow}</span>
          <span>△ {c().t_pow}</span>
        </div>
        <div>✕ {c().x_pow}</div>
        <Show when={c().x_effect}>
          <div class="effect">✕: {c().x_effect}</div>
        </Show>
      </Show>
      <div class="effect">Support: {c().support || "None"}</div>
      {props.children}
    </div>
  );
}
