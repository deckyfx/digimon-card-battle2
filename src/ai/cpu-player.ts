import { CardLevel, CardType, type AttackType, type MasterCard } from "@src/types";
import type { BattleChoice, GameEngine, PlayerId, PlayerState } from "@src/engine/game-engine";

// Armor sits between Rookie and Champion in practical strength.
const LEVEL_ORDER: Record<string, number> = { R: 0, A: 0.5, C: 1, U: 2, None: 9 };

/**
 * Rule-based CPU opponent (MVP).
 *
 * Prep priorities: deploy lowest level → evolve if possible → stock DP when an
 * evolution target is in hand → end phase.
 * Attack priorities: guaranteed kill → survival (max power) → weighted random.
 * Support: highest utility (prefers Option cards with effects).
 */
export class CpuPlayer {
  constructor(
    private readonly engine: GameEngine,
    private readonly id: PlayerId = "cpu",
  ) {}

  /** Runs the CPU's deploy + digivolve phases, ending with endPrep(). */
  runPrepPhase(): void {
    // Never act outside our own turn — engine actions target the current
    // player, so a stale scheduled call would otherwise play for the human.
    if (this.engine.turn !== this.id) return;
    const cpu = this.engine.players[this.id];

    if (this.engine.phase === "deploy") {
      if (this.shouldRedraw(cpu)) {
        this.engine.redrawHand();
        if (this.engine.phase !== "deploy") return; // mulligan rule ended the match
      }
      this.deployBest(cpu);
      this.engine.finalizeDeploy();
      // First-deploy Armor offer: always take it — the armor form is a free,
      // reusable upgrade over the partner Rookie.
      if (this.engine.canArmorDigivolve()) this.engine.armorDigivolve();
    }

    if (this.engine.phase !== "digivolve") return;

    if (this.shouldRedraw(cpu)) {
      this.engine.redrawHand();
      if (this.engine.phase !== "digivolve") return;
    }

    // Evolve if possible, otherwise stock DP toward a held evolution target.
    let acted = true;
    while (acted) {
      acted = this.tryEvolve(cpu) || this.tryDigivolveOptions(cpu) || this.tryStockDp(cpu);
    }

    this.engine.endPrep();
  }

  /** Picks the CPU's battle choice (attack + support) for the current battle. */
  chooseBattle(): BattleChoice {
    const cpu = this.engine.players[this.id];
    const foe = this.engine.opponentOf(this.id);
    const active = cpu.active;
    if (!active || !foe.active) return { attack: "c", supportHandIndex: null };

    const penalty = active.penalty;
    const powers: Record<AttackType, number> = {
      c: Math.round(active.card.c_pow * penalty),
      t: Math.round(active.card.t_pow * penalty),
      x: Math.round(active.card.x_pow * penalty),
    };
    const types: AttackType[] = ["c", "t", "x"];

    // 1. Guaranteed kill.
    let attack = types.find((t) => powers[t] >= (foe.active?.hp ?? Infinity));

    // 2. Survival / value: highest power.
    if (!attack) {
      attack = [...types].sort((a, b) => powers[b] - powers[a])[0] as AttackType;
    }

    // 3. Weighted random tweak: sometimes pick ✕ for its effect.
    if (active.card.x_effect_script && powers.x === powers[attack] && Math.random() < 0.5) {
      attack = "x";
    }

    // No good support in hand → occasionally gamble the top of the deck.
    const supportHandIndex = this.pickSupport(cpu);
    const supportFromDeck = supportHandIndex === null && cpu.deck.length > 4 && Math.random() < 0.35;
    return { attack, supportHandIndex, supportFromDeck };
  }

  /**
   * Voluntary mulligan heuristic.
   *
   * Empty field: the classic bad hand is all-penalized Digimon (no Rookie) —
   * redraw hoping for a penalty-free deploy. Occupied field: redraw when the
   * hand has no Option with an effect and no evolution-line Digimon.
   *
   * Suicide guards: never redraw on a thin deck (deploying penalized beats
   * decking out), and only once per turn (runPrepPhase calls this once).
   */
  private shouldRedraw(cpu: PlayerState): boolean {
    if (!this.engine.canRedrawHand()) return false;

    if (!cpu.active) {
      if (cpu.deck.length < 10) return false; // deploy whatever we have instead
      const hasRookie = cpu.hand.some((c) => this.engine.isDeployable(c) && c.level === CardLevel.R);
      return !hasRookie;
    }

    if (cpu.deck.length < 8) return false;
    const nextLevel = cpu.active.card.level === CardLevel.R ? CardLevel.C : CardLevel.U;
    const spec = cpu.active.card.specialty;
    const isNext = (c: MasterCard) => c.type === CardType.Digimon && c.level === nextLevel && c.specialty === spec;
    const handHasNext = cpu.hand.some(isNext);

    // Dig for evolution: DP already covers a next-level Digimon that is known
    // to remain in our own deck, but the hand holds none — redraw to find it.
    if (!handHasNext) {
      const dp = this.engine.dpTotal(cpu);
      const deckHasAffordableNext = cpu.deck.some((c) => isNext(c) && c.dp_required <= dp);
      if (deckHasAffordableNext) return true;
    }

    const hasUseful = cpu.hand.some(
      (card) =>
        (card.type === CardType.Option && card.support_script !== "") ||
        isNext(card) ||
        this.engine.digivolveOptionKind(card) !== null,
    );
    return !hasUseful;
  }

  private deployBest(cpu: PlayerState): void {
    const candidates = cpu.hand
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => this.engine.isDeployable(card))
      .sort(
        (a, b) =>
          (LEVEL_ORDER[a.card.level] ?? 9) - (LEVEL_ORDER[b.card.level] ?? 9) || b.card.hp - a.card.hp,
      );
    const best = candidates[0];
    if (best) this.engine.deploy(best.index);
  }

  private tryEvolve(cpu: PlayerState): boolean {
    const candidates = cpu.hand
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => this.engine.canEvolve(cpu, card))
      .sort((a, b) => b.card.hp - a.card.hp);
    const best = candidates[0];
    return best ? this.engine.evolve(best.index) : false;
  }

  /**
   * Plays digivolve options only when clearly beneficial — never wastes one:
   * level-up options (speed/warp/special) on the beefiest target, download
   * only for a level gain, mutant only for an HP upgrade, devolve only as an
   * emergency heal (low HP, revealed doubled HP would be an improvement).
   */
  private tryDigivolveOptions(cpu: PlayerState): boolean {
    const active = cpu.active;
    if (!active || this.engine.digivolveOptionUsedThisTurn) return false;

    for (let index = 0; index < cpu.hand.length; index++) {
      const card = cpu.hand[index] as MasterCard;
      const kind = this.engine.digivolveOptionKind(card);
      if (!kind) continue;

      if (kind === "devolve") {
        if (!this.engine.canDevolve(cpu) || active.hp > active.maxHp * 0.25) continue;
        const under = active.stack[active.stack.length - 1] as MasterCard;
        const revealedHp = Math.round(under.hp * active.penalty) * 2;
        if (revealedHp <= active.hp) continue;
        return this.engine.useDigivolveOption(index);
      }

      if (kind === "dearmor") {
        // Emergency reset: a battered armor trades for a full-HP partner,
        // and the armor card returns to the side deck for reuse.
        if (!this.engine.canDearmor(cpu) || active.hp > active.maxHp * 0.25) continue;
        const under = active.stack[active.stack.length - 1] as MasterCard;
        if (Math.round(under.hp * active.penalty) <= active.hp) continue;
        return this.engine.useDigivolveOption(index);
      }

      const targets = this.engine.digivolveOptionTargets(cpu, kind);
      if (targets.length === 0) continue;
      const best = [...targets].sort((a, b) => (cpu.hand[b]?.hp ?? 0) - (cpu.hand[a]?.hp ?? 0))[0] as number;
      const target = cpu.hand[best] as MasterCard;

      const levelGain = (LEVEL_ORDER[target.level] ?? 0) - (LEVEL_ORDER[active.card.level] ?? 0);
      const penalized = active.penalty < 1; // download/mutant/special cure this
      if (kind === "download" && levelGain <= 0 && !penalized) continue;
      if (kind === "mutant" && target.hp <= active.card.hp && !penalized) continue;
      // ArmorCrush recycles the armor, so any sturdier C/U is a clean upgrade.
      if (kind === "armorcrush" && target.hp <= active.hp) continue;

      return this.engine.useDigivolveOption(index, best);
    }
    return false;
  }

  private tryStockDp(cpu: PlayerState): boolean {
    const active = cpu.active;
    if (!active) return false;

    const nextLevel = active.card.level === CardLevel.R ? CardLevel.C : CardLevel.U;
    const target = cpu.hand.find(
      (c) => c.type === CardType.Digimon && c.level === nextLevel && c.specialty === active.card.specialty,
    );
    if (!target) return false;

    const needed = target.dp_required - this.engine.dpTotal(cpu);
    if (needed <= 0) return false; // evolvable already — handled by tryEvolve

    // Stock the lowest-value Digimon that is not the evolution target itself.
    const fodder = cpu.hand
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => card.type === CardType.Digimon && card !== target)
      .sort((a, b) => a.card.dp_point - b.card.dp_point)[0];
    return fodder ? this.engine.stockDp(fodder.index) : false;
  }

  private pickSupport(cpu: PlayerState): number | null {
    // Highest utility: Option cards with a script first, then spare Digimon
    // with a support script (never the only remaining Digimon).
    const scored = cpu.hand
      .map((card, index) => ({ card, index, score: this.supportScore(cpu, card) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored[0]?.index ?? null;
  }

  private supportScore(cpu: PlayerState, card: MasterCard): number {
    if (!card.support_script || !this.engine.isLegalSupport(card)) return 0;
    if (card.type === CardType.Option) return 100 + card.support_speed;
    const digimonInHand = cpu.hand.filter((c) => c.type === CardType.Digimon).length;
    if (digimonInHand <= 1) return 0; // keep a deployable Digimon in reserve
    return 10 - card.dp_point / 10;
  }
}
