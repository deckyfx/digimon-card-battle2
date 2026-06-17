import { Show } from "solid-js";
import { inspectedCard } from "./CardView";
import { CardDetail } from "./CardDetail";

/** Right-panel full card details for the hovered card (any side's). */
export function CardInspector() {
  const c = () => inspectedCard();
  return (
    <div class="area card-inspect">
      <h2>Card Details</h2>
      <div class="card-inspect-body">
        <Show when={c()} fallback={<div class="tag">Hover a card to inspect it.</div>}>
          <CardDetail card={c()!} />
        </Show>
      </div>
    </div>
  );
}
