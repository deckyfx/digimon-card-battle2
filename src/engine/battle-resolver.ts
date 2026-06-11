import { CardType, type AttackType, type MasterCard } from "@src/types";
import type { CombatantCtx } from "./battle-context";
import type { ScriptRunner, SideZoneOps } from "./script-runner";

/** Everything the resolver needs about one battle participant. */
export interface BattleSide {
  /** Display name for logging. */
  name: string;
  /** The active Digimon's master card. */
  card: MasterCard;
  /** Mutable script-facing battle state. */
  ctx: CombatantCtx;
  /** Support card selected for this battle, if any (already out of hand). */
  support: MasterCard | null;
  /** Zone operations for effect commands. */
  zones: SideZoneOps;
  /** Set when this side counters: next strike uses the received damage. */
  counterDamage: number | null;
}

/** Outcome of one battle resolution. */
export interface BattleOutcome {
  /** Side that scored a point this battle, if any. */
  scorer: "owner" | "defender" | null;
  /** Whether the KO'd Digimon revived (stays on field despite point loss). */
  revived: boolean;
  /** Which side was KO'd (sent to trash unless revived). */
  koed: "owner" | "defender" | null;
}

const ATTACK_LABEL: Record<AttackType, string> = { c: "○", t: "△", x: "✕" };

/**
 * Resolves a full battle between the turn owner and the defender following
 * the PRD order: supports → cross effects → first strike → counterattack.
 */
export class BattleResolver {
  constructor(
    private readonly runner: ScriptRunner,
    private readonly log: (msg: string) => void,
  ) {}

  resolve(owner: BattleSide, defender: BattleSide): BattleOutcome {
    // 1. Jamming declared on cards voids the opposing support up front.
    this.applyJamming(owner, defender);
    this.applyJamming(defender, owner);

    // 2. Support effects — turn owner resolves first.
    this.runSupport(owner, defender);
    this.runSupport(defender, owner);

    // 3. Cross (✕) effects for each side that is attacking with ✕.
    this.runXEffect(owner, defender);
    this.runXEffect(defender, owner);

    // 4. Strike order — turn owner first unless the defender gained 1st Attack.
    let first = owner;
    let second = defender;
    if (defender.ctx.is_first_attack && !owner.ctx.is_first_attack) {
      first = defender;
      second = owner;
      this.log(`${defender.name}'s ${defender.card.name} gains 1st Attack!`);
    }

    // 5. First strike.
    this.strike(first, second);
    if (second.ctx.hp <= 0) {
      return this.handleKo(second, first, owner);
    }

    // 6. Counterattack.
    this.strike(second, first);
    if (first.ctx.hp <= 0) {
      return this.handleKo(first, second, owner);
    }

    this.log("Both Digimon survive the battle.");
    return { scorer: null, revived: false, koed: null };
  }

  private applyJamming(side: BattleSide, other: BattleSide): void {
    const xJams = side.ctx.selected_attack === "x" && side.card.x_effect_is_jamming === 1;
    const supportJams = side.support?.support_effect_is_jamming === 1;
    if (xJams || supportJams) {
      other.ctx.support_voided = true;
      this.log(`${side.name}'s Jamming voids ${other.name}'s support!`);
    }
  }

  private runSupport(side: BattleSide, other: BattleSide): void {
    const card = side.support;
    if (!card) return;

    if (side.ctx.support_voided) {
      this.log(`${side.name}'s support ${card.name} is voided.`);
      return;
    }
    if (side.ctx.option_voided && card.type === CardType.Option) {
      this.log(`${side.name}'s option support ${card.name} is voided.`);
      return;
    }

    this.log(`${side.name} plays support: ${card.name} — ${card.support || "(no effect)"}`);
    if (card.support_script) {
      this.runner.run(card.support_script, side.ctx, other.ctx, side.zones, other.zones);
    }
  }

  private runXEffect(side: BattleSide, other: BattleSide): void {
    if (side.ctx.selected_attack !== "x" || !side.card.x_effect_script) return;
    this.log(`${side.name}'s ${side.card.name} ✕ effect: ${side.card.x_effect}`);
    this.runner.run(side.card.x_effect_script, side.ctx, other.ctx, side.zones, other.zones);
  }

  private strike(attacker: BattleSide, target: BattleSide): void {
    const type = attacker.ctx.selected_attack;
    const powers: Record<AttackType, number> = {
      c: attacker.ctx.c_power,
      t: attacker.ctx.t_power,
      x: attacker.ctx.x_power,
    };

    let power = powers[type];
    let suffix = "";

    if (attacker.counterDamage !== null) {
      power = attacker.counterDamage;
      suffix = " (Counter!)";
    } else if (attacker.ctx.is_crashing) {
      power = Math.max(attacker.ctx.hp, 0);
      suffix = " (Crash!)";
    }

    power = Math.max(0, Math.round(power));
    target.ctx.hp -= power;

    const attackName = { c: attacker.card.c_attack, t: attacker.card.t_attack, x: attacker.card.x_attack }[type];
    this.log(
      `${attacker.name}'s ${attacker.card.name} attacks with ${ATTACK_LABEL[type]} ${attackName} for ${power} damage${suffix}`,
    );

    if (attacker.ctx.is_crashing && attacker.counterDamage === null) {
      attacker.ctx.hp = Math.min(attacker.ctx.hp, 10);
      this.log(`${attacker.card.name}'s HP drops to ${attacker.ctx.hp} from Crash.`);
    }

    if (attacker.ctx.is_absorbing && power > 0) {
      attacker.ctx.hp += power;
      this.log(`${attacker.card.name} eats up ${power} HP!`);
    }

    // Surviving counter: the target's next strike returns the damage received.
    if (target.ctx.hp > 0 && target.ctx.is_countering.includes(type)) {
      target.counterDamage = power;
    }
  }

  private handleKo(downed: BattleSide, victor: BattleSide, owner: BattleSide): BattleOutcome {
    const koedSide = downed === owner ? "owner" : "defender";
    const scorerSide = victor === owner ? "owner" : "defender";

    if (downed.ctx.is_reviving > 0) {
      downed.ctx.hp = downed.ctx.is_reviving;
      this.log(
        `${downed.card.name} is KO'd but revives with ${downed.ctx.hp} HP! ${victor.name} still scores 1 point.`,
      );
      return { scorer: scorerSide, revived: true, koed: koedSide };
    }

    this.log(`${downed.card.name} is KO'd! ${victor.name} scores 1 point.`);
    return { scorer: scorerSide, revived: false, koed: koedSide };
  }
}
