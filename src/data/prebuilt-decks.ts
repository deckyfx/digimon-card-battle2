import type { MasterCard } from "@src/types";
import { MASTER_CARDS } from "./master-cards";
import { DECK_LISTS, type DeckList } from "./deck-lists";

const CARD_BY_NUMBER = new Map<string, MasterCard>(MASTER_CARDS.map((c) => [c.number, c]));

/** All prebuilt decks, in source order. */
export const PREBUILT_DECKS: DeckList[] = DECK_LISTS;

/** Finds a prebuilt deck by its sequential id. */
export function getDeckById(id: number): DeckList | null {
  return DECK_LISTS.find((d) => d.id === id) ?? null;
}

/** Resolves a list of card numbers (one per copy) to master cards. */
export function cardsByNumbers(numbers: string[]): MasterCard[] {
  return numbers.map((n) => CARD_BY_NUMBER.get(n)).filter((c): c is MasterCard => c !== undefined);
}

/** A random prebuilt deck id (used for the CPU's "Random" option). */
export function randomDeckId(): number {
  const deck = DECK_LISTS[Math.floor(Math.random() * DECK_LISTS.length)];
  return deck?.id ?? 1;
}
