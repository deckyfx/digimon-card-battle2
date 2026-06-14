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

export interface City {
  id: string;
  name: string;
  /** City exterior banner. */
  overview: string;
  /** Battle Cafe interior. */
  cafe: string;
  /** Battle Arena interior. */
  arena: string;
  /** Actor ids fightable at this city's Battle Cafe. */
  cafeActorIds: number[];
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
  cafeActorIds: number[],
  unlockedBy: string | null,
): City => ({
  id,
  name,
  overview: img(id, "overview"),
  cafe: img(id, "cafe"),
  arena: img(id, "arena"),
  cafeActorIds,
  unlockedBy,
});

export const CITIES: City[] = [
  // Confirmed roster.
  city("beginner", "Beginner City", [2, 3, 4, 5], null),
  // Drafted rosters below — edit freely.
  city("flame", "Flame City", [6, 7, 8], "beginner"),
  city("jungle", "Jungle City", [9, 10, 11, 12], "flame"),
  city("igloo", "Igloo City", [13, 14, 15, 16], "jungle"),
  city("junk", "Junk City", [17, 18, 19, 20], "igloo"),
  city("dark", "Dark City", [65, 66, 67, 68], "junk"),
  city("pyramid", "Pyramid City", [23, 24, 25], "dark"),
  city("sky", "Sky City", [30, 31, 32], "pyramid"),
  city("steep-road", "Steep Road", [34, 35, 36, 37], "sky"),
  city(
    "wiseman-tower",
    "Wiseman Tower",
    [38, 39, 40, 41, 42, 43],
    "steep-road",
  ),
  city(
    "infinity-tower",
    "Infinity Tower",
    [44, 45, 46, 98, 47],
    "wiseman-tower",
  ),
  city("desert-island", "Desert Island", [48, 49, 50, 51], "infinity-tower"),
];

export function getCityById(id: string): City | null {
  return CITIES.find((c) => c.id === id) ?? null;
}

/** Returns the city whose Battle Cafe contains the given actor, if any. */
export function getCityByActorId(actorId: number): City | null {
  return CITIES.find((c) => c.cafeActorIds.includes(actorId)) ?? null;
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
  return prev.cafeActorIds.every((id) => winsAgainst(records, id) > 0);
}

/** True when every cafe resident of `city` has been beaten at least once. */
export function isCityCleared(city: City, records: BattleRecords): boolean {
  return city.cafeActorIds.every((id) => winsAgainst(records, id) > 0);
}
