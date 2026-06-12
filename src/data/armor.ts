import type { MasterCard } from "@src/types";
import { MASTER_CARDS } from "./master-cards";

/**
 * Partner ↔ Armor associations (card numbers). Each partner Rookie has a
 * fixed set of Armor forms; a deck may carry exactly ONE armor card in its
 * hidden side deck, and only when at least one copy of the associated
 * partner is in the main 30.
 */
export const PARTNER_ARMORS: Record<string, string[]> = {
  "175": ["172", "185", "173"], // Veemon → Flamedramon, Raidramon, Magnamon
  "182": ["179", "188"], // Hawkmon → Halsemon, Shurimon
  "190": ["189", "176"], // Armadillomon → Digmon, Submarimon
  "183": ["180", "174"], // Patamon → Pegasusmon, Baronmon
  "184": ["181", "178"], // Gatomon → Nefertimon, Tylomon
  "187": ["186", "177"], // Wormmon → Shadramon, Quetzalmon
};

/** Reverse map: armor card number → its partner's card number. */
export const ARMOR_PARTNER: Record<string, string> = Object.fromEntries(
  Object.entries(PARTNER_ARMORS).flatMap(([partner, armors]) => armors.map((a) => [a, partner])),
);

const CARD_BY_NUMBER = new Map<string, MasterCard>(MASTER_CARDS.map((c) => [c.number, c]));

/** Resolves an armor card number to its master card (null if unknown). */
export function armorCardByNumber(number: string | undefined | null): MasterCard | null {
  if (!number) return null;
  return ARMOR_PARTNER[number] ? (CARD_BY_NUMBER.get(number) ?? null) : null;
}

/** Resolves a list of armor card numbers to master cards (unknowns dropped). */
export function armorCardsByNumbers(numbers: string[] | undefined): MasterCard[] {
  return (numbers ?? []).map((n) => armorCardByNumber(n)).filter((c): c is MasterCard => c !== null);
}

/** Distinct partner card numbers present in a main-deck list, in association order. */
export function partnersIn(cardNumbers: string[]): string[] {
  const present = new Set(cardNumbers);
  return Object.keys(PARTNER_ARMORS).filter((partner) => present.has(partner));
}
