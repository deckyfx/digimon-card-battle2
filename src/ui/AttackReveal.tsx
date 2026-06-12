import { Show } from "solid-js";
import type { AttackType } from "@src/types";
import type { GameEngine, PlayerId } from "@src/engine/game-engine";

const ATTACK_ICON: Record<AttackType, string> = {
  c: "/assets/boards/attack-circle.png",
  t: "/assets/boards/attack-triangle.png",
  x: "/assets/boards/attack-cross.png",
};

/**
 * Cinematic attack reveal: each side's chosen attack icon pops in centered
 * over that player's hand row when the battle starts (before supports
 * resolve) and stays up until the battle phase ends. Reads the live
 * selected_attack, so "changes attack" effects update the icon mid-battle.
 */
export function AttackReveal(props: { g: GameEngine; side: PlayerId }) {
  const attack = (): AttackType | null => {
    const b = props.g.activeBattle;
    if (!b) return null;
    const s = b.ownerId === props.side ? b.owner : b.defender;
    return s.ctx.selected_attack;
  };
  return (
    <Show when={attack()}>
      {(a) => (
        <div class="attack-reveal">
          <img src={ATTACK_ICON[a()]} alt={a()} />
        </div>
      )}
    </Show>
  );
}
