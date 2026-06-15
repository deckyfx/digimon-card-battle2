/**
 * The scenario world: cities the player travels between, each with a
 * Battle Cafe (single fights vs the city's residents) and a Battle Arena
 * (3-fight gauntlets — future phase). Images are sliced from the city
 * sheet (256×128 cells).
 *
 * City-clear detection uses GameMap.requiredActors (see src/data/maps/).
 */

import type { BattleRecords } from "@src/store/profile-store";
import { getMapById } from "@src/data/maps";

export interface City {
  id: string;
  name: string;
  /** City exterior banner. */
  overview: string;
  /** Battle Cafe interior. */
  cafe: string;
  /** Battle Arena interior. */
  arena: string;
  /**
   * City id that must be cleared (all required actors defeated at least
   * once) before this city opens. null = open from the start.
   */
  unlockedBy: string | null;
}

const img = (id: string, kind: "overview" | "cafe" | "arena") =>
  `/assets/cities/${id}-${kind}.png`;

const city = (
  id: string,
  name: string,
  unlockedBy: string | null,
): City => ({
  id,
  name,
  overview: img(id, "overview"),
  cafe: img(id, "cafe"),
  arena: img(id, "arena"),
  unlockedBy,
});

export const CITIES: City[] = [
  city("beginner",       "Beginner City",    null),
  city("flame",          "Flame City",       "beginner"),
  city("jungle",         "Jungle City",      "flame"),
  city("igloo",          "Igloo City",       "jungle"),
  city("junk",           "Junk City",        "igloo"),
  city("dark",           "Dark City",        "junk"),
  city("pyramid",        "Pyramid City",     "dark"),
  city("sky",            "Sky City",         "pyramid"),
  city("steep-road",     "Steep Road",       "sky"),
  city("wiseman-tower",  "Wiseman Tower",    "steep-road"),
  city("infinity-tower", "Infinity Tower",   "wiseman-tower"),
  city("desert-island",  "Desert Island",    "infinity-tower"),
];

export function getCityById(id: string): City | null {
  return CITIES.find((c) => c.id === id) ?? null;
}

/** Returns the city whose Battle Cafe map contains the given actor id. */
export function getCityByActorId(actorId: number): City | null {
  return CITIES.find((city) => {
    const map = getMapById(city.id as Parameters<typeof getMapById>[0]);
    return map?.requiredActors?.includes(actorId) ?? false;
  }) ?? null;
}

/** Wins against `actorId` in a profile's battle records. */
export function winsAgainst(records: BattleRecords, actorId: number): number {
  return records[actorId]?.wins ?? 0;
}

/**
 * A city is open when its prerequisite city is cleared — every required
 * actor there defeated at least once.
 */
export function isCityUnlocked(city: City, records: BattleRecords): boolean {
  if (!city.unlockedBy) return true;
  const prev = getCityById(city.unlockedBy);
  if (!prev) return true;
  return isCityCleared(prev, records);
}

/**
 * True when every required actor in the city's map has been won against
 * at least once. Cities with no map entry or no requiredActors are never
 * considered cleared (they aren't playable yet).
 */
export function isCityCleared(city: City, records: BattleRecords): boolean {
  const map = getMapById(city.id as Parameters<typeof getMapById>[0]);
  if (!map?.requiredActors?.length) return false;
  return map.requiredActors.every((actorId) => winsAgainst(records, actorId) > 0);
}
