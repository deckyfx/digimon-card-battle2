import { GameFlag } from "@src/data/game-flags";
import type { GameMap } from "@src/engine/event-engine";

/** Beginner City — first city, teaches the basic flow. */
export const BEGINNER_CITY_MAP: GameMap = {
  id: "beginner",
  /** Betamon (2) and Babamon (5) must both be beaten to clear this city. */
  requiredActors: [2, 5],

  events: [
    // ── Betamon ────────────────────────────────────────────────────────────
    {
      id: "betamon",
      pages: [
        // Default — Tutorial Deck, first-time intro dialog.
        {
          script: {
            actorId: 2,
            canChallenge: true,
            deckId: 1,
            dialog: {
              introDialogId: 1,
              recurLine: "Hit BATTLE when you're ready — I'll be right here!",
              challengeLine: "Are you ready?",
              battleStartLine: "Give me your best shots!",
              winDialogId: 2,
              loseLine: "That was close, but I managed to win. Try again later.",
            },
            onWin: [{ type: "set_flag", flag: GameFlag.BETAMON_TUTORIAL_DEFEATED, value: true }],
          },
        },
        // After tutorial — Practice Deck, stronger opponent, no intro.
        {
          condition: (f) => f[GameFlag.BETAMON_TUTORIAL_DEFEATED] === true,
          script: {
            actorId: 2,
            canChallenge: true,
            deckId: 137,
            dialog: {
              recurLine: "You beat my Tutorial Deck, but my Practice Deck is a different story!",
              challengeLine: "Ready for round 2?",
              battleStartLine: "Don't hold back this time!",
              loseLine: "Heh, you still have a long way to go!",
            },
            onWin: [],
          },
        },
      ],
    },

    // ── Babamon ────────────────────────────────────────────────────────────
    {
      id: "babamon",
      pages: [
        // Default — locked, talk only until Betamon is beaten.
        {
          script: {
            actorId: 5,
            canChallenge: false,
            deckId: 4,
            dialog: {
              recurLine: "Go talk to ${actor[2].name} first!",
            },
            onWin: [],
          },
        },
        // After tutorial — unlocked, can battle.
        {
          condition: (f) => f[GameFlag.BETAMON_TUTORIAL_DEFEATED] === true,
          script: {
            actorId: 5,
            canChallenge: true,
            deckId: 4,
            dialog: {
              recurLine: "So you beat ${actor[2].name}? Impressive. Now face me!",
              challengeLine: "Are you ready for my trial?",
              battleStartLine: "Lets rumble!",
              loseLine: "You need more practice.",
            },
            onWin: [],
          },
        },
      ],
    },
  ],

  // ── Visitors ─────────────────────────────────────────────────────────────
  visitors: [
    {
      probability: 0.5,
      script: {
        actorId: 117,
        canChallenge: true,
        deckId: 117,
        dialog: {
          recurLine: "Nani? Nani? Come on, let's battle!",
          challengeLine: "Nani? You dare challenge Nanimon?",
          loseLine: "Nani! You actually beat me! Nanimon!",
        },
        onWin: [],
      },
    },
  ],
};
