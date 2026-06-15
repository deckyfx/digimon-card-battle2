import { CardSpecialty, CardType, type MasterCard } from "@src/types";
import { PARTNERS } from "@src/data/partners";
import type { PlayerProfile } from "@src/store/profile-store";

/** Score required to win a match (mirrors game-engine.ts WIN_SCORE). */
const WIN_SCORE = 3;

/** S-Jewel card numbers (273–284, twelve cards). */
const S_JEWEL_NUMBERS = new Set(
  Array.from({ length: 12 }, (_, i) => String(273 + i)),
);

/** Outcome of one battle round from the player's perspective. */
export interface RoundRecord {
  playerAttack: "c" | "t" | "x";
  playerGambled: boolean;
  playerUsedSupport: boolean;
  playerWon: boolean;
  opponentWon: boolean;
  opponentDigimonLevel: string;
}

/** Minimal snapshot of a player's end-of-match state for bonus evaluation. */
export interface MatchEndState {
  deckLeft: number;
  handLeft: number;
  score: number;
}

/**
 * Stats accumulated over the course of one match.
 * Attached to `GameEngine` and mutated by tracking hooks throughout play.
 */
export interface BattleStats {
  /** Full 30-card starting deck — never mutated after creation. */
  originalPlayerDeck: MasterCard[];
  /** Rookie + armor card numbers for all of the player's partners. */
  partnerCardNumbers: Set<string>;
  playerName: string;

  rounds: RoundRecord[];
  /** Set by a forced no-Digimon redraw OR a voluntary mulligan. */
  hadForcedRedraw: boolean;
  /** Set the first time the player digivolves (natural or option). */
  hadAnyDigivolve: boolean;
  /**
   * `card.specialty` of every Digimon the player deployed or naturally /
   * option-digivolved into. Effect-based specialty overrides are NOT tracked.
   */
  specialtiesDeployed: Set<CardSpecialty>;
  fourOfAKindAchieved: boolean;
  dpFullAchieved: boolean;
  partnerWin: boolean;
  ultimateLevelWin: boolean;
  damageFeverAchieved: boolean;
  hpFeverAchieved: boolean;
  justEnoughAttackAchieved: boolean;
  threePartnersInHand: boolean;
  /** Partner Rookie card numbers that were actually committed to the field. */
  partnerCardNumbersDeployed: Set<string>;
  partnerNormalDigivolvedToU: boolean;

  /** Internal: active natural-digivolve chain per partner Rookie card number. */
  _partnerChain: Map<string, { level: "R" | "C" | "U"; usedOption: boolean }>;
}

/** One line in the post-match EXP breakdown shown to the player. */
export interface ExpBonusLine {
  key: string;
  name: string;
  exp: number;
}

/** Create a zeroed {@link BattleStats} for a new match. */
export function createBattleStats(
  originalPlayerDeck: MasterCard[],
  partnerCardNumbers: Set<string>,
  playerName: string,
): BattleStats {
  return {
    originalPlayerDeck,
    partnerCardNumbers,
    playerName,
    rounds: [],
    hadForcedRedraw: false,
    hadAnyDigivolve: false,
    specialtiesDeployed: new Set(),
    fourOfAKindAchieved: false,
    dpFullAchieved: false,
    partnerWin: false,
    ultimateLevelWin: false,
    damageFeverAchieved: false,
    hpFeverAchieved: false,
    justEnoughAttackAchieved: false,
    threePartnersInHand: false,
    partnerCardNumbersDeployed: new Set(),
    partnerNormalDigivolvedToU: false,
    _partnerChain: new Map(),
  };
}

/**
 * Evaluate all 31 performance bonuses and return only the ones that triggered.
 * Does NOT include the Base EXP line — the caller prepends that.
 */
export function computeExpBonuses(
  stats: BattleStats,
  player: MatchEndState,
  opponent: MatchEndState,
  profile: PlayerProfile,
): ExpBonusLine[] {
  const won = player.score >= WIN_SCORE;
  const lost = opponent.score >= WIN_SCORE;
  const rounds = stats.rounds;
  const n = rounds.length;
  // Rounds where a score was assigned to either side.
  const scored = rounds.filter((r) => r.playerWon || r.opponentWon);

  const bonuses: ExpBonusLine[] = [];
  const push = (key: string, name: string, exp: number) =>
    bonuses.push({ key, name, exp });

  // ─── Win-condition bonuses ────────────────────────────────────────────────

  if (won && n > 0 && rounds.every((r) => r.playerAttack === "c"))
    push("all_o_win", "All ○ Attack Win", 3);

  if (won && n > 0 && rounds.every((r) => r.playerAttack === "t"))
    push("all_t_win", "All △ Attack Win", 3);

  if (won && n > 0 && rounds.every((r) => r.playerAttack === "x"))
    push("all_x_win", "All × Attack Win", 3);

  if (won && n > 0 && rounds.every((r) => r.playerGambled))
    push("all_gamble_win", "All or Nothing Gamble Win", 5);

  if (won && n > 0 && rounds[n - 1]!.playerGambled)
    push("last_gamble_win", "Last Chance Gamble Win", 2);

  if (won && rounds.every((r) => !r.playerUsedSupport))
    push("no_support_win", "No Support Card Win", 5);

  if (won && !stats.hadAnyDigivolve) push("no_digivolve_win", "No Digivolve Win", 3);

  if (won && !stats.hadForcedRedraw) push("no_discard_win", "No Discard Win", 1);

  if (won && stats.fourOfAKindAchieved) push("four_kind_win", "4-of-a-Kind Win", 5);

  if (won && opponent.deckLeft === 0 && player.deckLeft > 0)
    push("zero_online_win", "0 Online Card Left Win", 2);

  if (won && stats.partnerWin) push("partner_win", "Partner Win", 1);

  // No Loss Win: player's score after every scored round was never 0 while
  // opponent's grew — simplest check: opponent never scored (3-0 win).
  if (won && opponent.score === 0) push("no_loss_win", "No Loss Win", 3);

  // Come-Back Win: 3-2 finish where opponent won the first 2 scored rounds.
  const comebackWon =
    won &&
    player.score === WIN_SCORE &&
    opponent.score === WIN_SCORE - 1 &&
    scored.length >= 5 &&
    !scored[0]!.playerWon &&
    scored[0]!.opponentWon &&
    !scored[1]!.playerWon &&
    scored[1]!.opponentWon &&
    !!scored[2]!.playerWon &&
    !!scored[3]!.playerWon &&
    !!scored[4]!.playerWon;

  if (comebackWon) push("comeback_win", "Come-Back Win", 3);

  if (
    comebackWon &&
    player.deckLeft + player.handLeft === 0 &&
    opponent.deckLeft + opponent.handLeft === 0
  )
    push("desperate_win", "Desperate Win", 7);

  if (won && player.deckLeft + player.handLeft === 0)
    push("all_gone_win", "All Gone Win", 2);

  if (won && stats.ultimateLevelWin) push("ultimate_win", "Ultimate Level Win", 3);

  const optionCount = stats.originalPlayerDeck.filter(
    (c) => c.type === CardType.Option,
  ).length;
  if (won && optionCount >= 25) push("option_maniac_win", "Option Maniac Win", 5);

  if (won && stats.dpFullAchieved) push("dp_full_win", "8 DP Cards Win", 8);

  if (won && player.deckLeft === 7) push("lucky_seven_win", "Lucky Seven Win", 1);

  if (won && stats.justEnoughAttackAchieved)
    push("just_enough_win", "Just Enough Attack Win", 3);

  const hasAllSJewels = [...S_JEWEL_NUMBERS].every((num) =>
    stats.originalPlayerDeck.some((c) => c.number === num),
  );
  if (won && hasAllSJewels) push("sjewel_win", "12 S-Jewel Cards Win", 10);

  // ─── Loss-condition bonuses ───────────────────────────────────────────────

  // Choked Loss: player won first 2 scored rounds, then lost.
  if (
    lost &&
    player.score === WIN_SCORE - 1 &&
    opponent.score === WIN_SCORE &&
    scored.length >= 5 &&
    !!scored[0]!.playerWon &&
    !!scored[1]!.playerWon &&
    !scored[2]!.playerWon &&
    scored[2]!.opponentWon &&
    !scored[3]!.playerWon &&
    scored[3]!.opponentWon &&
    !scored[4]!.playerWon &&
    scored[4]!.opponentWon
  )
    push("choked_loss", "Choked Loss", 2);

  if (lost && n > 0 && rounds[n - 1]!.playerGambled)
    push("gamble_loss", "Loss by Gamble", 2);

  if (lost && player.score === 0) push("total_loss", "Total Loss", 1);

  // ─── Always-applicable bonuses ────────────────────────────────────────────

  // Rainbow: all 5 Digimon specialties deployed (None/Option excluded naturally).
  const DIGIMON_SPECIALTIES = 5; // Fire / Ice / Nature / Darkness / Rare
  if (stats.specialtiesDeployed.size >= DIGIMON_SPECIALTIES)
    push("rainbow", "Rainbow", 2);

  if (stats.damageFeverAchieved) push("damage_fever", "Damage Fever", 10);

  if (stats.hpFeverAchieved) push("hp_fever", "HP Fever", 7);

  if (stats.threePartnersInHand) push("three_partners", "3 Partners", 2);

  // 3 Partners Plus: all of the profile's partner Rookies were deployed.
  const profilePartnerRookieNums = profile.partners
    .map((ps) => PARTNERS.find((p) => p.id === ps.id)?.cardNumber)
    .filter((num): num is string => num !== undefined);
  if (
    profilePartnerRookieNums.length >= 3 &&
    profilePartnerRookieNums.every((num) =>
      stats.partnerCardNumbersDeployed.has(num),
    )
  )
    push("three_partners_plus", "3 Partners Plus", 2);

  if (stats.partnerNormalDigivolvedToU)
    push("partner_normal_dv", "Partner Normal Digivolve", 2);

  // ─── Super Bonus ──────────────────────────────────────────────────────────

  if (bonuses.length >= 7) push("super_bonus", "Super Bonus", 10);

  return bonuses;
}
