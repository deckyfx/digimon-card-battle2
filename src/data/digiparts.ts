/**
 * DigiParts — stat/effect upgrade items attached to Partner Digimon.
 *
 * Each DigiPart belongs to a group (determines equip-slot conflict rules).
 * Effect-group parts (cross_eff, support_eff) additionally carry effect text and
 * scripts mirroring the MasterCard contract — see the optional effect fields.
 * Only one cross_eff and one support_eff part may be equipped at a time, so each
 * corrects the active Digimon's X effect / support effect respectively.
 */

import type { MasterCard } from "@src/types";

export type DigiPartGroup =
  | "hp"
  | "all_atk"
  | "circle"
  | "triangle"
  | "cross"
  | "cross_eff"
  | "dp"
  | "support_eff"
  | "s_exp"
  | "s_rare";

export interface DigiPart {
  /** Unique id, 0-indexed, matches array position. */
  id: number;
  /** Display name shown in UI. */
  name: string;
  /** Functional group — two parts of the same group cannot be equipped simultaneously. */
  group: DigiPartGroup;

  // ── Optional effect contract (mirrors MasterCard) ──────────────────────────
  /** Human-readable X (cross) attack effect granted by this part. */
  x_effect?: string;
  /** Resolution speed/priority of the X effect. */
  x_effect_speed?: number;
  /** Executable X effect script source (run by ScriptRunner). */
  x_effect_script?: string;
  /** 1 if the X effect jams the opponent's support. */
  x_effect_is_jamming?: number;
  /** 1 if the X effect changes the attack used. */
  x_effect_changes_attack?: number;
  /**
   * Equip-time additive correction to X attack power (e.g. -200), floored at 0.
   * Counters use -9990 to pin X power to 0 (no bonus can lift it back up).
   */
  x_power_delta?: number;
  /** Human-readable support effect granted by this part. */
  support?: string;
  /** Resolution speed/priority of the support effect. */
  support_speed?: number;
  /** Executable support effect script source (run by ScriptRunner). */
  support_script?: string;
  /** 1 if the support effect jams the opponent's support. */
  support_effect_is_jamming?: number;
  /** 1 if the support effect changes the attack used. */
  support_effect_changes_attack?: number;
}

/** All 128 DigiParts. Index === id. */
export const DIGIPARTS: DigiPart[] = [
  { id: 0, name: "HP +50", group: "hp" },
  { id: 1, name: "HP +100", group: "hp" },
  { id: 2, name: "HP +150", group: "hp" },
  { id: 3, name: "HP +200", group: "hp" },
  { id: 4, name: "HP +300", group: "hp" },
  { id: 5, name: "HP +400", group: "hp" },
  { id: 6, name: "HP +500", group: "hp" },
  { id: 7, name: "All Attack +50", group: "all_atk" },
  { id: 8, name: "All Attack +100", group: "all_atk" },
  { id: 9, name: "All Attack +200", group: "all_atk" },
  { id: 10, name: "○ +100", group: "circle" },
  { id: 11, name: "○ +150", group: "circle" },
  { id: 12, name: "○ +200", group: "circle" },
  { id: 13, name: "○ +250", group: "circle" },
  { id: 14, name: "○ +300", group: "circle" },
  { id: 15, name: "△ +50", group: "triangle" },
  { id: 16, name: "△ +100", group: "triangle" },
  { id: 17, name: "△ +150", group: "triangle" },
  { id: 18, name: "△ +200", group: "triangle" },
  { id: 19, name: "△ +250", group: "triangle" },
  { id: 20, name: "✕ +50", group: "cross" },
  { id: 21, name: "✕ +200", group: "cross" },
  { id: 22, name: "✕ +150", group: "cross" },
  { id: 23, name: "✕ +200", group: "cross" },
  {
    id: 24,
    name: "○ → 0 ✕−100",
    group: "cross_eff",
    x_effect: "○ to 0.",
    x_effect_speed: 1,
    x_effect_script: 'opponent.c_power = 0;',
    x_effect_is_jamming: 0,
    x_effect_changes_attack: 0,
    x_power_delta: -100,
  },
  {
    id: 25,
    name: "△ → 0 ✕−100",
    group: "cross_eff",
    x_effect: "△ to 0.",
    x_effect_speed: 1,
    x_effect_script: 'opponent.t_power = 0;',
    x_effect_is_jamming: 0,
    x_effect_changes_attack: 0,
    x_power_delta: -100,
  },
  {
    id: 26,
    name: "✕ → 0 ✕−100",
    group: "cross_eff",
    x_effect: "✕ to 0.",
    x_effect_speed: 1,
    x_effect_script: 'opponent.x_power = 0;',
    x_effect_is_jamming: 0,
    x_effect_changes_attack: 0,
    x_power_delta: -100,
  },
  {
    id: 27,
    name: "Counter ○ ✕ → 0",
    group: "cross_eff",
    x_effect: "○ Counter.",
    x_effect_speed: 1,
    x_effect_script: 'own.is_countering.push("c");',
    x_effect_is_jamming: 0,
    x_effect_changes_attack: 0,
    x_power_delta: -9990,
  },
  {
    id: 28,
    name: "Counter △ ✕ → 0",
    group: "cross_eff",
    x_effect: "△ Counter.",
    x_effect_speed: 1,
    x_effect_script: 'own.is_countering.push("t");',
    x_effect_is_jamming: 0,
    x_effect_changes_attack: 0,
    x_power_delta: -9990,
  },
  {
    id: 29,
    name: "Counter ✕ ✕ → 0",
    group: "cross_eff",
    x_effect: "✕ Counter.",
    x_effect_speed: 1,
    x_effect_script: 'own.is_countering.push("x");',
    x_effect_is_jamming: 0,
    x_effect_changes_attack: 0,
    x_power_delta: -9990,
  },
  {
    id: 30,
    name: "Opp Fire×3 ✕−200",
    group: "cross_eff",
    x_effect: "Fire Foe x3.",
    x_effect_speed: 1,
    x_effect_script:
      'if (opponent.specialty === "Fire") { own.x_power = own.x_power * 3; }',
    x_effect_is_jamming: 0,
    x_effect_changes_attack: 0,
    x_power_delta: -200,
  },
  {
    id: 31,
    name: "Opp Ice×3 ✕−200",
    group: "cross_eff",
    x_effect: "Ice Foe x3.",
    x_effect_speed: 1,
    x_effect_script:
      'if (opponent.specialty === "Ice") { own.x_power = own.x_power * 3; }',
    x_effect_is_jamming: 0,
    x_effect_changes_attack: 0,
    x_power_delta: -200,
  },
  {
    id: 32,
    name: "Opp Nature×3 ✕−200",
    group: "cross_eff",
    x_effect: "Nature Foe x3.",
    x_effect_speed: 1,
    x_effect_script:
      'if (opponent.specialty === "Nature") { own.x_power = own.x_power * 3; }',
    x_effect_is_jamming: 0,
    x_effect_changes_attack: 0,
    x_power_delta: -200,
  },
  {
    id: 33,
    name: "Opp Darkness×3 ✕−200",
    group: "cross_eff",
    x_effect: "Darkness Foe x3.",
    x_effect_speed: 1,
    x_effect_script:
      'if (opponent.specialty === "Darkness") { own.x_power = own.x_power * 3; }',
    x_effect_is_jamming: 0,
    x_effect_changes_attack: 0,
    x_power_delta: -200,
  },
  {
    id: 34,
    name: "Opp Rare×3 ✕−200",
    group: "cross_eff",
    x_effect: "Rare Foe x3.",
    x_effect_speed: 1,
    x_effect_script:
      'if (opponent.specialty === "Rare") { own.x_power = own.x_power * 3; }',
    x_effect_is_jamming: 0,
    x_effect_changes_attack: 0,
    x_power_delta: -200,
  },
  {
    id: 35,
    name: "1st Attack ✕−100",
    group: "cross_eff",
    x_effect: "1st Attack.",
    x_effect_speed: 2,
    x_effect_script: 'own.is_first_attack = true;',
    x_effect_is_jamming: 0,
    x_effect_changes_attack: 0,
    x_power_delta: -100,
  },
  {
    id: 36,
    name: "Jamming Sup ✕−100",
    group: "cross_eff",
    x_effect: "Jamming.",
    x_effect_speed: 3,
    x_effect_script: 'own.jamming = true;',
    x_effect_is_jamming: 1,
    x_effect_changes_attack: 0,
    x_power_delta: -100,
  },
  {
    id: 37,
    name: "Eat-up HP ✕−200",
    group: "cross_eff",
    x_effect: "Eat-Up HP.",
    x_effect_speed: 2,
    x_effect_script: 'own.is_absorbing = true;',
    x_effect_is_jamming: 0,
    x_effect_changes_attack: 0,
    x_power_delta: -200,
  },
  { id: 38, name: "DP +10", group: "dp" },
  { id: 39, name: "DP +20", group: "dp" },
  { id: 40, name: "DP +30", group: "dp" },
  {
    id: 41,
    name: "Sup Boost Atk +50",
    group: "support_eff",
    support: "Boost own Attack Power +50.",
    support_speed: 1,
    support_script: 'own.c_power += 50; own.t_power += 50; own.x_power += 50;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 42,
    name: "Sup Boost Atk +100",
    group: "support_eff",
    support: "Boost own Attack Power +100.",
    support_speed: 1,
    support_script: 'own.c_power += 100; own.t_power += 100; own.x_power += 100;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 43,
    name: "Sup Boost Atk +200",
    group: "support_eff",
    support: "Boost own Attack Power +200.",
    support_speed: 1,
    support_script: 'own.c_power += 200; own.t_power += 200; own.x_power += 200;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 44,
    name: "Sup Boost Atk +300",
    group: "support_eff",
    support: "Boost own Attack Power +300.",
    support_speed: 1,
    support_script: 'own.c_power += 300; own.t_power += 300; own.x_power += 300;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 45,
    name: "Sup Atk Doubled",
    group: "support_eff",
    support: "Own Attack Power is doubled.",
    support_speed: 1,
    support_script: 'own.c_power *= 2; own.t_power *= 2; own.x_power *= 2;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 46,
    name: "Sup ○ +300",
    group: "support_eff",
    support: "Boost own ○ Attack Power +300.",
    support_speed: 1,
    support_script: 'own.c_power += 300;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 47,
    name: "Sup ○ +400",
    group: "support_eff",
    support: "Boost own ○ Attack Power +400.",
    support_speed: 1,
    support_script: 'own.c_power += 400;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 48,
    name: "Sup ○ +500",
    group: "support_eff",
    support: "Boost own ○ Attack Power +500.",
    support_speed: 1,
    support_script: 'own.c_power += 500;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 49,
    name: "Sup ○ Doubled",
    group: "support_eff",
    support: "Own ○ Attack Power is doubled.",
    support_speed: 1,
    support_script: 'own.c_power *= 2;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 50,
    name: "Sup ○ Tripled",
    group: "support_eff",
    support: "Own ○ Attack Power is tripled.",
    support_speed: 1,
    support_script: 'own.c_power *= 3;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 51,
    name: "Sup △ +200",
    group: "support_eff",
    support: "Boost own △ Attack Power +200.",
    support_speed: 1,
    support_script: 'own.t_power += 200;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 52,
    name: "Sup △ +300",
    group: "support_eff",
    support: "Boost own △ Attack Power +300.",
    support_speed: 1,
    support_script: 'own.t_power += 300;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 53,
    name: "Sup △ +400",
    group: "support_eff",
    support: "Boost own △ Attack Power +400.",
    support_speed: 1,
    support_script: 'own.t_power += 400;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 54,
    name: "Sup △ Doubled",
    group: "support_eff",
    support: "Own △ Attack Power is doubled.",
    support_speed: 1,
    support_script: 'own.t_power *= 2;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 55,
    name: "Sup △ Tripled",
    group: "support_eff",
    support: "Own △ Attack Power is tripled.",
    support_speed: 1,
    support_script: 'own.t_power *= 3;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 56,
    name: "Sup ✕ +100",
    group: "support_eff",
    support: "Boost own ✕ Attack Power +100.",
    support_speed: 1,
    support_script: 'own.x_power += 100;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 57,
    name: "Sup ✕ +200",
    group: "support_eff",
    support: "Boost own ✕ Attack Power +200.",
    support_speed: 1,
    support_script: 'own.x_power += 200;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 58,
    name: "Sup ✕ +300",
    group: "support_eff",
    support: "Boost own ✕ Attack Power +300.",
    support_speed: 1,
    support_script: 'own.x_power += 300;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 59,
    name: "Sup ✕ Doubled",
    group: "support_eff",
    support: "Own ✕ Attack Power is doubled.",
    support_speed: 1,
    support_script: 'own.x_power *= 2;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 60,
    name: "Sup ✕ Tripled",
    group: "support_eff",
    support: "Own ✕ Attack Power is tripled.",
    support_speed: 1,
    support_script: 'own.x_power *= 3;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 61,
    name: "Sup Atk = HP",
    group: "support_eff",
    support: "Own Attack Power becomes own HP.",
    support_speed: 2,
    support_script: 'own.is_crashing = true;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 62,
    name: "Sup 1st Attack",
    group: "support_eff",
    support: "1st Attack.",
    support_speed: 1,
    support_script: 'own.is_first_attack = true;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 63,
    name: "Sup Eat-up HP",
    group: "support_eff",
    support: "Eat-Up HP.",
    support_speed: 2,
    support_script: 'own.is_absorbing = true;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 64,
    name: "Sup Lower Opp ○ → 0",
    group: "support_eff",
    support: "Lower opponent's ○ Attack Power to 0.",
    support_speed: 1,
    support_script: 'opponent.c_power = 0;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 65,
    name: "Sup Lower Opp △ → 0",
    group: "support_eff",
    support: "Lower opponent's △ Attack Power to 0.",
    support_speed: 1,
    support_script: 'opponent.t_power = 0;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 66,
    name: "Sup Lower Opp ✕ → 0",
    group: "support_eff",
    support: "Lower opponent's ✕ Attack Power to 0.",
    support_speed: 1,
    support_script: 'opponent.x_power = 0;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 67,
    name: "Sup Counter ○",
    group: "support_eff",
    support: "○ Counterattack.",
    support_speed: 1,
    support_script: 'own.is_countering.push("c");',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 68,
    name: "Sup Counter △",
    group: "support_eff",
    support: "△ Counterattack.",
    support_speed: 1,
    support_script: 'own.is_countering.push("t");',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 69,
    name: "Sup Counter ✕",
    group: "support_eff",
    support: "✕ Counterattack.",
    support_speed: 1,
    support_script: 'own.is_countering.push("x");',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 70,
    name: "Sup Fire Opp ×2 Atk",
    group: "support_eff",
    support: "If opponent's Specialty is Fire, own Attack Power is doubled.",
    support_speed: 1,
    support_script: 'if (opponent.specialty === "Fire") { own.c_power *= 2; own.t_power *= 2; own.x_power *= 2; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 71,
    name: "Sup Fire Opp ×3 Atk",
    group: "support_eff",
    support: "If opponent's Specialty is Fire, own Attack Power is tripled.",
    support_speed: 1,
    support_script: 'if (opponent.specialty === "Fire") { own.c_power *= 3; own.t_power *= 3; own.x_power *= 3; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 72,
    name: "Sup Ice Opp ×2 Atk",
    group: "support_eff",
    support: "If opponent's Specialty is Ice, own Attack Power is doubled.",
    support_speed: 1,
    support_script: 'if (opponent.specialty === "Ice") { own.c_power *= 2; own.t_power *= 2; own.x_power *= 2; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 73,
    name: "Sup Ice Opp ×3 Atk",
    group: "support_eff",
    support: "If opponent's Specialty is Ice, own Attack Power is tripled.",
    support_speed: 1,
    support_script: 'if (opponent.specialty === "Ice") { own.c_power *= 3; own.t_power *= 3; own.x_power *= 3; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 74,
    name: "Sup Nature Opp ×2 Atk",
    group: "support_eff",
    support: "If opponent's Specialty is Nature, own Attack Power is doubled.",
    support_speed: 1,
    support_script: 'if (opponent.specialty === "Nature") { own.c_power *= 2; own.t_power *= 2; own.x_power *= 2; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 75,
    name: "Sup Nature Opp ×3 Atk",
    group: "support_eff",
    support: "If opponent's Specialty is Nature, own Attack Power is tripled.",
    support_speed: 1,
    support_script: 'if (opponent.specialty === "Nature") { own.c_power *= 3; own.t_power *= 3; own.x_power *= 3; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 76,
    name: "Sup Darkness Opp ×2 Atk",
    group: "support_eff",
    support: "If opponent's Specialty is Darkness, own Attack Power is doubled.",
    support_speed: 1,
    support_script: 'if (opponent.specialty === "Darkness") { own.c_power *= 2; own.t_power *= 2; own.x_power *= 2; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 77,
    name: "Sup Darkness Opp ×3 Atk",
    group: "support_eff",
    support: "If opponent's Specialty is Darkness, own Attack Power is tripled.",
    support_speed: 1,
    support_script: 'if (opponent.specialty === "Darkness") { own.c_power *= 3; own.t_power *= 3; own.x_power *= 3; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 78,
    name: "Sup Rare Opp ×2 Atk",
    group: "support_eff",
    support: "If opponent's Specialty is Rare, own Attack Power is doubled.",
    support_speed: 1,
    support_script: 'if (opponent.specialty === "Rare") { own.c_power *= 2; own.t_power *= 2; own.x_power *= 2; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 79,
    name: "Sup Rare Opp ×3 Atk",
    group: "support_eff",
    support: "If opponent's Specialty is Rare, own Attack Power is tripled.",
    support_speed: 1,
    support_script: 'if (opponent.specialty === "Rare") { own.c_power *= 3; own.t_power *= 3; own.x_power *= 3; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 80,
    name: "Sup Change Spe → Fire",
    group: "support_eff",
    support: "Change own Specialty to Fire.",
    support_speed: 2,
    support_script: 'own.specialty = "Fire";',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 81,
    name: "Sup Change Spe → Ice",
    group: "support_eff",
    support: "Change own Specialty to Ice.",
    support_speed: 2,
    support_script: 'own.specialty = "Ice";',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 82,
    name: "Sup Change Spe → Nature",
    group: "support_eff",
    support: "Change own Specialty to Nature.",
    support_speed: 2,
    support_script: 'own.specialty = "Nature";',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 83,
    name: "Sup Change Spe → Darkness",
    group: "support_eff",
    support: "Change own Specialty to Darkness.",
    support_speed: 2,
    support_script: 'own.specialty = "Darkness";',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 84,
    name: "Sup Change Spe → Rare",
    group: "support_eff",
    support: "Change own Specialty to Rare.",
    support_speed: 2,
    support_script: 'own.specialty = "Rare";',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 85,
    name: "Sup Switch Opp Spe → Own",
    group: "support_eff",
    support: "Change own Specialty to opponent's Specialty.",
    support_speed: 2,
    support_script: 'own.specialty = opponent.specialty;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 86,
    name: "Sup Swap Spe",
    group: "support_eff",
    support: "Swap own and opponent's Specialties.",
    support_speed: 2,
    support_script: 'const _s = own.specialty; own.specialty = opponent.specialty; opponent.specialty = _s;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 87,
    name: "Sup Lower Opp if Fire → 0",
    group: "support_eff",
    support: "If opponent's Specialty is Fire, lower opponent's Attack Power to 0.",
    support_speed: 1,
    support_script: 'if (opponent.specialty === "Fire") { opponent.c_power = 0; opponent.t_power = 0; opponent.x_power = 0; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 88,
    name: "Sup Lower Opp if Ice → 0",
    group: "support_eff",
    support: "If opponent's Specialty is Ice, lower opponent's Attack Power to 0.",
    support_speed: 1,
    support_script: 'if (opponent.specialty === "Ice") { opponent.c_power = 0; opponent.t_power = 0; opponent.x_power = 0; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 89,
    name: "Sup Lower Opp if Nature → 0",
    group: "support_eff",
    support: "If opponent's Specialty is Nature, lower opponent's Attack Power to 0.",
    support_speed: 1,
    support_script: 'if (opponent.specialty === "Nature") { opponent.c_power = 0; opponent.t_power = 0; opponent.x_power = 0; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 90,
    name: "Sup Lower Opp if Dark → 0",
    group: "support_eff",
    support: "If opponent's Specialty is Darkness, lower opponent's Attack Power to 0.",
    support_speed: 1,
    support_script: 'if (opponent.specialty === "Darkness") { opponent.c_power = 0; opponent.t_power = 0; opponent.x_power = 0; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 91,
    name: "Sup Lower Opp if Rare → 0",
    group: "support_eff",
    support: "If opponent's Specialty is Rare, lower opponent's Attack Power to 0.",
    support_speed: 1,
    support_script: 'if (opponent.specialty === "Rare") { opponent.c_power = 0; opponent.t_power = 0; opponent.x_power = 0; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 92,
    name: "Sup Both Atk → 0",
    group: "support_eff",
    support: "Both Attack Powers become 0.",
    support_speed: 2,
    support_script: 'own.c_power = 0; own.t_power = 0; own.x_power = 0; opponent.c_power = 0; opponent.t_power = 0; opponent.x_power = 0;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 93,
    name: "Sup If R Atk+200",
    group: "support_eff",
    support: "If own level is R, boost own Attack Power +200.",
    support_speed: 1,
    support_script: 'if (own.level === "R") { own.c_power += 200; own.t_power += 200; own.x_power += 200; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 94,
    name: "Sup If C Atk+300",
    group: "support_eff",
    support: "If own level is C, boost own Attack Power +300.",
    support_speed: 1,
    support_script: 'if (own.level === "C") { own.c_power += 300; own.t_power += 300; own.x_power += 300; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 95,
    name: "Sup If U Atk+400",
    group: "support_eff",
    support: "If own level is U, boost own Attack Power +400.",
    support_speed: 1,
    support_script: 'if (own.level === "U") { own.c_power += 400; own.t_power += 400; own.x_power += 400; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 96,
    name: "Sup Opp Uses ○",
    group: "support_eff",
    support: "Opponent uses ○.",
    support_speed: 2,
    support_script: 'opponent.selected_attack = "c";',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 1,
  },
  {
    id: 97,
    name: "Sup Opp Uses △",
    group: "support_eff",
    support: "Opponent uses △.",
    support_speed: 2,
    support_script: 'opponent.selected_attack = "t";',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 1,
  },
  {
    id: 98,
    name: "Sup Opp Uses ✕",
    group: "support_eff",
    support: "Opponent uses ✕.",
    support_speed: 2,
    support_script: 'opponent.selected_attack = "x";',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 1,
  },
  {
    id: 99,
    name: "Sup Opp Uses Same",
    group: "support_eff",
    support: "Opponent uses the same attack as own.",
    support_speed: 2,
    support_script: 'opponent.selected_attack = own.selected_attack;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 1,
  },
  {
    id: 100,
    name: "Sup Recover HP+200",
    group: "support_eff",
    support: "Recover own HP by +200.",
    support_speed: 2,
    support_script: 'own.hp += 200;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 101,
    name: "Sup Recover HP+300",
    group: "support_eff",
    support: "Recover own HP by +300.",
    support_speed: 2,
    support_script: 'own.hp += 300;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 102,
    name: "Sup Recover HP+400",
    group: "support_eff",
    support: "Recover own HP by +400.",
    support_speed: 2,
    support_script: 'own.hp += 400;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 103,
    name: "Sup Halve Atk Recover+400",
    group: "support_eff",
    support: "Halve own Attack Power, recover own HP by +400.",
    support_speed: 2,
    support_script: 'own.c_power = Math.floor(own.c_power / 2); own.t_power = Math.floor(own.t_power / 2); own.x_power = Math.floor(own.x_power / 2); own.hp += 400;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 104,
    name: "Sup Halve Atk Recover+600",
    group: "support_eff",
    support: "Halve own Attack Power, recover own HP by +600.",
    support_speed: 2,
    support_script: 'own.c_power = Math.floor(own.c_power / 2); own.t_power = Math.floor(own.t_power / 2); own.x_power = Math.floor(own.x_power / 2); own.hp += 600;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 105,
    name: "Sup If HP< Opp HP+500",
    group: "support_eff",
    support: "If own HP are less than opponent's, recover own HP by +500.",
    support_speed: 2,
    support_script: 'if (own.hp < opponent.hp) { own.hp += 500; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 106,
    name: "Sup If HP< Opp HP+700",
    group: "support_eff",
    support: "If own HP are less than opponent's, recover own HP by +700.",
    support_speed: 2,
    support_script: 'if (own.hp < opponent.hp) { own.hp += 700; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 107,
    name: "Sup Revive HP 300",
    group: "support_eff",
    support: "Digimon KO'd in battle revives with 300 HP. Battle is still lost.",
    support_speed: 1,
    support_script: 'own.is_reviving = 300;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 108,
    name: "Sup Revive HP 600",
    group: "support_eff",
    support: "Digimon KO'd in battle revives with 600 HP. Battle is still lost.",
    support_speed: 1,
    support_script: 'own.is_reviving = 600;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 109,
    name: "Sup Revive HP 1000",
    group: "support_eff",
    support: "Digimon KO'd in battle revives with 1000 HP. Battle is still lost.",
    support_speed: 1,
    support_script: 'own.is_reviving = 1000;',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 110,
    name: "Sup Drop 1 Opp Hand",
    group: "support_eff",
    support: "Opponent discards 1 Card from Hand.",
    support_speed: 2,
    support_script: 'commands.push("move-card|opponent|hand|trash|1|top");',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 111,
    name: "Sup Drop 2 Opp Hand",
    group: "support_eff",
    support: "Opponent discards 2 Cards from Hand.",
    support_speed: 2,
    support_script: 'commands.push("move-card|opponent|hand|trash|2|top");',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 112,
    name: "Sup Drop 2 Opp DP Shown",
    group: "support_eff",
    support: "Discard 2 of opponent's DP Cards shown in DP Slot.",
    support_speed: 2,
    support_script: 'commands.push("move-card|opponent|dp|trash|2|top");',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 113,
    name: "Sup Drop 3 Opp DP Shown",
    group: "support_eff",
    support: "Discard 3 of opponent's DP Cards shown in DP Slot.",
    support_speed: 2,
    support_script: 'commands.push("move-card|opponent|dp|trash|3|top");',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 114,
    name: "Sup Drop 4 Opp DP Shown",
    group: "support_eff",
    support: "Discard 4 of opponent's DP Cards shown in DP Slot.",
    support_speed: 2,
    support_script: 'commands.push("move-card|opponent|dp|trash|4|top");',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 115,
    name: "Sup Drop 2 Opp Online",
    group: "support_eff",
    support: "Discard 2 Cards from opponent's Online Deck.",
    support_speed: 2,
    support_script: 'commands.push("move-card|opponent|deck|trash|2|top");',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 116,
    name: "Sup Drop 3 Opp Online",
    group: "support_eff",
    support: "Discard 3 Cards from opponent's Online Deck.",
    support_speed: 2,
    support_script: 'commands.push("move-card|opponent|deck|trash|3|top");',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 117,
    name: "Sup Move Offline Top → Online",
    group: "support_eff",
    support: "Return the most recently trashed Card to the Online Deck, then shuffle.",
    support_speed: 2,
    support_script:
      'commands.push("move-card|own|trash|deck|1|bottom"); commands.push("shuffle|own|deck");',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 118,
    name: "Sup Void Opp Support",
    group: "support_eff",
    support: "Opponent's Support Effect is voided.",
    support_speed: 3,
    support_script: 'opponent.support_voided = true;',
    support_effect_is_jamming: 1,
    support_effect_changes_attack: 0,
  },
  {
    id: 119,
    name: "Sup Draw to 4",
    group: "support_eff",
    support: "Draw until own Hand has 4 Cards.",
    support_speed: 2,
    support_script: 'commands.push("draw-card|own|" + Math.max(0, 4 - own.hand_count));',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 120,
    name: "Sup Draw Partner Card",
    group: "support_eff",
    support: "Draw Partner Cards from the Online Deck until Hand is full.",
    support_speed: 2,
    support_script: 'commands.push("draw-partner|own|" + Math.max(0, 4 - own.hand_count));',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 121,
    name: "Sup If R HP+200 Atk+100",
    group: "support_eff",
    support: "If own level is R, recover own HP +200 and boost own Attack Power +100.",
    support_speed: 2,
    support_script: 'if (own.level === "R") { own.hp += 200; own.c_power += 100; own.t_power += 100; own.x_power += 100; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  {
    id: 122,
    name: "Sup If A HP+200 Atk+100",
    group: "support_eff",
    support: "If own level is A, recover own HP +200 and boost own Attack Power +100.",
    support_speed: 2,
    support_script: 'if (own.level === "A") { own.hp += 200; own.c_power += 100; own.t_power += 100; own.x_power += 100; }',
    support_effect_is_jamming: 0,
    support_effect_changes_attack: 0,
  },
  { id: 123, name: "Boost EXP 10%", group: "s_exp" },
  { id: 124, name: "Boost EXP 20%", group: "s_exp" },
  { id: 125, name: "Boost EXP 30%", group: "s_exp" },
  { id: 126, name: "Rare Card May Appear", group: "s_rare" },
  { id: 127, name: "Rare Card More Likely", group: "s_rare" },
];

/**
 * Looks up a DigiPart by its id.
 *
 * @param id - The DigiPart id (0–127).
 * @returns The matching DigiPart, or undefined if not found.
 *
 * @example
 * const part = getDigiPartById(0); // { id: 0, name: "HP +50", ... }
 */
export function getDigiPartById(id: number): DigiPart | undefined {
  return DIGIPARTS[id];
}

/** The X-effect subset of a card a cross_eff DigiPart can correct. */
export interface XEffectFields {
  x_effect: string;
  x_effect_speed: number;
  x_effect_script: string;
  x_effect_is_jamming: number;
  x_effect_changes_attack: number;
}

/**
 * Applies an equipped cross_eff DigiPart's correction to a base X effect and
 * cross attack power. The part's effect fields override the card's, and the
 * power is adjusted by `x_power_delta` (floored at 0; counters use -9990 to pin
 * it to 0). With no part, the base values are returned unchanged.
 *
 * @param base - The card's base X-effect fields.
 * @param baseXPower - The card's cross attack power (penalties/bonuses already applied).
 * @param part - The equipped cross_eff DigiPart, if any.
 */
export function correctXEffect(
  base: XEffectFields,
  baseXPower: number,
  part: DigiPart | undefined,
): XEffectFields & { x_power: number } {
  if (!part) return { ...base, x_power: baseXPower };
  const x_power =
    part.x_power_delta !== undefined ? Math.max(0, baseXPower + part.x_power_delta) : baseXPower;
  return {
    x_effect: part.x_effect ?? base.x_effect,
    x_effect_speed: part.x_effect_speed ?? base.x_effect_speed,
    x_effect_script: part.x_effect_script ?? base.x_effect_script,
    x_effect_is_jamming: part.x_effect_is_jamming ?? base.x_effect_is_jamming,
    x_effect_changes_attack: part.x_effect_changes_attack ?? base.x_effect_changes_attack,
    x_power,
  };
}

/** The support-effect subset of a card a support_eff DigiPart can correct. */
export interface SupportEffectFields {
  support: string;
  support_speed: number;
  support_script: string;
  support_effect_is_jamming: number;
  support_effect_changes_attack: number;
}

/**
 * Applies an equipped support_eff DigiPart's correction by overriding the
 * card's support-effect fields. With no part, the base is returned unchanged.
 */
export function correctSupportEffect(
  base: SupportEffectFields,
  part: DigiPart | undefined,
): SupportEffectFields {
  if (!part) return base;
  return {
    support: part.support ?? base.support,
    support_speed: part.support_speed ?? base.support_speed,
    support_script: part.support_script ?? base.support_script,
    support_effect_is_jamming: part.support_effect_is_jamming ?? base.support_effect_is_jamming,
    support_effect_changes_attack:
      part.support_effect_changes_attack ?? base.support_effect_changes_attack,
  };
}

/** Passive stat bonus totals contributed by stat-group DigiParts. */
export interface DigipartStatBonus {
  hp: number;
  circle: number;
  triangle: number;
  cross: number;
}

/** Parses the "+N" magnitude embedded in a stat part's name (0 if none). */
function parseStatValue(name: string): number {
  const m = /\+(\d+)/.exec(name);
  return m ? parseInt(m[1]!, 10) : 0;
}

/** Sums the HP/attack bonuses granted by the equipped stat-group DigiParts. */
export function computeDigipartStatBonuses(equippedIds: number[]): DigipartStatBonus {
  let hp = 0, circle = 0, triangle = 0, cross = 0;
  for (const id of equippedIds) {
    const p = DIGIPARTS[id];
    if (!p) continue;
    const v = parseStatValue(p.name);
    switch (p.group) {
      case "hp": hp += v; break;
      case "all_atk": circle += v; triangle += v; cross += v; break;
      case "circle": circle += v; break;
      case "triangle": triangle += v; break;
      case "cross": cross += v; break;
    }
  }
  return { hp, circle, triangle, cross };
}

/** The partner growth/loadout data needed to correct a battle card. */
export interface PartnerLoadout {
  equippedDigiparts: number[];
  bonusHp: number;
  bonusCircle: number;
  bonusTriangle: number;
  bonusCross: number;
}

/** Clamp a stat onto the 0–9990 grid (mirrors battle-context STAT_MAX). */
function capStat(v: number): number {
  return Math.max(0, Math.min(9990, v));
}

/**
 * Returns a copy of `card` corrected by the partner's growth and DigiParts:
 * HP / attack powers gain the level-up bonuses and stat-DigiPart bonuses, and
 * the X effect + cross power / support effect are overridden by any equipped
 * cross_eff / support_eff part. Used for the partner Rookie and its armor cards
 * before a battle so the engine plays the partner at its true, upgraded values.
 *
 * @param card - The base card (partner Rookie or its armor).
 * @param partner - The partner's equipped DigiParts and level-up stat bonuses.
 */
export function correctPartnerCard(
  card: MasterCard,
  partner: PartnerLoadout,
): MasterCard {
  const ids = partner.equippedDigiparts;
  const parts = ids
    .map((id) => DIGIPARTS[id])
    .filter((p): p is DigiPart => p !== undefined);
  const xPart = parts.find((p) => p.group === "cross_eff");
  const supPart = parts.find((p) => p.group === "support_eff");
  const stat = computeDigipartStatBonuses(ids);

  const corrected: MasterCard = { ...card };
  // Stat bonuses (level-up + stat DigiParts) apply to HP and all attack powers.
  corrected.hp = capStat(card.hp + partner.bonusHp + stat.hp);
  corrected.c_pow = capStat(card.c_pow + partner.bonusCircle + stat.circle);
  corrected.t_pow = capStat(card.t_pow + partner.bonusTriangle + stat.triangle);
  let xPow = capStat(card.x_pow + partner.bonusCross + stat.cross);

  if (xPart) {
    const x = correctXEffect(
      {
        x_effect: card.x_effect,
        x_effect_speed: card.x_effect_speed,
        x_effect_script: card.x_effect_script,
        x_effect_is_jamming: card.x_effect_is_jamming,
        x_effect_changes_attack: card.x_effect_changes_attack,
      },
      xPow,
      xPart,
    );
    corrected.x_effect = x.x_effect;
    corrected.x_effect_speed = x.x_effect_speed;
    corrected.x_effect_script = x.x_effect_script;
    corrected.x_effect_is_jamming = x.x_effect_is_jamming;
    corrected.x_effect_changes_attack = x.x_effect_changes_attack;
    xPow = x.x_power;
  }
  corrected.x_pow = xPow;

  if (supPart) {
    const s = correctSupportEffect(
      {
        support: card.support,
        support_speed: card.support_speed,
        support_script: card.support_script,
        support_effect_is_jamming: card.support_effect_is_jamming,
        support_effect_changes_attack: card.support_effect_changes_attack,
      },
      supPart,
    );
    corrected.support = s.support;
    corrected.support_speed = s.support_speed;
    corrected.support_script = s.support_script;
    corrected.support_effect_is_jamming = s.support_effect_is_jamming;
    corrected.support_effect_changes_attack = s.support_effect_changes_attack;
  }
  return corrected;
}
