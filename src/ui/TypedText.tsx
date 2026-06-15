import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import type { DialogSegment } from "@src/data/dialog-resolver";

/** Milliseconds between each character reveal in dialog typing animations. */
export const DIALOG_MS_PER_CHAR = 28;

export interface TypedTextHandle {
  /** True once every character has been revealed. */
  isDone(): boolean;
  /** Instantly reveal all remaining characters. */
  skip(): void;
}

/**
 * Renders dialog segments (text + colored variable spans) with a typing
 * animation: characters are revealed one-by-one at DIALOG_MS_PER_CHAR ms
 * each. The animation restarts automatically when the segments change.
 *
 * Pass an `onHandle` callback to receive an imperative handle — call
 * `handle.isDone()` to check state and `handle.skip()` to reveal instantly.
 */
export function TypedText(props: {
  segments: DialogSegment[];
  onHandle?: (h: TypedTextHandle) => void;
}) {
  // Total character count of all segments combined.
  const total = () => props.segments.reduce((n, s) => n + s.value.length, 0);

  const [typed, setTyped] = createSignal(0);

  // Restart animation when the text content changes.
  createEffect(() => {
    // Track the full concatenated text so the effect re-runs on any change,
    // not just a length change (e.g. same-length but different line).
    const text = props.segments.map((s) => s.value).join("");
    const len = text.length;
    setTyped(0);
    if (len === 0) return;

    const id = setInterval(() => {
      setTyped((n) => {
        const next = n + 1;
        if (next >= len) {
          clearInterval(id);
          return len;
        }
        return next;
      });
    }, DIALOG_MS_PER_CHAR);
    onCleanup(() => clearInterval(id));
  });

  const handle: TypedTextHandle = {
    isDone: () => typed() >= total(),
    skip: () => setTyped(total()),
  };

  // Called synchronously during render so the parent has the handle before
  // any user interaction can occur.
  props.onHandle?.(handle);

  /**
   * Map full segments to partially-visible ones based on how many characters
   * have been typed so far.
   */
  const visibleSegments = () => {
    let remaining = typed();
    return props.segments.map((seg) => {
      if (remaining <= 0) return { ...seg, value: "" };
      if (remaining >= seg.value.length) {
        remaining -= seg.value.length;
        return seg;
      }
      const partial = { ...seg, value: seg.value.slice(0, remaining) };
      remaining = 0;
      return partial;
    });
  };

  return (
    <For each={visibleSegments()}>
      {(seg) => (
        <Show when={seg.kind !== "text"} fallback={<>{seg.value}</>}>
          <span class={`dlg-var dlg-var-${seg.kind}`}>{seg.value}</span>
        </Show>
      )}
    </For>
  );
}
