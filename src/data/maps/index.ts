import type { GameMap, MapId } from "@src/engine/event-engine";
import { BEGINNER_CITY_MAP } from "./beginner-city";

/** All authored maps. Add new city maps here as they are written. */
export const ALL_MAPS: GameMap[] = [
  BEGINNER_CITY_MAP,
];

/** Looks up a map by its id. Returns undefined for unimplemented cities. */
export function getMapById(id: MapId): GameMap | undefined {
  return ALL_MAPS.find((m) => m.id === id);
}
