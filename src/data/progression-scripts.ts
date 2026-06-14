import type { ProgressionScript } from "@src/engine/progression-engine";

/**
 * Per-city roster rules: pure function of profile.flags → cafeBattleIds[].
 * Called after any flag change to recompute and persist the city roster.
 * Add a new entry here when a city's roster can change through progression.
 */
export const CITY_ROSTER_RULES: Record<string, (flags: Record<string, boolean>) => number[]> = {
  beginner: (flags) =>
    flags.betamon_tutorial_defeated
      ? [5, 3] // Betamon Practice Deck + challengeable Babamon
      : [1, 2], // Betamon Tutorial Deck + locked Babamon
};

/**
 * Nav trigger scripts (enter-cafe, enter-city, etc.).
 * Multiple matching scripts merge their results.
 */
export const PROGRESSION_SCRIPTS: ProgressionScript[] = [
  {
    // Nanimon appears in Beginner City's cafe with 50% probability each visit.
    trigger: "enter-cafe",
    cityId: "beginner",
    effect: (ctx) => ({
      cafeBattleVisitors: ctx.random() < 0.5 ? [4] : [], // 4 = Nanimon
    }),
  },
];
