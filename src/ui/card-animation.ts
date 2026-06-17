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
}

let _nextId = 0;
const [flyingCards, _setFlying] = createSignal<FlyingCard[]>([]);
export { flyingCards };

/** Remove a flying card by id (called when its GSAP animation completes). */
export function completeFly(id: number): void {
  _setFlying((prev) => prev.filter((fc) => fc.id !== id));
}

/** Kick off a flying-card animation from one screen rect to another. */
export function flyCard(card: MasterCard | null, from: DOMRect, to: DOMRect): void {
  const id = _nextId++;
  _setFlying((prev) => [...prev, { id, card, from, to }]);
}
