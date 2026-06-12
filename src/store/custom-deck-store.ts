import { MASTER_CARDS } from "@src/data/master-cards";
import type { StorageProvider } from "./storage-provider";

/** A user-built deck, persisted via the configured StorageProvider. */
export interface CustomDeck {
  id: string;
  name: string;
  /** Master card numbers, one entry per copy. */
  cardNumbers: string[];
  updatedAt: string;
}

/** Decks are exactly this many cards. */
export const DECK_SIZE = 30;
/** At most this many copies of the same card (by card number). */
export const MAX_COPIES = 4;
/** Deck names are short labels. */
export const MAX_NAME_LENGTH = 15;

const KNOWN_NUMBERS = new Set(MASTER_CARDS.map((c) => c.number));

/**
 * Unique-enough deck id. crypto.randomUUID is unavailable outside secure
 * contexts (e.g. when served over LAN http), so roll our own.
 */
function generateId(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

/**
 * CRUD + validation for custom decks. Pure logic — persistence goes through
 * the injected {@link StorageProvider}, so the engine/UI never touch
 * browser APIs directly.
 */
export class CustomDeckStore {
  constructor(
    private readonly provider: StorageProvider,
    private readonly key = "dcb:custom-decks",
  ) {}

  /** All saved decks, newest first. */
  list(): CustomDeck[] {
    const raw = this.provider.get(this.key);
    if (!raw) return [];
    try {
      const decks = JSON.parse(raw) as CustomDeck[];
      return Array.isArray(decks) ? decks : [];
    } catch {
      return [];
    }
  }

  /** Find one deck by id. */
  get(id: string): CustomDeck | null {
    return this.list().find((d) => d.id === id) ?? null;
  }

  /**
   * Validates a deck list. Returns human-readable problems; an empty array
   * means the deck is legal.
   */
  validate(cardNumbers: string[]): string[] {
    const errors: string[] = [];
    if (cardNumbers.length !== DECK_SIZE) {
      errors.push(`Deck must have exactly ${DECK_SIZE} cards (currently ${cardNumbers.length}).`);
    }

    const copies = new Map<string, number>();
    for (const n of cardNumbers) {
      if (!KNOWN_NUMBERS.has(n)) {
        errors.push(`Unknown card number: ${n}`);
        continue;
      }
      copies.set(n, (copies.get(n) ?? 0) + 1);
    }
    for (const [n, count] of copies) {
      if (count > MAX_COPIES) {
        const name = MASTER_CARDS.find((c) => c.number === n)?.name ?? n;
        errors.push(`Max ${MAX_COPIES} copies of the same card — ${name} has ${count}.`);
      }
    }
    return errors;
  }

  /**
   * Creates or updates a deck (upsert by id). Throws on validation failure
   * or empty name — callers should validate first for friendly UX.
   */
  save(deck: { id?: string; name: string; cardNumbers: string[] }): CustomDeck {
    const name = deck.name.trim();
    if (!name) throw new Error("Deck name is required.");
    if (name.length > MAX_NAME_LENGTH) throw new Error(`Deck name must be ${MAX_NAME_LENGTH} characters or fewer.`);
    const errors = this.validate(deck.cardNumbers);
    if (errors.length > 0) throw new Error(errors.join(" "));

    const decks = this.list();
    const clash = decks.find((d) => d.id !== deck.id && d.name.toLowerCase() === name.toLowerCase());
    if (clash) throw new Error(`A deck named "${clash.name}" already exists.`);
    const saved: CustomDeck = {
      id: deck.id ?? generateId(),
      name,
      cardNumbers: [...deck.cardNumbers],
      updatedAt: new Date().toISOString(),
    };
    const idx = decks.findIndex((d) => d.id === saved.id);
    if (idx >= 0) decks[idx] = saved;
    else decks.unshift(saved);
    this.persist(decks);
    return saved;
  }

  delete(id: string): boolean {
    const decks = this.list();
    const next = decks.filter((d) => d.id !== id);
    if (next.length === decks.length) return false;
    this.persist(next);
    return true;
  }

  private persist(decks: CustomDeck[]): void {
    this.provider.set(this.key, JSON.stringify(decks));
  }
}
