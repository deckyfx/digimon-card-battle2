import { Index, Show } from "solid-js";
import type { MasterCard } from "@src/types";
import type { GameEngine, PlayerState } from "@src/engine/game-engine";
import { CardView } from "./CardView";
import { AttackReveal } from "./AttackReveal";
import { SideRail, TurnTab, createStableHand } from "./hand-common";

/** Opponent header + hand row (revealed or hidden per the visibility rule). */
export function OpponentArea(props: { p: PlayerState; g: GameEngine; revealHand: boolean; portrait?: string }) {
  const slots = createStableHand(() => props.p.hand);
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
            <div class="row">
              <Index each={slots()}>
                {(slot) => (
                  <Show when={slot()} fallback={<div class="card empty card--art">— empty slot —</div>}>
                    <CardView card={slot() as MasterCard} art />
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
