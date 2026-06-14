/**
 * This is list of battle, this glues actor, deck, 
 * and add conversation, pre, middle battle, and post battle
 */

const BATTLE_CAFE_DATAS = [
  {
    actor: 2, // betamon
    deck: 1, // deck id
    exp: 2, // exp gained
    prizePack: 1, // prize pack id
    first_time: 1, // dialog id to proccess when player first time talk to this, we use ref here as win bound to affect story progression that need advance dialog proccesor
    recure: "Hit BATTLE when you're ready — I'll be right here!",
    challenge: "Are you ready?", // dialog that shows when select BATTLE
    battle: "Give me your best shots.", // dialog that shows when confirm battle
    win: 2, // dialog id to proccess when player win, we use ref here as win bound to affect story progression that need advance dialog proccesor
    lose: "Tha'ts what close, but i manage to win, try again later.", // what betamon says when player lost
  },
];