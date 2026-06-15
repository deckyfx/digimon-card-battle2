/**
 * Master registry of all story flags in the game.
 *
 * Add a new entry here whenever you need a new persistent boolean that
 * drives story progression. The key is the string stored in
 * PlayerProfile.flags; the value is a human-readable constant used in code.
 *
 * Convention: CITY_EVENT or CITY_CONDITION, all caps, underscore-separated.
 */
export const GameFlag = {
  // ── Beginner City ─────────────────────────────────────────────────────────
  BETAMON_TUTORIAL_DEFEATED: "betamon_tutorial_defeated",
  BEGINNER_CITY_CLEARED:     "beginner_city_cleared",

  // ── Add more flags below as cities/scenarios are authored ─────────────────
} as const;

export type GameFlagKey = typeof GameFlag[keyof typeof GameFlag];

/** A profile's story-flag dictionary — only set flags need to be present. */
export type PlayerFlags = Partial<Record<GameFlagKey, boolean>>;
