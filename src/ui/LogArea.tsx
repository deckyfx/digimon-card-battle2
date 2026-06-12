import { For, createEffect, createSignal } from "solid-js";
import type { GameEngine } from "@src/engine/game-engine";

/** Battle log with a persisted asc/desc sort toggle and sticky scroll. */
export function LogArea(props: { g: GameEngine }) {
  // Sort order is a persisted preference. desc = newest on top (stick to
  // the top); asc = chronological (stick to the bottom).
  const [order, setOrder] = createSignal<"asc" | "desc">(
    localStorage.getItem("logOrder") === "asc" ? "asc" : "desc",
  );
  const toggleOrder = () => {
    const next = order() === "desc" ? "asc" : "desc";
    setOrder(next);
    localStorage.setItem("logOrder", next);
  };

  const lines = () => (order() === "desc" ? [...props.g.log].reverse() : props.g.log);

  let logEl: HTMLDivElement | undefined;
  // Keep the newest line in view: pin to top for desc, bottom for asc.
  createEffect(() => {
    lines(); // track log growth and order changes
    if (!logEl) return;
    logEl.scrollTop = order() === "desc" ? 0 : logEl.scrollHeight;
  });

  return (
    <div class="area">
      <h2 class="split-head">
        <span>Battle Log</span>
        <button class="mini" title="Toggle sort order" onClick={toggleOrder}>
          {order() === "desc" ? "↓ newest first" : "↑ oldest first"}
        </button>
      </h2>
      <div class="log" ref={logEl}>
        <For each={lines()}>
          {(line) => <div classList={{ "turn-marker": line.startsWith("—") }}>{line}</div>}
        </For>
      </div>
    </div>
  );
}
