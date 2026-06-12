import { CardLevel, CardType, type AttackType, type MasterCard } from "@src/types";
import { createCombatantCtx } from "./battle-context";
import { BattleResolver, type BattleFx, type BattleOutcome, type BattleSide } from "./battle-resolver";
import { Rng } from "./rng";
import { ScriptRunner, type SideZoneOps, type ZoneName } from "./script-runner";

/**
 * Match phases. Draw resolves automatically. "deploy" only occurs on turns
 * that start with an empty battlefield: the deployment can be cancelled or
 * switched freely until finalized, which advances to "digivolve".
 */
export type Phase = "setup" | "deploy" | "digivolve" | "battle-select" | "battle-resolve" | "game-over";

export type PlayerId = "player" | "cpu";

/** The Digimon currently on a player's battlefield. */
export interface ActiveDigimon {
  card: MasterCard;
  hp: number;
  maxHp: number;
  /** Deployment penalty (1 / 0.5 / 0.25), inherited through digivolution. */
  penalty: number;
  /**
   * Previous forms stacked underneath (bottom → top). Digivolving stacks the
   * old form here; the whole stack is trashed together when defeated, and
   * Digi-devolve pops the top back out.
   */
  stack: MasterCard[];
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  /** Display name of the prebuilt deck being played. */
  deckName: string;
  deck: MasterCard[];
  hand: MasterCard[];
  trash: MasterCard[];
  dpSlot: MasterCard[];
  active: ActiveDigimon | null;
  score: number;
}

/** A player's battle-phase decision. */
export interface BattleChoice {
  attack: AttackType;
  /** Index into hand of the support card, or null for no support. */
  supportHandIndex: number | null;
  /** Gamble: use the top card of the deck as a mystery support instead. */
  supportFromDeck?: boolean;
}

const PENALTY: Partial<Record<CardLevel, number>> = {
  [CardLevel.R]: 1,
  [CardLevel.C]: 0.5,
  [CardLevel.U]: 0.25,
  [CardLevel.A]: 0.25,
};

const WIN_SCORE = 3;
const HAND_SIZE = 4;
/** DP slot holds at most 8 cards. */
const DP_SLOT_LIMIT = 8;
/** DP total is capped at 90 regardless of stocked card values. */
const DP_VALUE_CAP = 90;

/** Prep-phase digivolve option cards, keyed by master card number. */
export type DigivolveOptionKind = "download" | "special" | "mutant" | "warp" | "speed" | "devolve";

const DIGIVOLVE_OPTIONS: Record<string, DigivolveOptionKind> = {
  "293": "download",
  "295": "special",
  "296": "mutant",
  "297": "warp",
  "299": "speed",
  "300": "devolve",
  // 294 (ArmorCrush) and 298 (De-Armor) await Armor-level support.
};

const DIGIVOLVE_OPTION_LABEL: Record<DigivolveOptionKind, string> = {
  download: "Download Digivolve",
  special: "Special Digivolve",
  mutant: "Mutant Digivolve",
  warp: "Warp Digivolve",
  speed: "Speed Digivolve",
  devolve: "Digi-devolve",
};

/**
 * Core battle engine. Owns all game state and rules; completely independent
 * of any UI. Callers mutate the game exclusively through action methods and
 * read state via {@link GameEngine.state} and {@link GameEngine.log}.
 */
export class GameEngine {
  readonly log: string[] = [];

  phase: Phase = "setup";
  turn: PlayerId = "player";
  turnCount = 0;
  winner: PlayerId | null = null;
  /** Only one card may be stocked into the DP slot per turn. */
  dpStockedThisTurn = false;
  /** Set once any prep action is taken; voluntary redraw is then locked. */
  private turnActionTaken = false;
  /** The card stocked this turn, while it can still be cancelled. */
  private stockedCardThisTurn: MasterCard | null = null;

  /** Battle in progress (phase "battle-resolve"), for UI rendering. */
  activeBattle: { ownerId: PlayerId; owner: BattleSide; defender: BattleSide } | null = null;
  /** Presentation cue of the last battle step (drives UI animations). */
  currentFx: { kind: BattleFx["kind"]; side: PlayerId } | null = null;
  private battleGen: Generator<BattleFx, BattleOutcome> | null = null;

  readonly players: Record<PlayerId, PlayerState>;

  private readonly rng: Rng;
  private readonly runner: ScriptRunner;
  private readonly resolver: BattleResolver;
  private onChange: (() => void) | null = null;

  constructor(
    playerDeck: MasterCard[],
    cpuDeck: MasterCard[],
    seed = Date.now(),
    labels?: { playerName?: string; cpuName?: string; playerDeckName?: string; cpuDeckName?: string },
  ) {
    this.rng = new Rng(seed);
    this.runner = new ScriptRunner((m) => this.pushLog(m));
    this.resolver = new BattleResolver(this.runner, (m) => this.pushLog(m));
    this.players = {
      player: this.createPlayer("player", labels?.playerName || "Player", labels?.playerDeckName ?? "", playerDeck),
      cpu: this.createPlayer("cpu", labels?.cpuName || "CPU", labels?.cpuDeckName ?? "", cpuDeck),
    };
  }

  /** Registers a listener invoked after every state-changing action. */
  setOnChange(fn: () => void): void {
    this.onChange = fn;
  }

  // ── Match lifecycle ────────────────────────────────────────────────────

  /**
   * Starts the match. `first` forces the starting player; omit (or pass
   * "random") to flip a coin.
   */
  startMatch(first: PlayerId | "random" = "random"): void {
    this.rng.shuffle(this.players.player.deck);
    this.rng.shuffle(this.players.cpu.deck);
    this.turn = first === "random" ? (this.rng.next() < 0.5 ? "player" : "cpu") : first;
    this.pushLog(`Match start! ${this.players[this.turn].name} goes first.`);
    this.beginTurn();
  }

  private beginTurn(): void {
    this.turnCount++;
    this.dpStockedThisTurn = false;
    this.turnActionTaken = false;
    this.stockedCardThisTurn = null;
    const p = this.current();
    this.pushLog(`— Turn ${this.turnCount}: ${p.name} —`);
    if (!this.drawPhase(p)) return; // mulligan death ends the match
    this.phase = p.active ? "digivolve" : "deploy";
    this.notify();
  }

  /** Draw to 4 cards, enforcing the Digimon availability mulligan. @returns false if the match ended. */
  private drawPhase(p: PlayerState): boolean {
    this.drawToHandSize(p);
    if (p.active) return true;

    while (!p.hand.some((c) => this.isDeployable(c))) {
      if (p.deck.length === 0) {
        this.pushLog(`${p.name} cannot obtain a Digimon card — match loss!`);
        this.endMatch(this.opponentOf(p.id).id);
        return false;
      }
      this.pushLog(`${p.name} has no Digimon in hand — discarding hand and redrawing.`);
      p.trash.push(...p.hand.splice(0));
      this.drawToHandSize(p);
    }
    return true;
  }

  private drawToHandSize(p: PlayerState): void {
    let drawn = 0;
    while (p.hand.length < HAND_SIZE && p.deck.length > 0) {
      p.hand.push(p.deck.shift() as MasterCard);
      drawn++;
    }
    if (drawn > 0) this.pushLog(`${p.name} draws ${drawn} card${drawn > 1 ? "s" : ""}.`);
  }

  // ── Prep phase actions (current player only) ───────────────────────────

  /**
   * True while a voluntary hand redraw is still allowed this turn:
   * - deploy phase: only while nothing is deployed (cancel first to redraw),
   * - digivolve phase: only before any action, on turns that began occupied.
   */
  canRedrawHand(): boolean {
    const p = this.current();
    if (p.deck.length === 0 || p.hand.length === 0) return false;
    if (this.phase === "deploy") return p.active === null;
    return this.phase === "digivolve" && !this.turnActionTaken;
  }

  /**
   * Voluntary mulligan: trash the entire hand and redraw 4. Only available
   * before any other prep action this turn. The Digimon availability rule
   * still applies — redrawing with no active Digimon can lose the match.
   */
  redrawHand(): boolean {
    if (!this.canRedrawHand()) return false;
    const p = this.current();
    this.pushLog(`${p.name} trashes the hand (${p.hand.length} cards) and redraws.`);
    p.trash.push(...p.hand.splice(0));
    if (!this.drawPhase(p)) return true; // mulligan rule ended the match
    this.notify();
    return true;
  }

  /**
   * Deploy a Digimon from hand (deploy phase only). If one is already
   * deployed but not yet finalized, this switches to the new choice.
   */
  deploy(handIndex: number): boolean {
    const p = this.current();
    const card = p.hand[handIndex];
    if (this.phase !== "deploy" || !card || !this.isDeployable(card)) return false;

    if (p.active) {
      // Switch: return the uncommitted deployment to hand first.
      p.hand.push(p.active.card);
      this.pushLog(`${p.name} takes ${p.active.card.name} back.`);
      p.active = null;
    }

    const penalty = PENALTY[card.level] ?? 1;
    p.hand.splice(p.hand.indexOf(card), 1);
    const hp = Math.round(card.hp * penalty);
    p.active = { card, hp, maxHp: hp, penalty, stack: [] };
    this.pushLog(
      `${p.name} deploys ${card.name} (${card.level}) with ${hp} HP${penalty < 1 ? ` — ×${penalty} penalty` : ""}.`,
    );
    this.notify();
    return true;
  }

  /** Cancel the uncommitted deployment, returning the card to hand. */
  cancelDeploy(): boolean {
    const p = this.current();
    if (this.phase !== "deploy" || !p.active) return false;
    p.hand.push(p.active.card);
    this.pushLog(`${p.name} cancels the deployment of ${p.active.card.name}.`);
    p.active = null;
    this.notify();
    return true;
  }

  /** Commit the deployment — redraw locks and the digivolve phase begins. */
  finalizeDeploy(): boolean {
    const p = this.current();
    if (this.phase !== "deploy" || !p.active) return false;
    this.turnActionTaken = true;
    this.phase = "digivolve";
    this.pushLog(`${p.name} finalizes ${p.active.card.name} on the battlefield.`);
    this.notify();
    return true;
  }

  /** True if the player may stock another DP card (slot not full). */
  canStockMoreDp(p: PlayerState): boolean {
    return p.dpSlot.length < DP_SLOT_LIMIT;
  }

  /** Discard a Digimon card from hand into the DP slot (once per turn, max 8 cards). */
  stockDp(handIndex: number): boolean {
    const p = this.current();
    const card = p.hand[handIndex];
    if (this.phase !== "digivolve" || !p.active || !card || card.type !== CardType.Digimon) return false;
    if (this.dpStockedThisTurn || !this.canStockMoreDp(p)) return false;

    this.dpStockedThisTurn = true;
    this.turnActionTaken = true;
    this.stockedCardThisTurn = card;
    p.hand.splice(handIndex, 1);
    p.dpSlot.push(card);
    this.pushLog(`${p.name} stocks ${card.name} for ${card.dp_point} DP (total ${this.dpTotal(p)} DP).`);
    this.notify();
    return true;
  }

  /** True while this turn's DP stock can still be taken back. */
  canCancelStockDp(): boolean {
    return (
      this.phase === "digivolve" &&
      this.stockedCardThisTurn !== null &&
      this.current().dpSlot.includes(this.stockedCardThisTurn)
    );
  }

  /** Returns the card stocked this turn from the DP slot back to hand. */
  cancelStockDp(): boolean {
    if (!this.canCancelStockDp()) return false;
    const p = this.current();
    const card = this.stockedCardThisTurn as MasterCard;
    p.dpSlot.splice(p.dpSlot.indexOf(card), 1);
    p.hand.push(card);
    this.stockedCardThisTurn = null;
    this.dpStockedThisTurn = false;
    this.pushLog(`${p.name} takes ${card.name} back from the DP slot (total ${this.dpTotal(p)} DP).`);
    this.notify();
    return true;
  }

  /** True if `card` can naturally digivolve from the player's active Digimon. */
  canEvolve(p: PlayerState, card: MasterCard): boolean {
    if (!p.active || card.type !== CardType.Digimon) return false;
    const from = p.active.card.level;
    const valid =
      (from === CardLevel.R && card.level === CardLevel.C) || (from === CardLevel.C && card.level === CardLevel.U);
    return valid && this.dpTotal(p) >= card.dp_required;
  }

  /** Natural digivolution: consume the DP slot, inherit the penalty. */
  evolve(handIndex: number): boolean {
    const p = this.current();
    const card = p.hand[handIndex];
    if (this.phase !== "digivolve" || !card || !this.canEvolve(p, card)) return false;

    const prev = p.active as ActiveDigimon;
    this.turnActionTaken = true;
    p.hand.splice(handIndex, 1);
    p.trash.push(...p.dpSlot.splice(0)); // DP stock is consumed and reset to 0

    const penalty = prev.penalty; // penalty is inherited
    const hp = Math.round(card.hp * penalty);
    // The previous form stays on the battlefield, stacked underneath.
    p.active = { card, hp, maxHp: hp, penalty, stack: [...prev.stack, prev.card] };
    this.pushLog(`${p.name} digivolves ${prev.card.name} → ${card.name}! HP ${hp}. DP stock reset to 0.`);
    this.notify();
    return true;
  }

  /** Digivolve-option kind of `card`, or null if it is not one (or not yet supported). */
  digivolveOptionKind(card: MasterCard): DigivolveOptionKind | null {
    return DIGIVOLVE_OPTIONS[card.number] ?? null;
  }

  private nextLevelOf(level: CardLevel): CardLevel | null {
    return level === CardLevel.R ? CardLevel.C : level === CardLevel.C ? CardLevel.U : null;
  }

  /**
   * Hand indices eligible as targets for a digivolve option:
   * - download: any Digimon, no checks (battlefield stack will be trashed).
   * - special:  next level, any specialty, DP requirement reduced by 20.
   * - mutant:   same level, same specialty, DP requirement checked.
   * - warp:     active R → target U, same specialty, DP requirement checked.
   * - speed:    next level, same specialty, no DP check, active not penalized.
   * - devolve:  no hand target (pops the evolution stack instead).
   */
  digivolveOptionTargets(p: PlayerState, kind: DigivolveOptionKind): number[] {
    const active = p.active;
    if (!active) return [];
    const next = this.nextLevelOf(active.card.level);
    const dp = this.dpTotal(p);

    return p.hand
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => {
        if (card.type !== CardType.Digimon || card.level === CardLevel.A) return false;
        switch (kind) {
          case "download":
            return true;
          case "special":
            return card.level === next && dp >= Math.max(0, card.dp_required - 20);
          case "mutant":
            return (
              card.level === active.card.level &&
              card.specialty === active.card.specialty &&
              dp >= card.dp_required &&
              card !== active.card
            );
          case "warp":
            return (
              active.card.level === CardLevel.R &&
              card.level === CardLevel.U &&
              card.specialty === active.card.specialty &&
              dp >= card.dp_required
            );
          case "speed":
            return active.penalty >= 1 && card.level === next && card.specialty === active.card.specialty;
          case "devolve":
            return false;
        }
      })
      .map(({ index }) => index);
  }

  /** True if Digi-devolve has something to pop (more than one Digimon stacked). */
  canDevolve(p: PlayerState): boolean {
    return p.active !== null && p.active.stack.length >= 1;
  }

  /**
   * Plays a digivolve option from hand during prep. An ineffective play
   * (no valid target / nothing to devolve) still trashes the option card.
   */
  useDigivolveOption(optionIndex: number, targetIndex?: number): boolean {
    const p = this.current();
    const option = p.hand[optionIndex];
    const kind = option ? this.digivolveOptionKind(option) : null;
    if (this.phase !== "digivolve" || !option || !kind) return false;

    this.turnActionTaken = true;
    const label = DIGIVOLVE_OPTION_LABEL[kind];

    // Resolve the target by identity BEFORE the option leaves the hand —
    // removing it first would shift the caller's hand indices.
    const targets = this.digivolveOptionTargets(p, kind);
    // When valid targets exist the player must choose one explicitly —
    // never auto-pick. Without targets the option fizzles (trashed below).
    if (kind !== "devolve" && targets.length > 0 && (targetIndex === undefined || !targets.includes(targetIndex))) {
      return false;
    }
    const chosen = targetIndex !== undefined && targets.includes(targetIndex) ? targetIndex : undefined;
    const target = chosen !== undefined ? p.hand[chosen] : undefined;

    p.hand.splice(p.hand.indexOf(option), 1);
    p.trash.push(option);

    if (kind === "devolve") {
      if (!this.canDevolve(p)) {
        this.pushLog(`${p.name} plays ${label} — no effect (nothing stacked). Card trashed.`);
        this.notify();
        return true;
      }
      const active = p.active as ActiveDigimon;
      const revealed = active.stack.pop() as MasterCard;
      p.trash.push(active.card);
      // Revealed Digimon returns with doubled full HP (penalty still applies).
      const hp = Math.round(revealed.hp * active.penalty) * 2;
      p.active = { card: revealed, hp, maxHp: hp, penalty: active.penalty, stack: active.stack };
      this.pushLog(`${p.name} plays ${label}: devolves to ${revealed.name} with doubled HP ${hp}! DP slot kept.`);
      this.notify();
      return true;
    }

    if (!target || !p.active) {
      this.pushLog(`${p.name} plays ${label} — no effect (no valid target). Card trashed.`);
      this.notify();
      return true;
    }

    const prev = p.active;
    p.hand.splice(p.hand.indexOf(target), 1);

    let stack: MasterCard[];
    if (kind === "download") {
      // Whole battlefield is trashed; only the new Digimon remains.
      p.trash.push(prev.card, ...prev.stack);
      stack = [];
    } else {
      stack = [...prev.stack, prev.card];
    }

    let dpNote = "DP slot kept";
    if (kind === "special" || kind === "mutant" || kind === "warp") {
      p.trash.push(...p.dpSlot.splice(0));
      dpNote = "DP stock trashed";
    }

    // Download/Mutant/Special remove all penalties. Speed requires an
    // unpenalized Digimon, and Warp only works from R (never penalized).
    const removesPenalty = kind === "download" || kind === "mutant" || kind === "special";
    const penalty = removesPenalty ? 1 : prev.penalty;
    const penaltyNote = removesPenalty && prev.penalty < 1 ? " Penalty removed!" : "";

    const hp = Math.round(target.hp * penalty);
    p.active = { card: target, hp, maxHp: hp, penalty, stack };
    this.pushLog(`${p.name} plays ${label}: ${prev.card.name} → ${target.name}! HP ${hp}. ${dpNote}.${penaltyNote}`);
    this.notify();
    return true;
  }

  /** End the prep phase. Skips battle if the opponent has no active Digimon. */
  endPrep(): boolean {
    const p = this.current();
    if (this.phase !== "digivolve" || !p.active) return false;

    if (!this.opponentOf(p.id).active) {
      this.pushLog(`${this.opponentOf(p.id).name} has no active Digimon — battle skipped.`);
      this.endTurn();
    } else {
      this.phase = "battle-select";
      this.notify();
    }
    return true;
  }

  // ── Battle ─────────────────────────────────────────────────────────────

  /**
   * Begins staged battle resolution: supports leave hands/decks, the phase
   * becomes "battle-resolve", and the UI advances steps via battleStep().
   */
  startBattle(ownerChoice: BattleChoice, defenderChoice: BattleChoice): void {
    if (this.phase !== "battle-select") return;
    const owner = this.current();
    const defender = this.opponentOf(owner.id);

    const ownerSide = this.buildSide(owner, ownerChoice);
    const defenderSide = this.buildSide(defender, defenderChoice);
    this.activeBattle = { ownerId: owner.id, owner: ownerSide, defender: defenderSide };
    this.battleGen = this.resolver.resolveSteps(ownerSide, defenderSide);
    this.phase = "battle-resolve";
    this.notify();
  }

  /** Advances one battle step. Returns true while the battle continues. */
  battleStep(): boolean {
    if (!this.battleGen || !this.activeBattle) return false;
    const ab = this.activeBattle;
    const ownerP = this.players[ab.ownerId];
    const defenderP = this.opponentOf(ab.ownerId);
    const result = this.battleGen.next();

    // Live-sync HP after every step so the UI animates each change.
    if (ownerP.active) ownerP.active.hp = Math.max(0, Math.round(ab.owner.ctx.hp));
    if (defenderP.active) defenderP.active.hp = Math.max(0, Math.round(ab.defender.ctx.hp));

    if (!result.done) {
      this.currentFx = {
        kind: result.value.kind,
        side: result.value.actor === "owner" ? ab.ownerId : defenderP.id,
      };
      this.notify();
      return true;
    }

    this.currentFx = null;
    this.battleGen = null;
    this.activeBattle = null;
    this.finishBattle(ownerP, defenderP, ab.owner, ab.defender, result.value);
    return false;
  }

  /** Headless convenience: runs an entire battle synchronously (AI/sim). */
  resolveBattlePhase(ownerChoice: BattleChoice, defenderChoice: BattleChoice): void {
    this.startBattle(ownerChoice, defenderChoice);
    while (this.battleStep()) {
      // advance until the battle concludes
    }
  }

  private finishBattle(
    owner: PlayerState,
    defender: PlayerState,
    ownerSide: BattleSide,
    defenderSide: BattleSide,
    outcome: BattleOutcome,
  ): void {
    // Write battle results back to persistent state.
    this.applyBattleResult(owner, ownerSide, outcome.koed === "owner" && !outcome.revived);
    this.applyBattleResult(defender, defenderSide, outcome.koed === "defender" && !outcome.revived);

    if (outcome.scorer) {
      const scorer = outcome.scorer === "owner" ? owner : defender;
      scorer.score++;
      this.pushLog(`${scorer.name} now has ${scorer.score} point${scorer.score > 1 ? "s" : ""}.`);
      if (scorer.score >= WIN_SCORE) {
        this.endMatch(scorer.id);
        return;
      }
    }

    this.endTurn();
  }

  private buildSide(p: PlayerState, choice: BattleChoice): BattleSide {
    const active = p.active as ActiveDigimon;
    let support: MasterCard | null = null;
    if (choice.supportFromDeck) {
      support = p.deck.shift() ?? null;
      this.pushLog(
        support
          ? `${p.name} gambles the top card of the deck as support…`
          : `${p.name} tried to gamble a deck support but the deck is empty!`,
      );
    } else if (choice.supportHandIndex !== null) {
      support = p.hand.splice(choice.supportHandIndex, 1)[0] ?? null;
    }
    const ctx = createCombatantCtx({
      hp: active.hp,
      level: active.card.level,
      specialty: active.card.specialty,
      c_power: Math.round(active.card.c_pow * active.penalty),
      t_power: Math.round(active.card.t_pow * active.penalty),
      x_power: Math.round(active.card.x_pow * active.penalty),
      selected_attack: choice.attack,
      dp_count: p.dpSlot.length,
      hand_count: p.hand.length,
    });
    return {
      name: p.name,
      card: active.card,
      ctx,
      support,
      fromDeck: !!choice.supportFromDeck,
      revealed: false,
      zones: this.zoneOps(p),
      counterDamage: null,
    };
  }

  private applyBattleResult(p: PlayerState, side: BattleSide, koed: boolean): void {
    if (side.support) p.trash.push(side.support); // used supports go to trash
    if (!p.active) return; // effect commands may have already cleared it
    if (koed) {
      // The entire evolution stack is defeated together.
      p.trash.push(p.active.card, ...p.active.stack);
      p.active = null;
    } else {
      p.active.hp = Math.max(0, Math.round(side.ctx.hp));
    }
  }

  private endTurn(): void {
    this.pushLog(`${this.current().name} ends the turn.`);
    this.turn = this.opponentOf(this.turn).id;
    this.beginTurn();
  }

  private endMatch(winner: PlayerId): void {
    this.winner = winner;
    this.phase = "game-over";
    this.pushLog(`🏆 ${this.players[winner].name} wins the match!`);
    this.notify();
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  current(): PlayerState {
    return this.players[this.turn];
  }

  opponentOf(id: PlayerId): PlayerState {
    return this.players[id === "player" ? "cpu" : "player"];
  }

  /** DP total of the slot, capped at {@link DP_VALUE_CAP}. */
  dpTotal(p: PlayerState): number {
    return Math.min(DP_VALUE_CAP, p.dpSlot.reduce((sum, c) => sum + c.dp_point, 0));
  }

  isDeployable(card: MasterCard): boolean {
    return card.type === CardType.Digimon && card.level !== CardLevel.A;
  }

  /** Penalty multiplier `card` would receive if deployed now (1 = none). */
  deployPenaltyFor(card: MasterCard): number {
    return PENALTY[card.level] ?? 1;
  }

  private createPlayer(id: PlayerId, name: string, deckName: string, deck: MasterCard[]): PlayerState {
    return { id, name, deckName, deck: [...deck], hand: [], trash: [], dpSlot: [], active: null, score: 0 };
  }

  private zoneOps(p: PlayerState): SideZoneOps {
    const zone = (name: ZoneName): MasterCard[] =>
      ({ deck: p.deck, hand: p.hand, dp: p.dpSlot, trash: p.trash })[name];
    return {
      drawCards: (count) => {
        const n = Math.min(count, p.deck.length);
        if (n <= 0) return;
        p.hand.push(...p.deck.splice(0, n));
        this.pushLog(`${p.name} draws ${n} card${n > 1 ? "s" : ""} (effect).`);
      },
      moveCards: (from, to, count, pos) => {
        const src = zone(from);
        const dst = zone(to);
        const n = pos === "all" ? src.length : Math.min(count, src.length);
        if (n <= 0) return;
        const moved: MasterCard[] = [];
        for (let i = 0; i < n; i++) {
          const idx = pos === "random" ? this.rng.nextInt(src.length) : 0;
          moved.push(...src.splice(idx, 1));
        }
        dst.unshift(...moved);
        this.pushLog(`${p.name}: ${n} card${n > 1 ? "s" : ""} moved ${from} → ${to} (effect).`);
      },
      shuffleDeck: () => {
        this.rng.shuffle(p.deck);
        this.pushLog(`${p.name} shuffles the deck (effect).`);
      },
      dpCount: () => p.dpSlot.length,
      handCount: () => p.hand.length,
    };
  }

  private pushLog(msg: string): void {
    this.log.push(msg);
  }

  private notify(): void {
    this.onChange?.();
  }
}
