import { Show } from "solid-js";
import { inspectedCard } from "./CardView";

/** Right-panel full card details for the hovered card (any side's). */
export function CardInspector() {
  const c = () => inspectedCard();
  return (
    <div class="area">
      <h2>Card Details</h2>
      <Show when={c()} fallback={<div class="tag">Hover a card to inspect it.</div>}>
        <div class="inspect">
          <img class="inspect-img" src={c()!.img_src} alt={c()!.name} />
          <div class="name-row">
            <span class="name">
              #{c()!.number} {c()!.name}
            </span>
            <Show when={c()!.type === "Digimon"}>
              <span class="lvl">{c()!.level}</span>
            </Show>
          </div>
          <div class="tag">
            {c()!.type}
            {c()!.type === "Digimon" ? ` · ${c()!.specialty}` : ""}
          </div>
          <Show when={c()!.type === "Digimon"}>
            <div>HP {c()!.hp}</div>
            <div>
              DP gives {c()!.dp_point} · costs {c()!.dp_required} to digivolve into
            </div>
            <div class="inspect-attacks">
              <div>
                ○ {c()!.c_attack} — {c()!.c_pow}
              </div>
              <div>
                △ {c()!.t_attack} — {c()!.t_pow}
              </div>
              <div>
                ✕ {c()!.x_attack} — {c()!.x_pow}
              </div>
            </div>
            <Show when={c()!.x_effect}>
              <div class="effect effect-x">✕ effect: {c()!.x_effect}</div>
            </Show>
          </Show>
          <div class="effect effect-support">Support: {c()!.support || "None"}</div>
        </div>
      </Show>
    </div>
  );
}
