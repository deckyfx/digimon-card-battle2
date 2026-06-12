import { For } from "solid-js";
import type { MasterCard } from "@src/types";
import type { PlayerState } from "@src/engine/game-engine";
import { Ticker } from "./Ticker";

/**
 * Stable hand slots: cards keep their slot when others are used, so the view
 * never shifts — a used card simply leaves an empty slot. New draws fill the
 * first empty slots. Duplicate copies share a card object, so reconciliation
 * is multiset-based.
 */
export function createStableHand(hand: () => MasterCard[]): () => (MasterCard | null)[] {
  let prev: (MasterCard | null)[] = [];
  return () => {
    const counts = new Map<MasterCard, number>();
    for (const c of hand()) counts.set(c, (counts.get(c) ?? 0) + 1);

    // Keep cards that are still in hand in their existing slots.
    const slots: (MasterCard | null)[] = prev.map((c) => {
      if (c && (counts.get(c) ?? 0) > 0) {
        counts.set(c, (counts.get(c) as number) - 1);
        return c;
      }
      return null;
    });

    // Place newly drawn cards into the first empty slots.
    for (const [card, n] of counts) {
      for (let k = 0; k < n; k++) {
        const empty = slots.indexOf(null);
        if (empty !== -1) slots[empty] = card;
        else slots.push(card);
      }
    }

    // Normalize to the 4 standard slots (allow temporary overflow).
    while (slots.length > 4 && slots[slots.length - 1] === null) slots.pop();
    while (slots.length < 4) slots.push(null);
    prev = slots;
    return slots;
  };
}

/**
 * Side rail beside the hand: deck/trash counts and the three win lights
 * (one turns green per point scored; three lights = match won).
 * `mirrored` flips the order for the player side (lights on top).
 */
export function SideRail(props: { p: PlayerState; mirrored?: boolean }) {
  const counts = (
    <>
      <div class="rail-stat">
        <div class="rail-label">Deck</div>
        <div class="rail-num">
          <Ticker value={props.p.deck.length} />
        </div>
      </div>
      <div class="rail-stat">
        <div class="rail-label">Trash</div>
        <div class="rail-num">
          <Ticker value={props.p.trash.length} />
        </div>
      </div>
    </>
  );
  const lights = (
    <div class="win-lights">
      <For each={[0, 1, 2]}>{(i) => <div class="win-light" classList={{ on: props.p.score > i }} />}</For>
    </div>
  );
  return (
    <div class="rail">
      {props.mirrored ? lights : counts}
      {props.mirrored ? counts : lights}
    </div>
  );
}

/** Tall TURN tab shown in a hand row's right rail when it is that side's turn. */
export function TurnTab(props: { on: boolean }) {
  return (
    <div class="turn-rail">
      <div class="turn-tab" classList={{ on: props.on }}>
        <span>T</span>
        <span>U</span>
        <span>R</span>
        <span>N</span>
      </div>
    </div>
  );
}
