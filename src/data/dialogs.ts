/**
 * Dialog system for Battle Cafe "Talk" interactions.
 *
 * Message template vars (resolved at render time):
 *   ${player.name}              — player's profile name          (gold)
 *   ${actor[N].name}            — name of actor with id N        (cyan)
 *   ${actor[N].prize.name}      — actor N's prize pack name      (amber)
 *   ${actor[N].city.name}       — city containing actor N        (periwinkle)
 *   ${deck[N].name}             — name of deck with id N         (mint)
 *   ${deck[N].description}      — flavor text of deck N          (mint)
 *   ${prizepack[N].name}        — prize pack by numeric id       (amber)
 *   ${card[NNN].name}           — master card name by number     (rose)
 *   ${city[id].name}            — city name by string id         (periwinkle)
 *
 * Actor id 0 in a dialog always refers to the player slot.
 */

export interface DialogLine {
  /** Actor id speaking this line. 0 = player. */
  actor: number;
  message: string;
}

export interface Dialog {
  id: number;
  /** All actor ids that appear in this dialog (0 = player slot). */
  actors: number[];
  lines: DialogLine[];
}

/**
 * Maps actor id → dialog id for their default "Talk" interaction.
 * Future shape: number | ((profile: PlayerProfile) => number)
 * for flag-based branching.
 */
export const ACTOR_TALK_DIALOG: Record<number, number> = {
  2: 1, // Betamon — tutorial intro
};

export function getDialogById(id: number): Dialog | undefined {
  return DIALOGS.find((d) => d.id === id);
}

/** Returns the Talk dialog for an actor, or undefined if none assigned. */
export function getTalkDialog(actorId: number): Dialog | undefined {
  const id = ACTOR_TALK_DIALOG[actorId];
  return id !== undefined ? getDialogById(id) : undefined;
}

export const DIALOGS: Dialog[] = [
  {
    // Betamon tutorial first time dialog
    id: 1,
    actors: [0, 2],
    lines: [
      {
        actor: 0,
        message: "Hello there!",
      },
      {
        actor: 2,
        message:
          "Oh my! You must be ${player.name}, the new player I've been hearing about. Welcome to Digimon Digital Card Battle!",
      },
      {
        actor: 0,
        message:
          "Thank you! I'm still pretty new to all of this — I could really use some guidance.",
      },
      {
        actor: 2,
        message:
          "Then let me, ${actor[2].name}, be your guide! How about we start with a battle? I'll use my ${deck[1].name}.",
      },
      {
        actor: 2,
        message:
          "Win and I'll reward you with a ${actor[2].prize.name} — packed with cards to power up your deck. Hit BATTLE when you're ready — I'll be right here!",
      },
    ],
  },
  {
    // Betamon tutorial win
    id: 2,
    actors: [0, 2],
    lines: [
      {
        actor: 2,
        message: "You have knack for this!",
      },
      {
        actor: 0,
        message:
          "Thank you.",
      },
      {
        actor: 2,
        message:
          "That's the gist of this game, i pray for your continuous victory",
      },
    ],
  },
];
