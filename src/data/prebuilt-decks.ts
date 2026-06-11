import type { MasterCard } from "@src/types";
import { MASTER_CARDS } from "./master-cards";
import { DECK_LISTS } from "./deck-lists";

const CARD_BY_NUMBER = new Map<string, MasterCard>(MASTER_CARDS.map((c) => [c.number, c]));

/** Names of all prebuilt decks, in DECKLIST.txt order. */
export const DECK_NAMES: string[] = DECK_LISTS.map((d) => d.name);

/**
 * Resolves a prebuilt deck list into its master cards.
 * Falls back to the first deck if the name is unknown.
 */
export function buildDeck(name: string): MasterCard[] {
  const list = DECK_LISTS.find((d) => d.name === name) ?? DECK_LISTS[0];
  if (!list) return [];
  return list.cardNumbers
    .map((n) => CARD_BY_NUMBER.get(n))
    .filter((c): c is MasterCard => c !== undefined);
}

/** A random prebuilt deck name (used for the CPU's "Random" option). */
export function randomDeckName(): string {
  return DECK_NAMES[Math.floor(Math.random() * DECK_NAMES.length)] ?? "Tutorial Deck";
}
