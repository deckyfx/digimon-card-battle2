/** Card category. */
export enum CardType {
  Digimon = "Digimon",
  Option = "Option",
}

/** Digimon elemental specialty. Options use {@link CardSpecialty.None}. */
export enum CardSpecialty {
  Fire = "Fire",
  Ice = "Ice",
  Nature = "Nature",
  Darkness = "Darkness",
  Rare = "Rare",
  None = "None",
}

/**
 * Digimon level. Effect scripts compare against the raw string values
 * ("R" | "C" | "U" | "A"), so the enum values must stay single letters.
 */
export enum CardLevel {
  /** Rookie */
  R = "R",
  /** Champion */
  C = "C",
  /** Ultimate */
  U = "U",
  /** Armor (special digivolution only) */
  A = "A",
  /** Option cards */
  None = "None",
}

/** Attack slot identifier used across scripts and battle state. */
export type AttackType = "c" | "t" | "x";

/**
 * Master card record, mirroring the original database schema used by the
 * auto-generated seed. Effect scripts are stored as JavaScript source strings
 * and executed by the engine's ScriptRunner against a battle context.
 */
export interface MasterCard {
  number: string;
  type: CardType;
  name: string;
  level: CardLevel;
  specialty: CardSpecialty;
  hp: number;
  /** DP cost required to digivolve INTO this card (0 for rookies/options). */
  dp_required: number;
  /** DP contributed when this card is placed in the DP slot. */
  dp_point: number;
  c_attack: string;
  c_pow: number;
  t_attack: string;
  t_pow: number;
  x_attack: string;
  x_pow: number;
  x_effect: string;
  x_effect_speed: number;
  x_effect_script: string;
  x_effect_is_jamming: number;
  x_effect_changes_attack: number;
  support: string;
  support_speed: number;
  support_script: string;
  support_effect_is_jamming: number;
  support_effect_changes_attack: number;
  is_partner: number;
  img_src: string;
}
