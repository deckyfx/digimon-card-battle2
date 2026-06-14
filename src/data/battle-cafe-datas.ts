/**
 * CafeBattle — one fightable entry in a city's Battle Cafe.
 *
 * Cities reference these by id (cafeBattleIds). The same actor can appear as
 * multiple CafeBattle entries (e.g. locked vs. unlocked state, or with a
 * stronger deck after story progression).
 *
 * exp and prizePack are derived from the referenced deck — they are NOT stored
 * here. Call getDeckById(cafeBattle.deckId) to obtain them.
 *
 * Dialog template variables (resolved by resolveSegments):
 *   ${player.name}         — player's profile name
 *   ${actor[N].name}       — actor name
 *   ${actor[N].prize.name} — actor N's prize pack
 *   ${deck[N].name}        — deck name
 *   ${city[id].name}       — city name
 *   (full list in dialog-resolver.ts)
 *
 * Profile state (introSeen, win count) is stored in PlayerProfile.cafeState,
 * keyed by CafeBattle id.
 */

export interface CafeBattle {
  id: number;
  /** Actor who appears in this slot. */
  actorId: number;
  /** Deck they use — also the source of exp and prizePack. */
  deckId: number;

  // ── Dialog ──────────────────────────────────────────────────────────────
  /** Multi-line dialog id (dialogs.ts) shown the first time the player talks
   *  to this resident. Undefined = skip straight to recurLine. */
  introDialog?: number;
  /** Single line shown on Talk after intro is seen (supports templating). */
  recurLine: string;
  /** Line shown when the player clicks BATTLE (supports templating). Unused when canChallenge is false. */
  challengeLine?: string;
  /** Line shown the moment the player confirms the battle (during the read-delay before setup). */
  battleStartLine?: string;
  /** Multi-line dialog id shown after the player wins. */
  winDialog?: number;
  /** Single line shown after the player loses (supports templating). Unused when canChallenge is false. */
  loseLine?: string;

  // ── Unlock ──────────────────────────────────────────────────────────────
  /**
   * Key into ProgressionConditions evaluated at render time.
   * Undefined = always available to battle.
   */
  unlockCondition?: string;
  /**
   * Whether this resident can be challenged to a battle.
   * Defaults to true. Set false for story-locked residents who can only
   * talk (e.g. Babamon before Betamon is beaten).
   */
  canChallenge?: boolean;

  // ── Progression ─────────────────────────────────────────────────────────
  /**
   * Story flag keys (profile.flags) set to true when the player wins this
   * battle. The progression engine reads these flags to update city rosters
   * and unlock new content.
   */
  onWin?: string[];
}

export const CAFE_BATTLES: CafeBattle[] = [
  {
    id: 1,
    actorId: 2, // Betamon — Tutorial Deck (initial)
    deckId: 1,
    introDialog: 1,
    recurLine: "Hit BATTLE when you're ready — I'll be right here!",
    challengeLine: "Are you ready?",
    battleStartLine: "Give me your best shots!",
    winDialog: 2,
    loseLine: "That was close, but I managed to win. Try again later.",
    onWin: ["betamon_tutorial_defeated"],
  },
  {
    id: 2,
    actorId: 5, // Babamon — locked, talk only (until betamon_tutorial_defeated)
    deckId: 4,
    recurLine: "Go talk to ${actor[2].name} first!",
    canChallenge: false,
    onWin: [],
  },
  {
    id: 3,
    actorId: 5, // Babamon — unlocked after betamon_tutorial_defeated
    deckId: 4,
    recurLine: "So you beat ${actor[2].name}? Impressive. Now face me!",
    challengeLine: "Are you ready for my trial?",
    battleStartLine: "Lets rumble!",
    loseLine: "You need more practice.",
    onWin: [],
  },
  {
    id: 4,
    actorId: 117, // Nanimon — random visitor
    deckId: 117,
    recurLine: "Nani? Nani? Come on, let's battle!",
    challengeLine: "Nani? You dare challenge Nanimon?",
    loseLine: "Nani! You actually beat me! Nanimon!",
    onWin: [],
  },
  {
    id: 5,
    actorId: 2, // Betamon — Practice Deck (after betamon_tutorial_defeated)
    deckId: 137,
    recurLine:
      "You beat my Tutorial Deck, but my Practice Deck is a different story!",
    challengeLine: "Ready for round 2?",
    battleStartLine: "Don't hold back this time!",
    loseLine: "Heh, you still have a long way to go!",
    onWin: [],
  },
];

export function getCafeBattleById(id: number): CafeBattle | undefined {
  return CAFE_BATTLES.find((b) => b.id === id);
}
