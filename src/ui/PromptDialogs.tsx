import { For, Show, createEffect, createSignal } from "solid-js";
import type { AttackType, MasterCard } from "@src/types";
import type { GameEngine } from "@src/engine/game-engine";
import { quantizeStat } from "@src/engine/battle-context";
import { setInspectedCard } from "./CardView";
import { EffectText } from "./DigiCard";

/**
 * Pending "use an ineffective digivolve option anyway?" confirmation —
 * module-scope signal (like inspectedCard) so the hand balloons can raise
 * it and PromptDialogs can render it.
 */
export const [fizzleConfirm, setFizzleConfirm] = createSignal<MasterCard | null>(null);

/**
 * Floating decision prompts for the human player's prep flow and battle
 * selection. Non-blocking (no dimmed overlay) so the hand and battlefield
 * stay visible while deciding. All conditions derive from engine state; the
 * two per-turn acknowledgements (hand OK / forced-redraw notice) are keyed
 * by turnCount.
 */
export function PromptDialogs(props: {
  g: GameEngine;
  handOkTurn: number;
  setHandOkTurn: (n: number) => void;
  forcedAckTurn: number;
  setForcedAckTurn: (n: number) => void;
  attack: AttackType;
  setAttack: (a: AttackType) => void;
  attackConfirmed: boolean;
  setAttackConfirmed: (b: boolean) => void;
  supportIdx: number | "deck" | null;
  setSupportIdx: (i: number | "deck" | null) => void;
  confirmBattle: () => void;
}) {
  const p = () => props.g.players.player;
  const myPrep = () =>
    props.g.turn === "player" && (props.g.phase === "deploy" || props.g.phase === "digivolve");

  // Precedence: forced-redraw notice → hand check → finalize → armor offer.
  const showForced = () => myPrep() && props.g.forcedRedraws > 0 && props.forcedAckTurn !== props.g.turnCount;
  const showHandOk = () =>
    myPrep() && !showForced() && props.g.canRedrawHand() && props.handOkTurn !== props.g.turnCount;
  const showFinalize = () =>
    props.g.turn === "player" && props.g.phase === "deploy" && p().active !== null && !showForced();
  const showArmor = () => props.g.turn === "player" && props.g.canArmorDigivolve();
  const offeredArmor = () => (p().active ? props.g.armorForPartner(p(), p().active!.card) : null);

  // A pending fizzle confirmation dies with the phase it was raised in.
  createEffect(() => {
    if (fizzleConfirm() && (props.g.phase !== "digivolve" || props.g.turn !== "player")) setFizzleConfirm(null);
  });

  // ── Battle-select prompts (two steps: attack, then support/fight) ──────
  const isBattleSelect = () => props.g.phase === "battle-select";
  /** Effective (penalty-adjusted) power of one of the active's attacks. */
  const attackPow = (t: AttackType) => {
    const act = p().active;
    if (!act) return 0;
    return quantizeStat({ c: act.card.c_pow, t: act.card.t_pow, x: act.card.x_pow }[t] * act.penalty);
  };
  const attackName = (t: AttackType) => {
    const act = p().active;
    if (!act) return "";
    return { c: act.card.c_attack, t: act.card.t_attack, x: act.card.x_attack }[t];
  };
  const ATTACK_GLYPH: Record<AttackType, string> = { c: "○", t: "△", x: "✕" };
  const ATTACK_ICON: Record<AttackType, string> = {
    c: "/assets/icons/button-circle.png",
    t: "/assets/icons/button-triangle.png",
    x: "/assets/icons/button-cross.png",
  };
  const supportLabel = () => {
    if (props.supportIdx === "deck") return "🎲 Top of deck (mystery)";
    if (typeof props.supportIdx === "number") return p().hand[props.supportIdx]?.name ?? null;
    return null;
  };

  return (
    <>
      <Show when={showForced()}>
        <div class="prompt-dock">
          <div class="modal prompt">
            <div class="prompt-text">Since your hand has no Digimon, you had to redraw.</div>
            <div class="setup-actions">
              <button class="primary" onClick={() => props.setForcedAckTurn(props.g.turnCount)}>
                OK
              </button>
            </div>
          </div>
        </div>
      </Show>

      <Show when={showHandOk()}>
        <div class="prompt-dock">
          <div class="modal prompt">
            <div class="prompt-text">Is this hand OK?</div>
            <div class="setup-actions">
              <button onClick={() => props.g.redrawHand()}>No, Redraw</button>
              <button class="primary" onClick={() => props.setHandOkTurn(props.g.turnCount)}>
                Yes
              </button>
            </div>
          </div>
        </div>
      </Show>

      <Show when={showFinalize()}>
        <div class="prompt-dock">
          <div class="modal prompt">
            <div class="prompt-text">
              Finalize deployment of {p().active?.card.name}?
              <Show when={(p().active?.penalty ?? 1) < 1}>
                <span class="warn"> ⚠ ×{p().active?.penalty} penalty</span>
              </Show>
            </div>
            <div class="tag">…or click another Digimon in your hand to switch.</div>
            <div class="setup-actions">
              <button onClick={() => props.g.cancelDeploy()}>No, Cancel</button>
              <button class="primary" onClick={() => props.g.finalizeDeploy()}>
                Yes, Finalize
              </button>
            </div>
          </div>
        </div>
      </Show>

      <Show when={props.g.turn === "player" && props.g.phase === "digivolve" && fizzleConfirm()}>
        {(card) => (
          <div class="prompt-dock">
            <div class="modal prompt">
              <div class="prompt-text">
                {card().name} has no valid target right now — it will do nothing and be discarded. Use it
                anyway?
              </div>
              <div class="setup-actions">
                <button onClick={() => setFizzleConfirm(null)}>Cancel</button>
                <button
                  class="primary"
                  onClick={() => {
                    // Re-resolve the hand index at confirm time — the hand
                    // may have shifted since the balloon was clicked.
                    const idx = p().hand.indexOf(card());
                    if (idx >= 0) props.g.useDigivolveOption(idx);
                    setFizzleConfirm(null);
                  }}
                >
                  Yes, Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </Show>

      <Show when={showArmor()}>
        <div class="prompt-dock">
          <div class="modal prompt">
            <div class="prompt-text">
              Do you want to Armor Digivolve {p().active?.card.name} →{" "}
              <span
                class="armor-name"
                onMouseEnter={() => offeredArmor() && setInspectedCard(offeredArmor() as MasterCard)}
              >
                🛡 {offeredArmor()?.name}
              </span>
              ?
            </div>
            <div class="tag">Now or never — any other action skips it.</div>
            <div class="setup-actions">
              <button onClick={() => props.g.declineArmorDigivolve()}>No</button>
              <button class="primary" onClick={() => props.g.armorDigivolve()}>
                Yes
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Battle step 1: pick the attack. */}
      <Show when={isBattleSelect() && !props.attackConfirmed && p().active}>
        <div class="prompt-dock">
          <div class="modal prompt prompt-attack">
            <div class="prompt-text">
              <span class="prompt-cardname">{p().active?.card.name}</span> — choose your attack
            </div>
            <div class="prompt-attacks">
              <For each={["c", "t", "x"] as AttackType[]}>
                {(t) => (
                  <button
                    class="attack-option"
                    onClick={() => {
                      props.setAttack(t);
                      props.setAttackConfirmed(true);
                    }}
                  >
                    <img class="attack-icon" src={ATTACK_ICON[t]} alt={ATTACK_GLYPH[t]} />
                    <span class="attack-name">{attackName(t)}</span>
                    <span class="attack-pow">{attackPow(t)}</span>
                  </button>
                )}
              </For>
            </div>
            <Show when={p().active?.card.x_effect}>
              <div class="attack-xeffect">
                <img class="attack-icon attack-icon--sm" src={ATTACK_ICON.x} alt="✕" />
                <span><EffectText text={p().active!.card.x_effect!} /></span>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      {/* Battle step 2: pick a support (hand bubbles / deck gamble) or fight. */}
      <Show when={isBattleSelect() && props.attackConfirmed && props.supportIdx === null}>
        <div class="prompt-dock">
          <div class="modal prompt">
            <div class="prompt-text">
              {ATTACK_GLYPH[props.attack]} {attackName(props.attack)} ({attackPow(props.attack)}) — support?
            </div>
            <div class="tag">💬 Click "Support" on a hand card, gamble the deck, or fight without one.</div>
            <div class="setup-actions">
              <Show when={p().deck.length > 0}>
                <button onClick={() => props.setSupportIdx("deck")}>🎲 Top of deck</button>
              </Show>
              <button class="primary" onClick={props.confirmBattle}>
                ⚔ Fight!
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Battle step 3: confirm the chosen support or go back and reselect. */}
      <Show when={isBattleSelect() && props.attackConfirmed && props.supportIdx !== null}>
        <div class="prompt-dock">
          <div class="modal prompt">
            <div class="prompt-text">Use {supportLabel()} as support?</div>
            <div class="setup-actions">
              <button onClick={() => props.setSupportIdx(null)}>No, Reselect</button>
              <button class="primary" onClick={props.confirmBattle}>
                ⚔ Yes, Fight!
              </button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}
