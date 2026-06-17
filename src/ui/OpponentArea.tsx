import { Index, Show, createMemo } from "solid-js";
import type { MasterCard } from "@src/types";
import type { GameEngine, PlayerState } from "@src/engine/game-engine";
import { CardView } from "./CardView";
import { AttackReveal } from "./AttackReveal";
import { SideRail, TurnTab, createStableHand } from "./hand-common";
import { pendingHand } from "./card-animation";
import { registerZone } from "./card-animation";

/** Opponent header + hand row (revealed or hidden per the visibility rule). */
export function OpponentArea(props: { p: PlayerState; g: GameEngine; revealHand: boolean; portrait?: string }) {
  const slots = createStableHand(() => props.p.hand);
  // Hide cards still flying in from the deck until they land.
  const incomingSlots = createMemo(() => {
    const pending = pendingHand("cpu");
    const hidden = new Set<number>();
    if (pending.size === 0) return hidden;
    const remaining = new Map(pending);
    slots().forEach((card, i) => {
      if (card && (remaining.get(card) ?? 0) > 0) {
        hidden.add(i);
        remaining.set(card, (remaining.get(card) as number) - 1);
      }
    });
    return hidden;
  });
  return (
    <div class="area">
      <h2 class="split-head">
        <span class="head-id">
          <Show when={props.portrait}>
            <img class="portrait small" src={props.portrait} alt={props.p.name} />
          </Show>
          {props.p.name}
        </span>
        <span>{props.p.deckName}</span>
      </h2>
      {/* Side rail + hand; active Digimon lives in the battlefield below. */}
      <div class="with-rail">
        <SideRail p={props.p} />
        <div class="rail-main">
          <Show when={props.revealHand}>
            <div class="row" ref={(el) => registerZone("cpu-hand", el)}>
              <Index each={slots()}>
                {(slot, i) => (
                  <Show when={slot()} fallback={<div class="card empty card--art">— empty slot —</div>}>
                    <CardView
                      card={slot() as MasterCard}
                      art
                      class={incomingSlots().has(i) ? "card-incoming" : ""}
                    />
                  </Show>
                )}
              </Index>
            </div>
          </Show>
          <AttackReveal g={props.g} side="cpu" />
        </div>
        <TurnTab on={props.g.turn === "cpu"} />
      </div>
    </div>
  );
}
