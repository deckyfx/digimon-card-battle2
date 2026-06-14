/**
 * The scenario world: cities the player travels between, each with a
 * Battle Cafe (single fights vs the city's residents) and a Battle Arena
 * (3-fight gauntlets — future phase). Images are sliced from the city
 * sheet (256×128 cells).
 *
 * Cafe rosters are DRAFTED from the game-guide exp groupings — confirmed
 * for Beginner City; the rest are editable best guesses.
 */

import type { BattleRecords } from "@src/store/profile-store";
import { getCafeBattleById } from "@src/data/battle-cafe-datas";

export interface City {
  id: string;
  name: string;
  /** City exterior banner. */
  overview: string;
  /** Battle Cafe interior. */
  cafe: string;
  /** Battle Arena interior. */
  arena: string;
  /** CafeBattle ids (battle-cafe-datas.ts) for this city's Battle Cafe. */
  cafeBattleIds: number[];
  /**
   * City id that must be cleared (all cafe residents defeated at least
   * once) before this city opens. null = open from the start.
   */
  unlockedBy: string | null;
}

const img = (id: string, kind: "overview" | "cafe" | "arena") =>
  `/assets/cities/${id}-${kind}.png`;

const city = (
  id: string,
  name: string,
  cafeBattleIds: number[],
  unlockedBy: string | null,
): City => ({
  id,
  name,
  overview: img(id, "overview"),
  cafe: img(id, "cafe"),
  arena: img(id, "arena"),
  cafeBattleIds,
  unlockedBy,
});

export const CITIES: City[] = [
  // Confirmed roster — cafeBattleIds reference CAFE_BATTLES in battle-cafe-datas.ts.
  city("beginner", "Beginner City", [1, 2], null),
  // Drafted rosters below — cafeBattleIds TBD as CafeBattle entries are authored.
  city("flame", "Flame City", [], "beginner"),
  city("jungle", "Jungle City", [], "flame"),
  city("igloo", "Igloo City", [], "jungle"),
  city("junk", "Junk City", [], "igloo"),
  city("dark", "Dark City", [], "junk"),
  city("pyramid", "Pyramid City", [], "dark"),
  city("sky", "Sky City", [], "pyramid"),
  city("steep-road", "Steep Road", [], "sky"),
  city("wiseman-tower", "Wiseman Tower", [], "steep-road"),
  city("infinity-tower", "Infinity Tower", [], "wiseman-tower"),
  city("desert-island", "Desert Island", [], "infinity-tower"),
];

export function getCityById(id: string): City | null {
  return CITIES.find((c) => c.id === id) ?? null;
}

/** Returns the city whose Battle Cafe contains the given actor, if any. */
export function getCityByActorId(actorId: number): City | null {
  return CITIES.find((c) =>
    c.cafeBattleIds.some((bid) => getCafeBattleById(bid)?.actorId === actorId),
  ) ?? null;
}

/** Wins against `actorId` in a profile's battle records. */
export function winsAgainst(records: BattleRecords, actorId: number): number {
  return records[actorId]?.wins ?? 0;
}

/**
 * A city is open when its prerequisite city is cleared — every cafe
 * resident there defeated at least once.
 */
export function isCityUnlocked(city: City, records: BattleRecords): boolean {
  if (!city.unlockedBy) return true;
  const prev = getCityById(city.unlockedBy);
  if (!prev) return true;
  return isCityCleared(prev, records);
}

/** True when every cafe battle in `city` has been won at least once. */
export function isCityCleared(city: City, records: BattleRecords): boolean {
  return city.cafeBattleIds.every((bid) => {
    const actorId = getCafeBattleById(bid)?.actorId;
    return actorId !== undefined && winsAgainst(records, actorId) > 0;
  });
}
