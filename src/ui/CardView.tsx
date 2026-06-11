import { Show } from "solid-js";
import { CardType, type MasterCard } from "@src/types";

/** Text-only placeholder card representation. */
export function CardView(props: { card: MasterCard; children?: import("solid-js").JSX.Element }) {
  const c = () => props.card;
  return (
    <div class="card" classList={{ option: c().type === CardType.Option }}>
      <div class="name">
        #{c().number} {c().name}
      </div>
      <Show
        when={c().type === CardType.Digimon}
        fallback={<div class="tag">Option</div>}
      >
        <div class="tag">
          {c().level} / {c().specialty} · HP {c().hp} · P{c().dp_point} · Cost {c().dp_required}
        </div>
        <div>○ {c().c_attack} ({c().c_pow})</div>
        <div>△ {c().t_attack} ({c().t_pow})</div>
        <div>
          ✕ {c().x_attack} ({c().x_pow}) <span class="effect">{c().x_effect}</span>
        </div>
      </Show>
      <Show when={c().support}>
        <div class="effect">Support: {c().support}</div>
      </Show>
      {props.children}
    </div>
  );
}
