import type { AttackType } from "@src/types";

/**
 * Mutable combatant view exposed to card effect scripts as `own` / `opponent`.
 *
 * Property names intentionally use snake_case — they are part of the script
 * contract embedded in the card database and must not be renamed.
 */
export interface CombatantCtx {
  /** Current HP (mutable; written back to the active Digimon after battle). */
  hp: number;
  /** Card level value: "R" | "C" | "U" | "A". */
  level: string;
  /** Specialty value: "Fire" | "Ice" | "Nature" | "Darkness" | "Rare". */
  specialty: string;
  /** Circle attack power for this battle (penalty already applied). */
  c_power: number;
  /** Triangle attack power for this battle (penalty already applied). */
  t_power: number;
  /** Cross attack power for this battle (penalty already applied). */
  x_power: number;
  /** Chosen attack — scripts may change it ("changes attack" effects). */
  selected_attack: AttackType;
  /** Number of cards currently in the DP slot. */
  dp_count: number;
  /** Number of cards currently in hand. */
  hand_count: number;
  /** When true, this side strikes first regardless of turn ownership. */
  is_first_attack: boolean;
  /** Attack types this side counters (returns received damage as own power). */
  is_countering: AttackType[];
  /** Jamming: voids the opposing side's support effect. */
  jamming: boolean;
  /** Eat-up HP: recover HP equal to damage dealt. */
  is_absorbing: boolean;
  /** Crash: attack power becomes current HP; own HP drops to 10 after. */
  is_crashing: boolean;
  /** Revive value: if KO'd this battle, revive with this HP (point still lost). */
  is_reviving: number;
  /** When true this side's support effect is voided. */
  support_voided: boolean;
  /** When true this side's Option-card support is voided. */
  option_voided: boolean;
}

/** Creates a fresh combatant context with all battle flags cleared. */
export function createCombatantCtx(
  init: Pick<
    CombatantCtx,
    "hp" | "level" | "specialty" | "c_power" | "t_power" | "x_power" | "selected_attack" | "dp_count" | "hand_count"
  >,
): CombatantCtx {
  return {
    ...init,
    is_first_attack: false,
    is_countering: [],
    jamming: false,
    is_absorbing: false,
    is_crashing: false,
    is_reviving: 0,
    support_voided: false,
    option_voided: false,
  };
}
