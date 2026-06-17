import { For, Show, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import gsap from "gsap";
import { flyingCards, completeFly, type FlyingCard } from "./card-animation";
import { DigiCardFront } from "./DigiCard";

/** Base card dimensions used for the transform-scale math. */
const BASE_W = 180;
const BASE_H = (180 * 217) / 200; // ≈195.3 — matches the card aspect ratio

/** One card flying across the screen, managed by GSAP. */
function FlyingCardEl(props: { fc: FlyingCard }) {
  let el!: HTMLDivElement;

  onMount(() => {
    const { from, to } = props.fc;
    // Position at source rect using transform (GPU-accelerated).
    // The element itself stays at top-left: 0,0 inside the overlay.
    gsap.set(el, {
      x: from.left,
      y: from.top,
      scaleX: from.width / BASE_W,
      scaleY: from.height / BASE_H,
    });
    gsap.to(el, {
      x: to.left,
      y: to.top,
      scaleX: to.width / BASE_W,
      scaleY: to.height / BASE_H,
      duration: 0.35,
      ease: "power3.inOut",
      onComplete: () => completeFly(props.fc.id),
    });
  });

  return (
    <div
      ref={el}
      style={{
        position: "fixed",
        top: "0",
        left: "0",
        width: `${BASE_W}px`,
        height: `${BASE_H}px`,
        "transform-origin": "top left",
        "border-radius": "6px",
        overflow: "hidden",
        "pointer-events": "none",
        "z-index": "9999",
        "will-change": "transform",
      }}
    >
      <Show
        when={props.fc.card}
        fallback={
          <img
            src="/assets/cards/back.png"
            alt="Card back"
            style={{ width: "100%", height: "100%", "object-fit": "cover" }}
          />
        }
      >
        <DigiCardFront card={props.fc.card!} />
      </Show>
    </div>
  );
}

/**
 * Portal overlay that renders all in-flight card animations above the entire UI.
 * Mount exactly once in App.tsx.
 */
export function CardAnimationOverlay() {
  return (
    <Portal mount={document.body}>
      <div
        style={{
          position: "fixed",
          inset: "0",
          "pointer-events": "none",
          "z-index": "9999",
        }}
      >
        <For each={flyingCards()}>{(fc) => <FlyingCardEl fc={fc} />}</For>
      </div>
    </Portal>
  );
}
