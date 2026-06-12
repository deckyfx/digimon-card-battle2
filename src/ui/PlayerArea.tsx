import { For, Index, Show } from "solid-js";
import type { MasterCard } from "@src/types";
import type { GameEngine } from "@src/engine/game-engine";
import { CardView } from "./CardView";
import { AttackReveal } from "./AttackReveal";
import { SideRail, TurnTab, createStableHand } from "./hand-common";
import { setFizzleConfirm } from "./PromptDialogs";

/** Player hand row with the manga action balloons, plus identity footer. */
export function PlayerArea(props: {
  g: GameEngine;
  supportIdx: number | null;
  portrait?: string;
  /** Battle support picking active: hand cards grow a "Support" bubble. */
  supportPick: boolean;
  setSupportIdx: (i: number | "deck" | null) => void;
}) {
  const p = () => props.g.players.player;
  const slots = createStableHand(() => p().hand);

  /** Slot currently lent to the battlefield as the selected support card. */
  const supportSlotIdx = () => {
    const si = props.supportIdx;
    if (si === null) return -1;
    const hand = p().hand;
    const target = hand[si];
    if (!target) return -1;
    // With duplicate copies, match the Nth copy in hand to the Nth slot copy.
    const copyN = hand.slice(0, si).filter((c) => c === target).length;
    let seen = 0;
    const sl = slots();
    for (let i = 0; i < sl.length; i++) {
      if (sl[i] === target) {
        if (seen === copyN) return i;
        seen++;
      }
    }
    return -1;
  };
  const isMyTurn = () => props.g.turn === "player";
  const isMyDeploy = () => props.g.phase === "deploy" && isMyTurn();
  const isMyDigivolve = () => props.g.phase === "digivolve" && isMyTurn();
  const isMyPrep = () => isMyDeploy() || isMyDigivolve();
  /** True while a digivolve option may still be played this turn. */
  const optionPlayable = () => !props.g.digivolveOptionUsedThisTurn;

  /** Digivolve option cards currently in hand: [handIndex, kind, eligible target indices]. */
  const digiOptions = () =>
    p()
      .hand.map((card, index) => ({ index, kind: optionPlayable() ? props.g.digivolveOptionKind(card) : null }))
      .filter((o): o is { index: number; kind: NonNullable<ReturnType<typeof props.g.digivolveOptionKind>> } => o.kind !== null)
      .map((o) => ({ ...o, targets: props.g.digivolveOptionTargets(p(), o.kind) }));

  const optionLabel: Record<string, string> = {
    download: "Download",
    armorcrush: "ArmorCrush",
    special: "Special",
    mutant: "Mutant",
    warp: "Warp",
    dearmor: "De-Armor",
    speed: "Speed",
    devolve: "Devolve",
  };

  return (
    <div class="area">
      <div class="with-rail" style={{ "margin-top": "10px" }}>
        <SideRail p={p()} mirrored />
        <div class="rail-main">
          <div class="row">
            <Index each={slots()}>
              {(slot, slotIdx) => {
                const card = () => slot() as MasterCard;
                const hi = () => p().hand.indexOf(card());
                const lentAsSupport = () => slotIdx === supportSlotIdx();
                const targetOptions = () =>
                  isMyDigivolve() ? digiOptions().filter((o) => o.targets.includes(hi())) : [];
                /** Any action available? No actions → no speech balloon. */
                const hasActions = () =>
                  (isMyDeploy() && props.g.isDeployable(card())) ||
                  (isMyDigivolve() &&
                    ((props.g.isDeployable(card()) && !props.g.dpStockedThisTurn && props.g.canStockMoreDp(p())) ||
                      props.g.canEvolve(p(), card()) ||
                      (optionPlayable() && props.g.digivolveOptionKind(card()) !== null) ||
                      targetOptions().length > 0));
                return (
                  <Show
                    when={slot() && !lentAsSupport()}
                    fallback={
                      <div class="card empty">{lentAsSupport() ? "→ support" : "— empty slot —"}</div>
                    }
                  >
                    <CardView card={card()}>
                      {/* Battle support pick: legal supports offer themselves
                          (digivolve option cards are prep-phase only). */}
                      <Show when={props.supportPick && props.g.isLegalSupport(card())}>
                        <div class="bubbles">
                          <button title={`Use ${card().name} as support`} onClick={() => props.setSupportIdx(hi())}>
                            Support
                          </button>
                        </div>
                      </Show>
                      <Show when={isMyPrep() && hasActions()}>
                        {/* Manga balloon with action icons over the card's head. */}
                        <div class="bubbles">
                          <Show when={isMyDeploy() && props.g.isDeployable(card())}>
                            <button
                              title={`${p().active ? "Switch deployment to this" : "Deploy"}${
                                props.g.deployPenaltyFor(card()) < 1
                                  ? ` — penalized ×${props.g.deployPenaltyFor(card())}`
                                  : ""
                              }`}
                              onClick={() => props.g.deploy(hi())}
                            >
                              {props.g.deployPenaltyFor(card()) === 1
                                ? "OK"
                                : props.g.deployPenaltyFor(card()) === 0.5
                                  ? "⚠½"
                                  : "⚠¼"}
                            </button>
                          </Show>
                          <Show
                            when={
                              isMyDigivolve() &&
                              props.g.isDeployable(card()) &&
                              !props.g.dpStockedThisTurn &&
                              props.g.canStockMoreDp(p())
                            }
                          >
                            <button title="Stock DP" onClick={() => props.g.stockDp(hi())}>
                              DP⬆
                            </button>
                          </Show>
                          <Show when={isMyDigivolve() && props.g.canEvolve(p(), card())}>
                            <button title="Digivolve" onClick={() => props.g.evolve(hi())}>
                              Digivolve
                            </button>
                          </Show>
                          {/* "Use" a digivolve option card (ineffective use trashes it). */}
                          <Show when={isMyDigivolve() && optionPlayable() && props.g.digivolveOptionKind(card())}>
                            {(kind) => {
                              const opt = () => digiOptions().find((o) => o.index === hi());
                              const hasTargets = () => (opt()?.targets.length ?? 0) > 0;
                              const effective = () =>
                                kind() === "devolve"
                                  ? props.g.canDevolve(p())
                                  : kind() === "dearmor"
                                    ? props.g.canDearmor(p())
                                    : hasTargets();
                              return (
                                <Show
                                  when={kind() === "devolve" || kind() === "dearmor" || !hasTargets()}
                                  fallback={
                                    <span class="bubble-hint" title="Click Digivolve on the target card">
                                      Pick target →
                                    </span>
                                  }
                                >
                                  <button
                                    classList={{ fizzle: !effective() }}
                                    title={`Use ${optionLabel[kind()]}${effective() ? "" : " — no valid target, card will be trashed"}`}
                                    onClick={() => {
                                      // Ineffective play still trashes the card — confirm first
                                      // via the floating prompt dialog.
                                      if (!effective()) setFizzleConfirm(card());
                                      else props.g.useDigivolveOption(hi());
                                    }}
                                  >
                                    Use
                                  </button>
                                </Show>
                              );
                            }}
                          </Show>
                          {/* Target bubbles: one per digivolve option that can reach this card. */}
                          <For each={targetOptions()}>
                            {(o) => (
                              <button
                                title={`${optionLabel[o.kind]} Digivolve → this card`}
                                onClick={() => props.g.useDigivolveOption(o.index, hi())}
                              >
                                Digivolve
                              </button>
                            )}
                          </For>
                        </div>
                      </Show>
                    </CardView>
                  </Show>
                );
              }}
            </Index>
          </div>
          <AttackReveal g={props.g} side="player" />
        </div>
        <TurnTab on={props.g.turn === "player"} />
      </div>

      {/* Identity + stats at the bottom, mirroring the opponent layout. */}
      <h2 class="split-head" style={{ "margin-top": "10px" }}>
        <span class="head-id">
          <Show when={props.portrait}>
            <img class="portrait small" src={props.portrait} alt={p().name} />
          </Show>
          {p().name}
        </span>
        <span>{p().deckName}</span>
      </h2>
    </div>
  );
}
