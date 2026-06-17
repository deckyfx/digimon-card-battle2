import { For, Show, createSignal } from "solid-js";
import type { MasterCard } from "@src/types";
import type { PlayerState } from "@src/engine/game-engine";
import { Ticker } from "./Ticker";
import { CardView } from "./CardView";

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
 * Side rail beside the hand: deck/trash card previews (rotated 90°) and the
 * three win lights. `mirrored` puts the lights on top (player side).
 */
export function SideRail(props: { p: PlayerState; mirrored?: boolean }) {
  const [trashOpen, setTrashOpen] = createSignal(false);

  const deck = (
    <div class="zone-stack">
      <Show when={props.p.deck[0]} keyed>
        {(card) => (
          <div class="zone-stack-card">
            <CardView card={card} art flipped />
          </div>
        )}
      </Show>
      <Show when={!props.p.deck[0]}>
        <div class="dp-empty" />
      </Show>
      <div class="zone-stack-label">
        <span class="zone-stack-title">Deck</span>
        <span class="zone-stack-count"><Ticker value={props.p.deck.length} /></span>
      </div>
    </div>
  );

  const lights = (
    <div class="win-lights">
      <For each={[0, 1, 2]}>{(i) => <div class="win-light" classList={{ on: props.p.score > i }} />}</For>
    </div>
  );

  const trash = (
    <div
      class="zone-stack"
      classList={{ "zone-stack--clickable": props.p.trash.length > 0 }}
      onClick={() => props.p.trash.length > 0 && setTrashOpen(true)}
    >
      <Show when={props.p.trash.at(-1)} keyed>
        {(card) => (
          <div class="zone-stack-card">
            <CardView card={card} art />
          </div>
        )}
      </Show>
      <Show when={!props.p.trash.at(-1)}>
        <div class="dp-empty" />
      </Show>
      <div class="zone-stack-label">
        <span class="zone-stack-title">Trash</span>
        <span class="zone-stack-count"><Ticker value={props.p.trash.length} /></span>
      </div>
    </div>
  );

  return (
    <div class="rail">
      {/* mirrored=true (player): lights → deck → trash
          mirrored=false (opponent): deck → trash → lights */}
      {props.mirrored ? lights : deck}
      {props.mirrored ? deck : trash}
      {props.mirrored ? trash : lights}


      {/* Trash dialog — up to 29 cards at 70% size, newest first */}
      <Show when={trashOpen()}>
        <div class="modal-overlay" onClick={() => setTrashOpen(false)}>
          <div class="modal trash-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Trash — {props.p.trash.length} card{props.p.trash.length === 1 ? "" : "s"}</h2>
            <div class="trash-card-grid">
              <For each={[...props.p.trash].reverse()}>
                {(c) => (
                  <div class="trash-card-wrap">
                    <CardView card={c} art />
                  </div>
                )}
              </For>
            </div>
            <div class="setup-actions">
              <button class="primary" onClick={() => setTrashOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}

/** Tall "1st Attack" tab shown in a hand row's right rail when it is that side's turn. */
export function TurnTab(props: { on: boolean }) {
  return (
    <div class="turn-rail">
      <div class="turn-tab" classList={{ on: props.on }}>
        <span class="turn-label">1<span class="turn-ord">st</span> ATTACK</span>
      </div>
    </div>
  );
}
