/**
 * DigiParts — stat upgrade items attached to Partner Digimon.
 *
 * Each DigiPart belongs to a group (determines equip-slot conflict rules),
 * and has a minimum partner level per partner index needed to equip it.
 * A value of 0 means the part is not available for that partner.
 *
 * Partner index order: 0=Veemon, 1=Hawkmon, 2=Armadillomon, 3=Patamon,
 * 4=Gatomon, 5=Wormmon.
 */

export type DigiPartGroup =
  | "hp"
  | "all_atk"
  | "circle"
  | "triangle"
  | "cross"
  | "cross_eff"
  | "dp"
  | "sup_boost"
  | "sup_circ"
  | "sup_tri"
  | "sup_cross"
  | "sup_spe"
  | "sup_lower"
  | "sup_counter"
  | "sup_recover"
  | "sup_revive"
  | "sup_discard"
  | "sup_draw"
  | "sup_misc"
  | "s_exp"
  | "s_rare";

export interface DigiPart {
  /** Unique id, 0-indexed, matches array position. */
  id: number;
  /** Display name shown in UI. */
  name: string;
  /** Functional group — two parts of the same group cannot be equipped simultaneously. */
  group: DigiPartGroup;
  /**
   * Minimum partner level required to equip, per partner index.
   * Index: 0=Veemon, 1=Hawkmon, 2=Armadillomon, 3=Patamon, 4=Gatomon, 5=Wormmon.
   * 0 means the part is unavailable for that partner.
   */
  minLevel: [number, number, number, number, number, number];
  /** How to obtain this part (if not from normal level-up). */
  otherMethod?: string;
}

/** All 128 DigiParts. Index === id. */
export const DIGIPARTS: DigiPart[] = [
  { id: 0, name: "HP +50", group: "hp", minLevel: [3, 5, 1, 3, 99, 7] },
  { id: 1, name: "HP +100", group: "hp", minLevel: [17, 16, 8, 14, 12, 19] },
  { id: 2, name: "HP +150", group: "hp", minLevel: [29, 32, 19, 32, 25, 33] },
  { id: 3, name: "HP +200", group: "hp", minLevel: [45, 48, 31, 52, 40, 59] },
  { id: 4, name: "HP +300", group: "hp", minLevel: [61, 67, 51, 68, 57, 78] },
  { id: 5, name: "HP +400", group: "hp", minLevel: [96, 89, 71, 91, 81, 88] },
  {
    id: 6,
    name: "HP +500",
    group: "hp",
    minLevel: [99, 0, 75, 0, 91, 95],
    otherMethod: "Fuse Vikemon to Armadillomon",
  },
  {
    id: 7,
    name: "All Attack +50",
    group: "all_atk",
    minLevel: [18, 39, 54, 57, 30, 28],
  },
  {
    id: 8,
    name: "All Attack +100",
    group: "all_atk",
    minLevel: [39, 86, 72, 89, 50, 51],
  },
  {
    id: 9,
    name: "All Attack +200",
    group: "all_atk",
    minLevel: [75, 0, 90, 0, 93, 84],
    otherMethod: "Fuse Imperialdramon to Veemon",
  },
  { id: 10, name: "○ +100", group: "circle", minLevel: [1, 9, 15, 4, 5, 2] },
  {
    id: 11,
    name: "○ +150",
    group: "circle",
    minLevel: [10, 21, 38, 16, 22, 15],
  },
  {
    id: 12,
    name: "○ +200",
    group: "circle",
    minLevel: [27, 54, 62, 39, 41, 30],
  },
  {
    id: 13,
    name: "○ +250",
    group: "circle",
    minLevel: [48, 0, 78, 62, 61, 61],
  },
  { id: 14, name: "○ +300", group: "circle", minLevel: [67, 0, 0, 82, 85, 79] },
  { id: 15, name: "△ +50", group: "triangle", minLevel: [4, 1, 12, 6, 2, 13] },
  {
    id: 16,
    name: "△ +100",
    group: "triangle",
    minLevel: [12, 7, 22, 18, 16, 29],
  },
  {
    id: 17,
    name: "△ +150",
    group: "triangle",
    minLevel: [32, 28, 45, 45, 36, 43],
  },
  {
    id: 18,
    name: "△ +200",
    group: "triangle",
    minLevel: [51, 44, 0, 67, 56, 66],
  },
  {
    id: 19,
    name: "△ +250",
    group: "triangle",
    minLevel: [77, 0, 0, 86, 76, 96],
  },
  { id: 20, name: "✕ +50", group: "cross", minLevel: [6, 6, 2, 10, 4, 1] },
  { id: 21, name: "✕ +200", group: "cross", minLevel: [19, 36, 20, 27, 19, 9] },
  {
    id: 22,
    name: "✕ +150",
    group: "cross",
    minLevel: [35, 69, 42, 53, 38, 24],
  },
  { id: 23, name: "✕ +200", group: "cross", minLevel: [82, 0, 63, 0, 67, 48] },
  {
    id: 24,
    name: "○ → 0 ✕−100",
    group: "cross_eff",
    minLevel: [24, 12, 4, 0, 14, 34],
  },
  {
    id: 25,
    name: "△ → 0 ✕−100",
    group: "cross_eff",
    minLevel: [46, 23, 9, 0, 35, 17],
  },
  {
    id: 26,
    name: "✕ → 0 ✕−100",
    group: "cross_eff",
    minLevel: [58, 71, 36, 0, 10, 71],
  },
  {
    id: 27,
    name: "Counter ○ ✕ → 0",
    group: "cross_eff",
    minLevel: [11, 26, 0, 40, 0, 62],
  },
  {
    id: 28,
    name: "Counter △ ✕ → 0",
    group: "cross_eff",
    minLevel: [36, 14, 0, 24, 0, 49],
  },
  {
    id: 29,
    name: "Counter ✕ ✕ → 0",
    group: "cross_eff",
    minLevel: [40, 57, 0, 11, 0, 21],
  },
  {
    id: 30,
    name: "Opp Fire×3 ✕−200",
    group: "cross_eff",
    minLevel: [87, 92, 39, 31, 69, 50],
  },
  {
    id: 31,
    name: "Opp Ice×3 ✕−200",
    group: "cross_eff",
    minLevel: [25, 97, 0, 77, 42, 73],
  },
  {
    id: 32,
    name: "Opp Nature×3 ✕−200",
    group: "cross_eff",
    minLevel: [37, 0, 66, 83, 0, 4],
  },
  {
    id: 33,
    name: "Opp Darkness×3 ✕−200",
    group: "cross_eff",
    minLevel: [68, 33, 46, 5, 21, 97],
  },
  {
    id: 34,
    name: "Opp Rare×3 ✕−200",
    group: "cross_eff",
    minLevel: [52, 41, 6, 0, 0, 25],
  },
  {
    id: 35,
    name: "1st Attack ✕−100",
    group: "cross_eff",
    minLevel: [76, 50, 95, 0, 62, 0],
    otherMethod: "Fuse MegaKabuterimon to Wormmon",
  },
  {
    id: 36,
    name: "Jamming Sup ✕−100",
    group: "cross_eff",
    minLevel: [0, 74, 27, 54, 0, 10],
  },
  {
    id: 37,
    name: "Eat-up HP ✕−200",
    group: "cross_eff",
    minLevel: [0, 87, 50, 73, 0, 0],
  },
  { id: 38, name: "DP +10", group: "dp", minLevel: [42, 4, 61, 9, 1, 0] },
  { id: 39, name: "DP +20", group: "dp", minLevel: [91, 29, 79, 21, 27, 0] },
  {
    id: 40,
    name: "DP +30",
    group: "dp",
    minLevel: [0, 98, 97, 78, 60, 85],
    otherMethod: "Fuse Seraphimon to Patamon",
  },
  {
    id: 41,
    name: "Sup Boost Atk +50",
    group: "sup_boost",
    minLevel: [2, 10, 13, 7, 3, 11],
  },
  {
    id: 42,
    name: "Sup Boost Atk +100",
    group: "sup_boost",
    minLevel: [21, 42, 56, 36, 33, 35],
  },
  {
    id: 43,
    name: "Sup Boost Atk +200",
    group: "sup_boost",
    minLevel: [26, 81, 73, 84, 46, 44],
  },
  {
    id: 44,
    name: "Sup Boost Atk +300",
    group: "sup_boost",
    minLevel: [69, 0, 84, 0, 82, 80],
  },
  {
    id: 45,
    name: "Sup Atk Doubled",
    group: "sup_boost",
    minLevel: [0, 0, 0, 0, 0, 0],
    otherMethod: "Defeat Nanimon five times",
  },
  {
    id: 46,
    name: "Sup ○ +300",
    group: "sup_circ",
    minLevel: [8, 30, 47, 26, 17, 12],
  },
  {
    id: 47,
    name: "Sup ○ +400",
    group: "sup_circ",
    minLevel: [34, 77, 74, 46, 47, 39],
  },
  {
    id: 48,
    name: "Sup ○ +500",
    group: "sup_circ",
    minLevel: [55, 0, 88, 66, 88, 74],
    otherMethod: "Fuse MasterTyrannomon to Veemon",
  },
  {
    id: 49,
    name: "Sup ○ Doubled",
    group: "sup_circ",
    minLevel: [13, 64, 67, 33, 58, 63],
  },
  {
    id: 50,
    name: "Sup ○ Tripled",
    group: "sup_circ",
    minLevel: [59, 0, 94, 0, 74, 86],
    otherMethod: "Fuse AeroVeedramon to Patamon",
  },
  {
    id: 51,
    name: "Sup △ +200",
    group: "sup_tri",
    minLevel: [15, 2, 0, 22, 7, 18],
  },
  {
    id: 52,
    name: "Sup △ +300",
    group: "sup_tri",
    minLevel: [28, 19, 0, 41, 23, 36],
  },
  {
    id: 53,
    name: "Sup △ +400",
    group: "sup_tri",
    minLevel: [43, 70, 0, 59, 92, 53],
    otherMethod: "Fuse Phoenixmon to Hawkmon",
  },
  {
    id: 54,
    name: "Sup △ Doubled",
    group: "sup_tri",
    minLevel: [22, 13, 59, 0, 34, 67],
  },
  {
    id: 55,
    name: "Sup △ Tripled",
    group: "sup_tri",
    minLevel: [83, 0, 91, 0, 94, 89],
    otherMethod: "Fuse Wizardmon to Gatomon",
  },
  {
    id: 56,
    name: "Sup ✕ +100",
    group: "sup_cross",
    minLevel: [23, 40, 10, 0, 18, 8],
  },
  {
    id: 57,
    name: "Sup ✕ +200",
    group: "sup_cross",
    minLevel: [38, 58, 40, 0, 43, 20],
  },
  {
    id: 58,
    name: "Sup ✕ +300",
    group: "sup_cross",
    minLevel: [71, 0, 60, 0, 63, 90],
    otherMethod: "Fuse SuperStarmon to Armadillomon",
  },
  {
    id: 59,
    name: "Sup ✕ Doubled",
    group: "sup_cross",
    minLevel: [44, 72, 48, 0, 51, 40],
  },
  {
    id: 60,
    name: "Sup ✕ Tripled",
    group: "sup_cross",
    minLevel: [88, 0, 85, 0, 95, 65],
    otherMethod: "Fuse Piedmon to Wormmon",
  },
  {
    id: 61,
    name: "Sup Atk = HP",
    group: "sup_boost",
    minLevel: [0, 0, 0, 0, 0, 0],
    otherMethod: "Defeat Davis nine times",
  },
  {
    id: 62,
    name: "Sup 1st Attack",
    group: "sup_misc",
    minLevel: [53, 55, 98, 85, 71, 0],
    otherMethod: "Fuse Aquilamon to Hawkmon",
  },
  {
    id: 63,
    name: "Sup Eat-up HP",
    group: "sup_misc",
    minLevel: [0, 93, 80, 61, 0, 55],
    otherMethod: "Fuse Stingmon to Wormmon",
  },
  {
    id: 64,
    name: "Sup Lower Opp ○ → 0",
    group: "sup_lower",
    minLevel: [54, 0, 17, 28, 0, 75],
  },
  {
    id: 65,
    name: "Sup Lower Opp △ → 0",
    group: "sup_lower",
    minLevel: [84, 24, 28, 15, 0, 0],
  },
  {
    id: 66,
    name: "Sup Lower Opp ✕ → 0",
    group: "sup_lower",
    minLevel: [0, 66, 24, 13, 0, 45],
  },
  {
    id: 67,
    name: "Sup Counter ○",
    group: "sup_counter",
    minLevel: [7, 0, 33, 47, 0, 14],
  },
  {
    id: 68,
    name: "Sup Counter △",
    group: "sup_counter",
    minLevel: [33, 17, 0, 37, 0, 26],
  },
  {
    id: 69,
    name: "Sup Counter ✕",
    group: "sup_counter",
    minLevel: [47, 43, 5, 0, 0, 37],
  },
  {
    id: 70,
    name: "Sup Fire Opp ×2 Atk",
    group: "sup_spe",
    minLevel: [74, 79, 0, 25, 77, 38],
  },
  {
    id: 71,
    name: "Sup Fire Opp ×3 Atk",
    group: "sup_spe",
    minLevel: [0, 91, 0, 74, 65, 82],
    otherMethod: "Fuse MetalGarurumon to Patamon",
  },
  {
    id: 72,
    name: "Sup Ice Opp ×2 Atk",
    group: "sup_spe",
    minLevel: [5, 47, 64, 80, 26, 76],
  },
  {
    id: 73,
    name: "Sup Ice Opp ×3 Atk",
    group: "sup_spe",
    minLevel: [60, 0, 89, 98, 83, 91],
    otherMethod: "Fuse Paildramon to Veemon",
  },
  {
    id: 74,
    name: "Sup Nature Opp ×2 Atk",
    group: "sup_spe",
    minLevel: [50, 27, 58, 42, 59, 6],
  },
  {
    id: 75,
    name: "Sup Nature Opp ×3 Atk",
    group: "sup_spe",
    minLevel: [79, 0, 93, 93, 0, 70],
    otherMethod: "Fuse Diaboromon to Wormmon",
  },
  {
    id: 76,
    name: "Sup Darkness Opp ×2 Atk",
    group: "sup_spe",
    minLevel: [56, 37, 44, 19, 6, 93],
  },
  {
    id: 77,
    name: "Sup Darkness Opp ×3 Atk",
    group: "sup_spe",
    minLevel: [92, 60, 87, 63, 79, 0],
    otherMethod: "Fuse Sylphymon to Hawkmon",
  },
  {
    id: 78,
    name: "Sup Rare Opp ×2 Atk",
    group: "sup_spe",
    minLevel: [78, 76, 26, 69, 72, 46],
  },
  {
    id: 79,
    name: "Sup Rare Opp ×3 Atk",
    group: "sup_spe",
    minLevel: [89, 96, 55, 0, 0, 68],
    otherMethod: "Fuse Ankylomon to Armadillomon",
  },
  {
    id: 80,
    name: "Sup Change Spe → Fire",
    group: "sup_spe",
    minLevel: [9, 35, 0, 96, 48, 0],
  },
  {
    id: 81,
    name: "Sup Change Spe → Ice",
    group: "sup_spe",
    minLevel: [0, 99, 30, 58, 87, 0],
  },
  {
    id: 82,
    name: "Sup Change Spe → Nature",
    group: "sup_spe",
    minLevel: [97, 3, 41, 12, 8, 94],
  },
  {
    id: 83,
    name: "Sup Change Spe → Darkness",
    group: "sup_spe",
    minLevel: [30, 0, 68, 81, 98, 3],
  },
  {
    id: 84,
    name: "Sup Change Spe → Rare",
    group: "sup_spe",
    minLevel: [95, 82, 14, 76, 52, 99],
  },
  {
    id: 85,
    name: "Sup Switch Opp Spe → Own",
    group: "sup_spe",
    minLevel: [0, 0, 0, 0, 0, 0],
    otherMethod: "Defeat Keely six times",
  },
  {
    id: 86,
    name: "Sup Swap Spe",
    group: "sup_spe",
    minLevel: [0, 0, 0, 0, 0, 0],
    otherMethod: "Defeat Cody six times",
  },
  {
    id: 87,
    name: "Sup Lower Opp if Fire → 0",
    group: "sup_spe",
    minLevel: [66, 52, 0, 43, 97, 0],
  },
  {
    id: 88,
    name: "Sup Lower Opp if Ice → 0",
    group: "sup_spe",
    minLevel: [41, 61, 34, 8, 84, 0],
  },
  {
    id: 89,
    name: "Sup Lower Opp if Nature → 0",
    group: "sup_spe",
    minLevel: [0, 11, 52, 64, 0, 24],
  },
  {
    id: 90,
    name: "Sup Lower Opp if Dark → 0",
    group: "sup_spe",
    minLevel: [0, 25, 37, 2, 13, 72],
  },
  {
    id: 91,
    name: "Sup Lower Opp if Rare → 0",
    group: "sup_spe",
    minLevel: [0, 75, 16, 34, 0, 52],
  },
  {
    id: 92,
    name: "Sup Both Atk → 0",
    group: "sup_misc",
    minLevel: [0, 0, 0, 0, 0, 0],
    otherMethod: "Defeat T.K. six times",
  },
  {
    id: 93,
    name: "Sup If R Atk+200",
    group: "sup_misc",
    minLevel: [14, 31, 0, 48, 9, 23],
  },
  {
    id: 94,
    name: "Sup If C Atk+300",
    group: "sup_misc",
    minLevel: [31, 53, 0, 28, 20, 57],
  },
  {
    id: 95,
    name: "Sup If U Atk+400",
    group: "sup_misc",
    minLevel: [57, 0, 81, 95, 70, 77],
    otherMethod: "Fuse MagnaAngemon to Patamon",
  },
  {
    id: 96,
    name: "Sup Opp Uses ○",
    group: "sup_misc",
    minLevel: [16, 62, 0, 97, 28, 31],
  },
  {
    id: 97,
    name: "Sup Opp Uses △",
    group: "sup_misc",
    minLevel: [62, 18, 11, 0, 39, 47],
  },
  {
    id: 98,
    name: "Sup Opp Uses ✕",
    group: "sup_misc",
    minLevel: [94, 8, 21, 44, 0, 58],
  },
  {
    id: 99,
    name: "Sup Opp Uses Same",
    group: "sup_misc",
    minLevel: [0, 0, 0, 0, 0, 0],
    otherMethod: "Defeat GranKuwagamon 5× in a row without leaving Battle Cafe",
  },
  {
    id: 100,
    name: "Sup Recover HP+200",
    group: "sup_recover",
    minLevel: [72, 15, 32, 1, 11, 81],
  },
  {
    id: 101,
    name: "Sup Recover HP+300",
    group: "sup_recover",
    minLevel: [90, 38, 53, 17, 31, 0],
  },
  {
    id: 102,
    name: "Sup Recover HP+400",
    group: "sup_recover",
    minLevel: [0, 68, 92, 55, 73, 0],
    otherMethod: "Fuse Angewomon to Gatomon",
  },
  {
    id: 103,
    name: "Sup Halve Atk Recover+400",
    group: "sup_recover",
    minLevel: [93, 20, 43, 23, 15, 0],
  },
  {
    id: 104,
    name: "Sup Halve Atk Recover+600",
    group: "sup_recover",
    minLevel: [0, 46, 86, 60, 44, 0],
    otherMethod: "Fuse Lillymon to Gatomon",
  },
  {
    id: 105,
    name: "Sup If HP< Opp HP+500",
    group: "sup_recover",
    minLevel: [98, 59, 23, 29, 37, 0],
  },
  {
    id: 106,
    name: "Sup If HP< Opp HP+700",
    group: "sup_recover",
    minLevel: [0, 83, 69, 56, 53, 0],
  },
  {
    id: 107,
    name: "Sup Revive HP 300",
    group: "sup_revive",
    minLevel: [49, 34, 0, 30, 24, 42],
  },
  {
    id: 108,
    name: "Sup Revive HP 600",
    group: "sup_revive",
    minLevel: [0, 63, 0, 49, 49, 64],
  },
  {
    id: 109,
    name: "Sup Revive HP 1000",
    group: "sup_revive",
    minLevel: [0, 94, 0, 65, 64, 98],
    otherMethod: "Fuse Rosemon to Gatomon",
  },
  {
    id: 110,
    name: "Sup Drop 1 Opp Hand",
    group: "sup_discard",
    minLevel: [63, 22, 3, 75, 45, 27],
  },
  {
    id: 111,
    name: "Sup Drop 2 Opp Hand",
    group: "sup_discard",
    minLevel: [0, 78, 25, 92, 0, 56],
  },
  {
    id: 112,
    name: "Sup Drop 2 Opp DP Shown",
    group: "sup_discard",
    minLevel: [0, 56, 18, 35, 86, 5],
  },
  {
    id: 113,
    name: "Sup Drop 3 Opp DP Shown",
    group: "sup_discard",
    minLevel: [0, 88, 49, 90, 0, 32],
  },
  {
    id: 114,
    name: "Sup Drop 4 Opp DP Shown",
    group: "sup_discard",
    minLevel: [0, 0, 0, 0, 0, 0],
    otherMethod: "Defeat Ken six times",
  },
  {
    id: 115,
    name: "Sup Drop 2 Opp Online",
    group: "sup_discard",
    minLevel: [0, 51, 7, 0, 29, 16],
  },
  {
    id: 116,
    name: "Sup Drop 3 Opp Online",
    group: "sup_discard",
    minLevel: [0, 95, 35, 0, 89, 54],
  },
  {
    id: 117,
    name: "Sup Move Offline Top → Online",
    group: "sup_draw",
    minLevel: [86, 0, 70, 50, 78, 0],
    otherMethod: "Fuse Zudomon to Armadillomon",
  },
  {
    id: 118,
    name: "Sup Void Opp Support",
    group: "sup_misc",
    minLevel: [0, 84, 65, 87, 0, 69],
    otherMethod: "Fuse Shakkoumon to Armadillomon",
  },
  {
    id: 119,
    name: "Sup Draw to 4",
    group: "sup_draw",
    minLevel: [64, 45, 29, 20, 54, 0],
  },
  {
    id: 120,
    name: "Sup Draw Partner Card",
    group: "sup_draw",
    minLevel: [65, 80, 82, 72, 68, 0],
    otherMethod: "Fuse ExVeemon to Veemon",
  },
  {
    id: 121,
    name: "Sup If R HP+200 Atk+100",
    group: "sup_misc",
    minLevel: [73, 73, 0, 94, 55, 83],
    otherMethod: "Fuse Angemon to Patamon",
  },
  {
    id: 122,
    name: "Sup If A HP+200 Atk+100",
    group: "sup_misc",
    minLevel: [81, 0, 76, 79, 66, 87],
    otherMethod: "Fuse Valkyrimon to Hawkmon",
  },
  {
    id: 123,
    name: "Boost EXP 10%",
    group: "s_exp",
    minLevel: [20, 49, 57, 71, 32, 41],
  },
  {
    id: 124,
    name: "Boost EXP 20%",
    group: "s_exp",
    minLevel: [85, 65, 77, 88, 75, 92],
    otherMethod: "Fuse Garudamon to Hawkmon",
  },
  {
    id: 125,
    name: "Boost EXP 30%",
    group: "s_exp",
    minLevel: [80, 0, 96, 99, 90, 60],
    otherMethod: "Fuse GranKuwagamon to Wormmon",
  },
  {
    id: 126,
    name: "Rare Card May Appear",
    group: "s_rare",
    minLevel: [70, 85, 83, 51, 80, 0],
    otherMethod: "Fuse WarGreymon to Veemon",
  },
  {
    id: 127,
    name: "Rare Card More Likely",
    group: "s_rare",
    minLevel: [0, 90, 99, 70, 96, 0],
    otherMethod: "Fuse Magnadramon to Gatomon",
  },
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
