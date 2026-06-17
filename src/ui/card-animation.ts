import { createSignal } from "solid-js";
import type { MasterCard } from "@src/types";

// ── Zone registry ──────────────────────────────────────────────────────────────
const zoneEls = new Map<string, HTMLElement>();

/** Register a DOM element as a named animation zone. */
export function registerZone(id: string, el: HTMLElement): void {
  zoneEls.set(id, el);
}

/** Return the current bounding rect of a registered zone, or null if not found. */
export function getZoneRect(id: string): DOMRect | null {
  return zoneEls.get(id)?.getBoundingClientRect() ?? null;
}

// ── Flying card ────────────────────────────────────────────────────────────────

/** A card currently flying through the overlay. */
export interface FlyingCard {
  id: number;
  /** null = render card back face (CPU face-down cards). */
  card: MasterCard | null;
  from: DOMRect;
  to: DOMRect;
  /** Seconds to wait before the GSAP tween starts (for staggered sequences). */
  delay: number;
  /** Destination zone (e.g. "player-hand") — used to hide the resting slot. */
  dest?: string;
  /** The real card arriving (even when `card` is a face-down back), so its
   *  resting hand slot can be matched and hidden while it is in flight. */
  realCard?: MasterCard;
}

/** Optional flight metadata for {@link flyCard}. */
export interface FlyOpts {
  dest?: string;
  realCard?: MasterCard;
}

let _nextId = 0;
const [flyingCards, _setFlying] = createSignal<FlyingCard[]>([]);
export { flyingCards };

/**
 * Reactive accessor — true while any card is in flight.
 * Read inside a SolidJS reactive context to track changes.
 */
export function isAnimating(): boolean {
  return flyingCards().length > 0;
}

/** Remove a flying card by id (called when its GSAP animation completes). */
export function completeFly(id: number): void {
  _setFlying((prev) => prev.filter((fc) => fc.id !== id));
}

/** Kick off a flying-card animation from one screen rect to another. */
export function flyCard(
  card: MasterCard | null,
  from: DOMRect,
  to: DOMRect,
  delay = 0,
  opts: FlyOpts = {},
): void {
  const id = _nextId++;
  _setFlying((prev) => [...prev, { id, card, from, to, delay, ...opts }]);
}

/**
 * Reactive multiset of cards currently flying INTO the given side's hand,
 * keyed by card with a count. The hand renders these as empty until the flight
 * lands (their flying clone arrives and `completeFly` clears them).
 */
/** Reactive: true while any card is flying INTO the given zone (e.g. a battler
 *  slot), so that zone can stay hidden until the flight lands. */
export function pendingZone(zoneId: string): boolean {
  return flyingCards().some((fc) => fc.dest === zoneId);
}

export function pendingHand(side: "player" | "cpu"): Map<MasterCard, number> {
  const dest = `${side}-hand`;
  const m = new Map<MasterCard, number>();
  for (const fc of flyingCards()) {
    if (fc.dest === dest && fc.realCard) {
      m.set(fc.realCard, (m.get(fc.realCard) ?? 0) + 1);
    }
  }
  return m;
}
