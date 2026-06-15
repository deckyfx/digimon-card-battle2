/**
 * Event Engine — RPG-Maker-style map/event/page system.
 *
 * Architecture:
 *   GameMap  →  GameEvent[]  →  EventPage[]  →  condition + EventScript
 *
 * On map entry the UI calls resolveMap() (stable events) and
 * resolveVisitors() (random/ephemeral) to get the current-frame scripts.
 * Side effects (flags, items, warps) are applied only via executeCommand().
 */

import type { GameFlagKey, PlayerFlags } from "@src/data/game-flags";
import type { KeyItemKey } from "@src/data/key-items";
import type { PartnerId } from "@src/data/partners";
import type { ProfileStore } from "@src/store/profile-store";

// ── Map IDs ────────────────────────────────────────────────────────────────

export type MapId =
  | "world"
  | "beginner"
  | "flame"
  | "jungle"
  | "igloo"
  | "junk"
  | "dark"
  | "pyramid"
  | "sky"
  | "steep-road"
  | "wiseman-tower"
  | "infinity-tower"
  | "desert-island";

// ── Script types ───────────────────────────────────────────────────────────

/** Dialog lines authored for one event page. */
export interface EventDialog {
  /** Multi-line dialog id (dialogs.ts) shown the FIRST time (before intro is seen). */
  introDialogId?: number;
  /** Single line shown on Talk after the intro has been seen. */
  recurLine?: string;
  /** Line shown when the player clicks BATTLE. */
  challengeLine?: string;
  /** Line shown the moment battle is confirmed (brief delay). */
  battleStartLine?: string;
  /** Multi-line dialog id shown after the player WINS. */
  winDialogId?: number;
  /** Single line shown after the player LOSES. */
  loseLine?: string;
}

/** Atomic operations the event engine can perform. */
export type EventCommand =
  | { type: "set_flag";       flag: GameFlagKey;    value: boolean }
  | { type: "give_item";      item: KeyItemKey;     qty?: number }
  | { type: "give_card";      cardNumber: string }
  | { type: "give_exp";       amount: number }
  | { type: "warp";           mapId: MapId }
  | { type: "unlock_partner"; partnerId: PartnerId };

/** What one event page DOES — no condition logic here, only behavior. */
export interface EventScript {
  /** Actor displayed in this slot. Omit to hide the slot entirely. */
  actorId?: number;
  /** Hides the slot from the cafe grid when false (default: true). */
  visible?: boolean;
  /** Whether the player can initiate a battle. Default: true when actorId set. */
  canChallenge?: boolean;
  /** Deck id the opponent uses for this battle slot. */
  deckId?: number;
  /** Authored dialog lines for this page. */
  dialog?: EventDialog;
  /** Commands run once when the player wins the battle on this page. */
  onWin?: EventCommand[];
  /** Commands run once when the player talks (after intro dialog). */
  onTalk?: EventCommand[];
}

/** One conditional state of an event. Last matching page wins. */
export interface EventPage {
  /**
   * Guard function evaluated against the player's current flags.
   * Undefined = always active (default page, must be first).
   */
  condition?: (flags: PlayerFlags) => boolean;
  script: EventScript;
}

/** One interactive slot on a map (warp tile, NPC, etc.). */
export interface GameEvent {
  /** Stable id used for intro-seen tracking and post-battle lookup. */
  id: string;
  pages: EventPage[];
}

/**
 * A random visitor slot — resolved fresh every map entry via RNG.
 * Visitors are ephemeral: not persisted, not required for city-clear.
 */
export interface VisitorEvent {
  /** Probability [0, 1] this visitor appears on a given map entry. */
  probability: number;
  /** Optional flag guard — skips the visitor entirely if false. */
  condition?: (flags: PlayerFlags) => boolean;
  script: EventScript;
}

/** A map: world hub or city interior. */
export interface GameMap {
  id: MapId;
  /** Stable events evaluated from flags — always re-derived, never persisted. */
  events: GameEvent[];
  /** Random/ephemeral visitors resolved once on map entry. */
  visitors?: VisitorEvent[];
  /**
   * Actor IDs that must be beaten at least once for the city to count as
   * cleared (drives the world-map unlock chain). Omit for the world map.
   */
  requiredActors?: number[];
}

// ── Resolution ─────────────────────────────────────────────────────────────

/**
 * Returns the active script for one event.
 * Pages are evaluated in order; the LAST matching page wins (RPG-Maker rule).
 */
export function resolveEvent(event: GameEvent, flags: PlayerFlags): EventScript {
  let active: EventScript = event.pages[0]?.script ?? {};
  for (const page of event.pages) {
    if (!page.condition || page.condition(flags)) {
      active = page.script;
    }
  }
  return active;
}

/**
 * Returns all resolved, visible events for a map.
 * Call on every map entry — pure, no side effects.
 */
export function resolveMap(
  map: GameMap,
  flags: PlayerFlags,
): Array<{ event: GameEvent; script: EventScript }> {
  return map.events
    .map((event) => ({ event, script: resolveEvent(event, flags) }))
    .filter(({ script }) => script.visible !== false && script.actorId !== undefined);
}

/**
 * Rolls the visitor table and returns scripts for visitors that appear
 * this visit. Call once on entering a cafe and store in component state.
 */
export function resolveVisitors(
  map: GameMap,
  flags: PlayerFlags,
  random: () => number,
): EventScript[] {
  return (map.visitors ?? [])
    .filter((v) => (!v.condition || v.condition(flags)) && random() < v.probability)
    .map((v) => v.script);
}

// ── Execution ──────────────────────────────────────────────────────────────

/**
 * Executes one EventCommand, mutating profile state via the store.
 * Pass a no-op `navigate` if warp commands should be suppressed (e.g.
 * inside claimRewards where navigation happens after the modal closes).
 */
export function executeCommand(
  cmd: EventCommand,
  profileId: string,
  store: ProfileStore,
  navigate: (mapId: MapId) => void,
): void {
  switch (cmd.type) {
    case "set_flag":
      store.setFlag(profileId, cmd.flag, cmd.value);
      break;
    case "give_item":
      store.giveKeyItem(profileId, cmd.item, cmd.qty ?? 1);
      break;
    case "give_card":
      store.grantCards(profileId, [cmd.cardNumber]);
      break;
    case "give_exp":
      store.addExp(profileId, cmd.amount);
      break;
    case "warp":
      navigate(cmd.mapId);
      break;
    case "unlock_partner":
      store.unlockPartner(profileId, cmd.partnerId);
      break;
  }
}

/** Convenience wrapper — executes a list of commands in order. */
export function executeCommands(
  cmds: EventCommand[],
  profileId: string,
  store: ProfileStore,
  navigate: (mapId: MapId) => void,
): void {
  for (const cmd of cmds) {
    executeCommand(cmd, profileId, store, navigate);
  }
}
