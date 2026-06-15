import type { PartnerId } from "@src/data/partners";

/**
 * Master registry of all key items in the game.
 *
 * Key items are persistent trophies (quantity ≥ 0) tracked per profile.
 * Unlike story flags, key items are visible in the player's inventory.
 * Add a new entry here whenever a new obtainable item is introduced.
 */
export const KeyItem = {
  // ── Digivices — each unlocks a new partner selection ──────────────────────
  /** Starter Digivice: choose one of Veemon, Hawkmon, or Armadillomon. */
  DIGIVICE_A: "digivice_a",
  /** Second Digivice: choose one of Patamon or Gatomon. */
  DIGIVICE_B: "digivice_b",
  /** Third Digivice: choose Wormmon + the two unchosen from the first selection. */
  DIGIVICE_C: "digivice_c",
} as const;

export type KeyItemKey = typeof KeyItem[keyof typeof KeyItem];

/** A profile's key-item bag — only owned items need to be present. */
export type PlayerKeyItems = Partial<Record<KeyItemKey, number>>;

/** Display metadata + partner pool for one key item. */
export interface KeyItemDef {
  key: KeyItemKey;
  name: string;
  description: string;
  /**
   * Static partner pool for this item. `null` means the pool must be
   * computed at runtime via {@link resolvePool} (used for DIGIVICE_C whose
   * pool depends on which partner was chosen at profile creation).
   */
  staticPool: PartnerId[] | null;
}

/** Catalog of all key items — used by the inventory screen for display. */
export const KEY_ITEMS: KeyItemDef[] = [
  {
    key: KeyItem.DIGIVICE_A,
    name: "Digivice (Red)",
    description:
      "The Digivice you received at the start of your journey. " +
      "It bonds you to one of the three rookie partners: Veemon, Hawkmon, or Armadillomon.",
    staticPool: ["veemon", "hawkmon", "armadillomon"],
  },
  {
    key: KeyItem.DIGIVICE_B,
    name: "Digivice (Blue)",
    description:
      "A Digivice discovered on your travels. " +
      "It resonates with either Patamon or Gatomon.",
    staticPool: ["patamon", "gatomon"],
  },
  {
    key: KeyItem.DIGIVICE_C,
    name: "Digivice (Green)",
    description:
      "A mysterious Digivice. It carries the signal of Wormmon and the two " +
      "partners you did not choose at the very beginning.",
    staticPool: null, // computed at runtime: Wormmon + 2 unchosen from A pool
  },
];

/**
 * Returns the display definition for a key item, or `undefined` if unknown.
 */
export function getKeyItemDef(key: KeyItemKey): KeyItemDef | undefined {
  return KEY_ITEMS.find((d) => d.key === key);
}

/**
 * Computes the effective partner pool for a key item given the set of
 * already-unlocked partner ids. Handles DIGIVICE_C's dynamic pool.
 */
export function resolvePool(
  def: KeyItemDef,
  unlockedIds: PartnerId[],
): PartnerId[] {
  if (def.staticPool !== null) return def.staticPool;
  // DIGIVICE_C: Wormmon + the 2 from the A pool that were NOT yet chosen.
  const aPool: PartnerId[] = ["veemon", "hawkmon", "armadillomon"];
  const unchosen = aPool.filter((id) => !unlockedIds.includes(id));
  return ["wormmon", ...unchosen];
}
