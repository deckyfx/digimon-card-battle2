import { Show } from "solid-js";
import { CardLevel, CardSpecialty, type MasterCard } from "@src/types";
import "./digi-card.css";

// ─── Background helpers ───────────────────────────────────────────────────────

export function getCardBackground(card: MasterCard): string {
  if (card.level === CardLevel.None)
    return "linear-gradient(180deg, rgba(60, 80, 130, 1) 0%, rgba(190, 210, 240, 1) 100%)";
  switch (card.specialty) {
    case CardSpecialty.Fire:
      return "linear-gradient(180deg,rgba(250, 7, 7, 1) 0%, rgba(250, 189, 189, 1) 100%)";
    case CardSpecialty.Ice:
      return "linear-gradient(180deg,rgba(7, 22, 250, 1) 0%, rgba(189, 195, 250, 1) 100%)";
    case CardSpecialty.Nature:
      return "linear-gradient(180deg, rgba(34, 130, 40, 1) 0%, rgba(185, 235, 175, 1) 100%)";
    case CardSpecialty.Darkness:
      return "linear-gradient(180deg, rgba(28, 8, 55, 1) 0%, rgba(110, 65, 170, 1) 100%)";
    case CardSpecialty.Rare:
    default:
      return "linear-gradient(180deg, rgba(170, 120, 10, 1) 0%, rgba(255, 225, 120, 1) 100%)";
  }
}

export function getLevelBadge(card: MasterCard): string {
  if (card.is_partner === 1 && card.level === CardLevel.R)
    return "/assets/icons/badge-rp.svg";
  switch (card.level) {
    case CardLevel.R: return "/assets/icons/badge-r.svg";
    case CardLevel.C: return "/assets/icons/badge-c.svg";
    case CardLevel.U: return "/assets/icons/badge-u.svg";
    case CardLevel.A: return "/assets/icons/badge-a.svg";
    default:          return "/assets/icons/badge-r.svg";
  }
}

export function getSpecialtyIcon(card: MasterCard): string {
  switch (card.specialty) {
    case CardSpecialty.Fire:     return "/assets/icons/icon-fire.svg";
    case CardSpecialty.Ice:      return "/assets/icons/icon-ice.svg";
    case CardSpecialty.Nature:   return "/assets/icons/icon-nature.svg";
    case CardSpecialty.Darkness: return "/assets/icons/icon-darkness.svg";
    case CardSpecialty.Rare:
    default:                     return "/assets/icons/icon-rare.svg";
  }
}

export function getOptionIcon(card: MasterCard): string {
  const num = parseInt(card.number, 10);
  return num >= 293 && num <= 300
    ? "/assets/icons/icon-digivolve.svg"
    : "/assets/icons/icon-option.svg";
}

// ─── Card front face ──────────────────────────────────────────────────────────

/** The visual front face of a card: frame background, level badge, specialty icon, art. */
export function DigiCardFront(props: { card: MasterCard }) {
  const isDigimon = () => props.card.level !== CardLevel.None;

  return (
    <div class="digi-card-face digi-card-front" style={{ background: getCardBackground(props.card) }}>
      <Show when={isDigimon()}>
        <img class="digi-card-badge-level" src={getLevelBadge(props.card)} alt={props.card.level} />
      </Show>
      <img
        class="digi-card-badge-specialty"
        src={isDigimon() ? getSpecialtyIcon(props.card) : getOptionIcon(props.card)}
        alt={props.card.specialty}
      />
      <div class="digi-card-image-container">
        <img class="digi-card-image" src={props.card.img_src} alt={props.card.name} />
      </div>
    </div>
  );
}

// ─── Full flippable card ──────────────────────────────────────────────────────

export type DigiCardProps = {
  card: MasterCard;
  /** Ref to the inner 3D container — attach GSAP animations here. */
  innerRef?: (el: HTMLDivElement) => void;
  onMouseMove?: (e: MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

/**
 * Self-contained visual card with a perspective wrapper, 3D-flip inner
 * container, front face, and card-back face. Point GSAP at `innerRef`.
 */
export function DigiCard(props: DigiCardProps) {
  return (
    <div
      class="digi-card-wrapper"
      onMouseMove={props.onMouseMove}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      <div ref={(el) => props.innerRef?.(el)} class="digi-card-inner">
        <DigiCardFront card={props.card} />
        <div class="digi-card-face digi-card-back">
          <img src="/assets/cards/back.png" alt="Card Back" />
        </div>
      </div>
    </div>
  );
}
