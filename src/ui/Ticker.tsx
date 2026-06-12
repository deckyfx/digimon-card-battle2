import { createEffect, createSignal, onCleanup, untrack } from "solid-js";

/**
 * Animated number: eases the displayed value toward the target so counters
 * (HP, DP, deck, trash) visibly step up/down instead of jumping.
 */
export function createTicker(target: () => number, durationMs = 600, fromZero = false): () => number {
  // fromZero starts the very first render at 0 so freshly mounted counters
  // (a deployed/digivolved battler card) visibly count up to their stats.
  const [display, setDisplay] = createSignal(fromZero ? 0 : target());
  createEffect(() => {
    const to = target();
    const from = untrack(display);
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / durationMs);
      const eased = 1 - (1 - k) * (1 - k); // ease-out
      setDisplay(Math.round(from + (to - from) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    onCleanup(() => cancelAnimationFrame(raf));
  });
  return display;
}

/** Renders a number that animates toward its new value. */
export function Ticker(props: { value: number; fromZero?: boolean }) {
  const display = createTicker(() => props.value, 600, props.fromZero ?? false);
  return <>{display()}</>;
}
