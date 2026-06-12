import { CardLevel, type MasterCard } from "@src/types";
import { cardsByNumbers, getDeckById } from "@src/data/prebuilt-decks";
import { armorCardsByNumbers } from "@src/data/armor";
import { ProfileStore, type PlayerProfile } from "@src/store/profile-store";
import { LocalStorageProvider } from "@src/store/storage-provider";

/** Deck selection value prefixes/sentinels shared by setup UI and App. */
export const RANDOM_DECK = "__random__";
export const CUSTOM_PREFIX = "custom:";
export const PREBUILT_PREFIX = "deck:";

/** Persistent player profiles (browser localStorage provider for now). */
export const profileStore = new ProfileStore(new LocalStorageProvider());

/**
 * Card numbers of the currently selected deck for a side ([] if unresolved).
 * "custom:<deckId>" values resolve against the given profile's decks.
 */
export function selectedNumbers(value: string, profile: PlayerProfile | null): string[] {
  if (value.startsWith(CUSTOM_PREFIX)) {
    return profile?.decks.find((d) => d.id === value.slice(CUSTOM_PREFIX.length))?.cardNumbers ?? [];
  }
  if (value.startsWith(PREBUILT_PREFIX)) return getDeckById(parseInt(value.slice(PREBUILT_PREFIX.length), 10))?.cardNumbers ?? [];
  return [];
}

export interface ResolvedDeck {
  name: string;
  cards: MasterCard[];
  armors: MasterCard[];
}

/** Resolves a deck selection value ("deck:<id>" prebuilt or "custom:<deckId>" from the profile). */
export function resolveDeck(value: string, profile: PlayerProfile | null): ResolvedDeck {
  if (value.startsWith(CUSTOM_PREFIX)) {
    const deck = profile?.decks.find((d) => d.id === value.slice(CUSTOM_PREFIX.length));
    if (deck) return { name: deck.name, cards: cardsByNumbers(deck.cardNumbers), armors: armorCardsByNumbers(deck.armors) };
  }
  if (value.startsWith(PREBUILT_PREFIX)) {
    const deck = getDeckById(parseInt(value.slice(PREBUILT_PREFIX.length), 10));
    if (deck) return { name: deck.name, cards: cardsByNumbers(deck.cardNumbers), armors: armorCardsByNumbers(deck.armors) };
  }
  return { name: "", cards: [], armors: [] };
}

/** Final legality check — guards against hand-edited localStorage decks. */
export function deckIllegal(cards: MasterCard[]): string | null {
  if (cards.length !== 30) return `deck has ${cards.length} cards (must be exactly 30)`;
  const counts = new Map<string, number>();
  for (const c of cards) counts.set(c.number, (counts.get(c.number) ?? 0) + 1);
  if ([...counts.values()].some((n) => n > 4)) return "deck has more than 4 copies of a card";
  if (cards.some((c) => c.level === CardLevel.A)) return "Armor cards belong in the side deck, not the main 30";
  return null;
}
