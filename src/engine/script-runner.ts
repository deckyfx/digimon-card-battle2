import type { CombatantCtx } from "./battle-context";

/** Zone names addressable by effect-script commands. */
export type ZoneName = "deck" | "hand" | "dp" | "trash";

/** Card-zone operations the engine exposes to effect-script commands. */
export interface SideZoneOps {
  /** Draw `count` cards from deck top into hand. */
  drawCards(count: number): void;
  /** Move `count` cards between zones. `pos` selects which cards are taken. */
  moveCards(from: ZoneName, to: ZoneName, count: number, pos: "top" | "random" | "all"): void;
  /** Shuffle the deck. */
  shuffleDeck(): void;
  /** Cards currently in the DP slot. */
  dpCount(): number;
  /** Cards currently in hand. */
  handCount(): number;
}

/**
 * Executes card effect scripts (stored as JS source in the card data) against
 * the battle contexts, then applies any queued zone commands.
 *
 * Command grammar (pipe-separated):
 * - `draw-card|own|<count>`
 * - `move-card|<side>|<from>|<to>|<count>|<top|random|all>`
 * - `shuffle|<side>|deck`
 * where `<side>` is `own`/`opponent` relative to the script's owner.
 */
export class ScriptRunner {
  constructor(private readonly log: (msg: string) => void) {}

  /**
   * Runs one effect script. `own` is the context of the card's controller.
   * Returns false if the script threw (effect fizzles, battle continues).
   */
  run(script: string, own: CombatantCtx, opponent: CombatantCtx, ownZones: SideZoneOps, oppZones: SideZoneOps): boolean {
    if (!script || script.trim() === "") return true;

    const commands: string[] = [];
    try {
      const fn = new Function("own", "opponent", "commands", script);
      fn(own, opponent, commands);
    } catch (error) {
      this.log(`⚠ Effect script failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }

    for (const cmd of commands) {
      this.execCommand(cmd, ownZones, oppZones);
    }

    // Zone commands may have changed counts visible to later scripts.
    own.dp_count = ownZones.dpCount();
    own.hand_count = ownZones.handCount();
    opponent.dp_count = oppZones.dpCount();
    opponent.hand_count = oppZones.handCount();
    return true;
  }

  private execCommand(cmd: string, ownZones: SideZoneOps, oppZones: SideZoneOps): void {
    const parts = cmd.split("|");
    const verb = parts[0];
    const side = parts[1] === "opponent" ? oppZones : ownZones;

    switch (verb) {
      case "draw-card": {
        const count = parseInt(parts[2] ?? "1", 10) || 1;
        side.drawCards(count);
        break;
      }
      case "move-card": {
        const from = parts[2] as ZoneName | undefined;
        const to = parts[3] as ZoneName | undefined;
        const count = parseInt(parts[4] ?? "0", 10) || 0;
        const pos = (parts[5] ?? "top") as "top" | "random" | "all";
        if (from && to && count > 0) side.moveCards(from, to, count, pos);
        break;
      }
      case "shuffle":
        side.shuffleDeck();
        break;
      default:
        this.log(`⚠ Unknown effect command: ${cmd}`);
    }
  }
}
