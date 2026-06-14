/**
 * Partner Digimon definitions, EXP/level utilities, and per-partner
 * level-up progression tables.
 *
 * Partners are the six Rookie Digimon that players raise through battle
 * experience. Each partner has its own level-up progression that defines
 * which stat (+10 HP/Circle/Triangle/Cross) or DigiPart id is awarded at
 * each of the 98 level transitions (Lv 1→2 through Lv 98→99).
 *
 * 80 of the 98 level-ups grant a stat boost. The remaining 18 grant a
 * DigiPart (occurring at every 5th transition: to levels 5, 10, …, 90).
 * Stat boosts cycle hp→circle→triangle→cross across the 80 stat levels,
 * so each stat is boosted exactly 20 times (+200 total, the maximum).
 */

// ---------------------------------------------------------------------------
// Partner identity types
// ---------------------------------------------------------------------------

/** All valid partner ids — one per partner Rookie, canonical order. */
export type PartnerId =
  | "veemon"
  | "hawkmon"
  | "armadillomon"
  | "patamon"
  | "gatomon"
  | "wormmon";

/** Canonical order matching the DigiPart minLevel tuple indices (0..5). */
export const PARTNER_ORDER: PartnerId[] = [
  "veemon",
  "hawkmon",
  "armadillomon",
  "patamon",
  "gatomon",
  "wormmon",
];

/** Static data describing one partner Digimon. */
export interface PartnerDef {
  /** Unique identifier. */
  id: PartnerId;
  /** Display name. */
  name: string;
  /** Rookie card number in master-cards (e.g. "175"). */
  cardNumber: string;
  /** Armor card numbers (from src/data/armor.ts PARTNER_ARMORS). */
  armorNumbers: string[];
}

// ---------------------------------------------------------------------------
// EXP / Level progression
// ---------------------------------------------------------------------------

/** Maximum level a partner can reach. */
export const PARTNER_MAX_LEVEL = 99;

/** Maximum total accumulated EXP (reached at level 99). */
export const PARTNER_MAX_EXP = 9999;

/**
 * EXP required to advance from level N to level N+1.
 * Index k = transition from level (k+1) to (k+2). 98 entries.
 *
 *   k=0 →  8  (Lv1→Lv2)
 *   k=1 →  7  (Lv2→Lv3)
 *   k=2 →  9  (Lv3→Lv4)
 *   k≥3 → 5 + 2k
 *
 * Sum = 8+7+9 + Σ(5+2k, k=3..97) = 24 + 9975 = 9999 ✓
 */
export const PARTNER_EXP_TABLE: readonly number[] = Object.freeze(
  Array.from({ length: 98 }, (_, k) => {
    if (k === 0) return 8;
    if (k === 1) return 7;
    if (k === 2) return 9;
    return 5 + 2 * k;
  }),
);

// ---------------------------------------------------------------------------
// Level-up reward types
// ---------------------------------------------------------------------------

/** A single stat boost granted when a partner levels up. */
export interface StatReward {
  type: "stat";
  stat: "hp" | "circle" | "triangle" | "cross";
}

/** A DigiPart granted when a partner levels up. */
export interface DigiPartReward {
  type: "digipart";
  id: number;
}

/** Reward granted at a single level-up transition. */
export type LevelUpReward = StatReward | DigiPartReward;

/**
 * Exactly 98 level-up rewards for one partner:
 * entry[k] = reward when leveling from (k+1) to (k+2).
 *
 * Invariants (enforced by {@link buildProgression}):
 * - Exactly 80 stat rewards, 18 DigiPart rewards.
 * - Stat rewards cycle hp→circle→triangle→cross (20× each, +200 max per stat).
 * - DigiPart rewards occur at transitions k=4,9,14,…,89 (to levels 5,10,…,90).
 */
export type PartnerProgression = readonly LevelUpReward[];

// ---------------------------------------------------------------------------
// Progression builder
// ---------------------------------------------------------------------------

const STAT_CYCLE = ["hp", "circle", "triangle", "cross"] as const;

/**
 * Builds the 98-entry progression array for one partner.
 *
 * @param milestoneDigiparts - Exactly 18 DigiPart ids, one per milestone
 *   transition (to levels 5, 10, 15, …, 90 in that order).
 */
function buildProgression(milestoneDigiparts: readonly number[]): PartnerProgression {
  let milestoneIdx = 0;
  let statIdx = 0;
  return Object.freeze(
    Array.from({ length: 98 }, (_, k): LevelUpReward => {
      // Milestone: every 5th transition, for levels up to 90 (k=4,9,...,89).
      if (k % 5 === 4 && k < 90) {
        return { type: "digipart", id: milestoneDigiparts[milestoneIdx++]! };
      }
      // Stat boost: cycle hp→circle→triangle→cross across the 80 non-null slots.
      return { type: "stat", stat: STAT_CYCLE[statIdx++ % 4]! };
    }),
  );
}

// ---------------------------------------------------------------------------
// Per-partner progressions
//
// Each partner's 18 milestone DigiPart ids are chosen from their own column
// in the DigiPart table, progressing from early-game basics to late-game
// powerful parts. DigiPart ids 0–127 — see src/data/digiparts.ts.
//
// Milestone schedule: transitions TO levels 5, 10, 15, 20, 25, 30, 35, 40,
//                     45, 50, 55, 60, 65, 70, 75, 80, 85, 90.
// ---------------------------------------------------------------------------

/** Veemon — Dragon/Courage. Balanced; strong circle and HP growth. */
const VEEMON_PROGRESSION = buildProgression([
  /* →lv5  */ 72,  // Sup Ice Opp ×2
  /* →lv10 */ 11,  // Circle +150
  /* →lv15 */ 51,  // Sup Tri +200
  /* →lv20 */ 123, // Boost EXP 10%
  /* →lv25 */ 31,  // Opp Ice×3 Cross−200
  /* →lv30 */ 83,  // Change Spe→Darkness
  /* →lv35 */ 22,  // Cross +150
  /* →lv40 */ 29,  // Counter Cross → Cross→0
  /* →lv45 */ 3,   // HP +200
  /* →lv50 */ 74,  // Sup Nature Opp ×2
  /* →lv55 */ 48,  // Sup Circ +500
  /* →lv60 */ 73,  // Sup Ice Opp ×3
  /* →lv65 */ 120, // Sup Draw Partner Card
  /* →lv70 */ 126, // Rare Card May Appear
  /* →lv75 */ 9,   // All Atk +200
  /* →lv80 */ 125, // Boost EXP 30%
  /* →lv85 */ 124, // Boost EXP 20%
  /* →lv90 */ 101, // Sup Recover HP+300
]);

/** Hawkmon — Bird/Sincerity. Triangle focus; specialty manipulation. */
const HAWKMON_PROGRESSION = buildProgression([
  /* →lv5  */ 0,   // HP +50
  /* →lv10 */ 41,  // Sup Boost Atk +50
  /* →lv15 */ 100, // Sup Recover HP+200
  /* →lv20 */ 103, // Sup Halve Atk Recover+400
  /* →lv25 */ 90,  // Sup Lower Opp if Dark→0
  /* →lv30 */ 46,  // Sup Circ +300
  /* →lv35 */ 80,  // Change Spe→Fire
  /* →lv40 */ 56,  // Sup Cross +100
  /* →lv45 */ 119, // Sup Draw to 4
  /* →lv50 */ 35,  // 1st Attack Cross−100
  /* →lv55 */ 62,  // Sup 1st Attack
  /* →lv60 */ 77,  // Sup Darkness Opp ×3
  /* →lv65 */ 124, // Boost EXP 20%
  /* →lv70 */ 53,  // Sup Tri +400
  /* →lv75 */ 91,  // Sup Lower Opp if Rare→0
  /* →lv80 */ 120, // Sup Draw Partner Card
  /* →lv85 */ 126, // Rare Card May Appear
  /* →lv90 */ 127, // Rare Card More Likely
]);

/** Armadillomon — Earth/Reliability. Cross and HP focus; DP boosts. */
const ARMADILLOMON_PROGRESSION = buildProgression([
  /* →lv5  */ 69,  // Sup Counter Cross
  /* →lv10 */ 56,  // Sup Cross +100
  /* →lv15 */ 10,  // Circle +100
  /* →lv20 */ 21,  // Cross +200
  /* →lv25 */ 25,  // Triangle→0 Cross−100
  /* →lv30 */ 81,  // Change Spe→Ice
  /* →lv35 */ 115, // Sup Drop 2 Opp Online
  /* →lv40 */ 57,  // Sup Cross +200
  /* →lv45 */ 47,  // Sup Circ +400
  /* →lv50 */ 37,  // Eat-up HP Cross−200
  /* →lv55 */ 62,  // Sup 1st Attack (via Aquilamon)
  /* →lv60 */ 58,  // Sup Cross +300
  /* →lv65 */ 91,  // Sup Lower Opp if Rare→0
  /* →lv70 */ 117, // Sup Move Offline Top→Online
  /* →lv75 */ 75,  // Sup Nature Opp ×3
  /* →lv80 */ 63,  // Sup Eat-up HP
  /* →lv85 */ 55,  // Sup Tri Tripled
  /* →lv90 */ 60,  // Sup Cross Tripled
]);

/** Patamon — Angel/Hope. Recover focus; level-rank bonuses. */
const PATAMON_PROGRESSION = buildProgression([
  /* →lv5  */ 10,  // Circle +100
  /* →lv10 */ 100, // Sup Recover HP+200
  /* →lv15 */ 51,  // Sup Tri +200
  /* →lv20 */ 119, // Sup Draw to 4
  /* →lv25 */ 70,  // Sup Fire Opp ×2
  /* →lv30 */ 107, // Sup Revive HP 300
  /* →lv35 */ 66,  // Sup Lower Opp Cross→0
  /* →lv40 */ 29,  // Counter Cross → Cross→0
  /* →lv45 */ 52,  // Sup Tri +300
  /* →lv50 */ 74,  // Sup Nature Opp ×2
  /* →lv55 */ 102, // Sup Recover HP+400 (via Angewomon)
  /* →lv60 */ 108, // Sup Revive HP 600
  /* →lv65 */ 109, // Sup Revive HP 1000
  /* →lv70 */ 121, // Sup If R HP+200 Atk+100
  /* →lv75 */ 71,  // Sup Fire Opp ×3
  /* →lv80 */ 63,  // Sup Eat-up HP
  /* →lv85 */ 95,  // Sup If U Atk+400
  /* →lv90 */ 122, // Sup If A HP+200 Atk+100
]);

/** Gatomon — Cat/Light. Specialty; support nullification; recovery. */
const GATOMON_PROGRESSION = buildProgression([
  /* →lv5  */ 15,  // Triangle +50
  /* →lv10 */ 26,  // Cross→0 Cross−100
  /* →lv15 */ 90,  // Sup Lower Opp if Dark→0
  /* →lv20 */ 41,  // Sup Boost Atk +50
  /* →lv25 */ 42,  // Sup Boost Atk +100
  /* →lv30 */ 7,   // All Atk +50
  /* →lv35 */ 24,  // Circle→0 Cross−100
  /* →lv40 */ 82,  // Change Spe→Nature
  /* →lv45 */ 88,  // Sup Lower Opp if Ice→0
  /* →lv50 */ 59,  // Sup Cross Doubled
  /* →lv55 */ 102, // Sup Recover HP+400
  /* →lv60 */ 104, // Sup Halve Atk Recover+600
  /* →lv65 */ 109, // Sup Revive HP 1000
  /* →lv70 */ 77,  // Sup Darkness Opp ×3
  /* →lv75 */ 83,  // Change Spe→Darkness
  /* →lv80 */ 126, // Rare Card May Appear
  /* →lv85 */ 55,  // Sup Tri Tripled
  /* →lv90 */ 127, // Rare Card More Likely
]);

/** Wormmon — Insect/Kindness. Cross; counter; on-specialty boosts. */
const WORMMON_PROGRESSION = buildProgression([
  /* →lv5  */ 20,  // Cross +50
  /* →lv10 */ 56,  // Sup Cross +100
  /* →lv15 */ 16,  // Triangle +100
  /* →lv20 */ 41,  // Sup Boost Atk +50
  /* →lv25 */ 34,  // Opp Rare×3 Cross−200
  /* →lv30 */ 83,  // Change Spe→Darkness
  /* →lv35 */ 42,  // Sup Boost Atk +100
  /* →lv40 */ 59,  // Sup Cross Doubled
  /* →lv45 */ 57,  // Sup Cross +200
  /* →lv50 */ 74,  // Sup Nature Opp ×2
  /* →lv55 */ 63,  // Sup Eat-up HP
  /* →lv60 */ 75,  // Sup Nature Opp ×3
  /* →lv65 */ 60,  // Sup Cross Tripled
  /* →lv70 */ 76,  // Sup Darkness Opp ×2
  /* →lv75 */ 9,   // All Atk +200
  /* →lv80 */ 125, // Boost EXP 30%
  /* →lv85 */ 90,  // Sup Lower Opp if Dark→0
  /* →lv90 */ 84,  // Change Spe→Rare
]);

/**
 * Per-partner level-up progression (98 rewards each).
 * Index into the tuple matches {@link PARTNER_ORDER}.
 */
export const PARTNER_PROGRESSIONS: Record<PartnerId, PartnerProgression> = {
  veemon:       VEEMON_PROGRESSION,
  hawkmon:      HAWKMON_PROGRESSION,
  armadillomon: ARMADILLOMON_PROGRESSION,
  patamon:      PATAMON_PROGRESSION,
  gatomon:      GATOMON_PROGRESSION,
  wormmon:      WORMMON_PROGRESSION,
};

// ---------------------------------------------------------------------------
// EXP helper functions
// ---------------------------------------------------------------------------

/**
 * Returns the cumulative EXP required to reach `level` from level 1.
 * Level 1 costs 0 EXP; level 99 costs 9999.
 */
export function partnerExpForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(PARTNER_MAX_LEVEL, level));
  let total = 0;
  for (let k = 0; k < clamped - 1; k++) total += PARTNER_EXP_TABLE[k]!;
  return total;
}

/** Returns the current level given total accumulated EXP (1–99). */
export function partnerLevelFromExp(totalExp: number): number {
  const clamped = Math.max(0, Math.min(PARTNER_MAX_EXP, totalExp));
  let level = 1;
  let accumulated = 0;
  for (let k = 0; k < PARTNER_EXP_TABLE.length; k++) {
    accumulated += PARTNER_EXP_TABLE[k]!;
    if (accumulated > clamped) break;
    level++;
  }
  return Math.min(level, PARTNER_MAX_LEVEL);
}

/** EXP earned within the current level (progress-bar numerator). */
export function partnerExpIntoLevel(totalExp: number): number {
  const level = partnerLevelFromExp(totalExp);
  if (level >= PARTNER_MAX_LEVEL) return 0;
  return totalExp - partnerExpForLevel(level);
}

/** EXP needed to advance to the next level (0 at max level). */
export function partnerExpToNextLevel(totalExp: number): number {
  const level = partnerLevelFromExp(totalExp);
  if (level >= PARTNER_MAX_LEVEL) return 0;
  return PARTNER_EXP_TABLE[level - 1]! - partnerExpIntoLevel(totalExp);
}

// ---------------------------------------------------------------------------
// Partner definitions
// ---------------------------------------------------------------------------

/** All six partners in canonical order. */
export const PARTNERS: PartnerDef[] = [
  { id: "veemon",       name: "Veemon",       cardNumber: "175", armorNumbers: ["172", "185", "173"] },
  { id: "hawkmon",      name: "Hawkmon",      cardNumber: "182", armorNumbers: ["179", "188"]        },
  { id: "armadillomon", name: "Armadillomon", cardNumber: "190", armorNumbers: ["189", "176"]        },
  { id: "patamon",      name: "Patamon",      cardNumber: "183", armorNumbers: ["180", "174"]        },
  { id: "gatomon",      name: "Gatomon",      cardNumber: "184", armorNumbers: ["181", "178"]        },
  { id: "wormmon",      name: "Wormmon",      cardNumber: "187", armorNumbers: ["186", "177"]        },
];

/** Finds the partner that owns the given Rookie card number. */
export function getPartnerByCard(cardNumber: string): PartnerDef | undefined {
  return PARTNERS.find((p) => p.cardNumber === cardNumber);
}

/** Returns the PartnerDef for the given id (throws on unknown id). */
export function getPartnerById(id: PartnerId): PartnerDef {
  const partner = PARTNERS.find((p) => p.id === id);
  if (!partner) throw new Error(`Unknown partner id: ${id}`);
  return partner;
}
