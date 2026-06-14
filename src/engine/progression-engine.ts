import type { PlayerProfile } from "@src/store/profile-store";

/** Navigation events that can trigger progression scripts. */
export type NavTrigger =
  | "enter-worldmap"
  | "enter-city"
  | "enter-cafe"
  | "enter-arena";

export interface TriggerContext {
  cityId: string;
  profile: PlayerProfile;
  /** Injected RNG so the engine stays pure and headless-testable. */
  random: () => number;
}

/** What a trigger evaluation produces. Extend as new effect types are needed. */
export interface ProgressionResult {
  /** Extra actor IDs to show in the city cafe for this visit (ephemeral). */
  cafeBattleVisitors: number[];
}

/** A single progression rule. */
export interface ProgressionScript {
  trigger: NavTrigger;
  /** If set, the script only fires for this city. */
  cityId?: string;
  /** Optional guard — script is skipped when this returns false. */
  condition?: (ctx: TriggerContext) => boolean;
  /** Produces a partial result that is merged into the final output. */
  effect: (ctx: TriggerContext) => Partial<ProgressionResult>;
}

const EMPTY_RESULT: ProgressionResult = { cafeBattleVisitors: [] };

function mergeResults(a: ProgressionResult, b: Partial<ProgressionResult>): ProgressionResult {
  return {
    cafeBattleVisitors: [...a.cafeBattleVisitors, ...(b.cafeBattleVisitors ?? [])],
  };
}

/**
 * Evaluates all matching scripts for the given trigger and returns the
 * merged ProgressionResult. Pass `Math.random` for live play or a seeded
 * function for deterministic tests.
 */
export function runTrigger(
  trigger: NavTrigger,
  ctx: TriggerContext,
  scripts: ProgressionScript[],
): ProgressionResult {
  let result = { ...EMPTY_RESULT };

  for (const script of scripts) {
    if (script.trigger !== trigger) continue;
    if (script.cityId !== undefined && script.cityId !== ctx.cityId) continue;
    if (script.condition && !script.condition(ctx)) continue;
    result = mergeResults(result, script.effect(ctx));
  }

  return result;
}
