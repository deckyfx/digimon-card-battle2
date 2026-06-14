import { For, Show, createEffect, createSignal, onCleanup } from "solid-js";
import gsap from "gsap";
import { getActorById } from "@src/data/actors";
import type { Actor } from "@src/data/actors";
import type { CustomDeck } from "@src/store/custom-deck-store";
import type { PlayerProfile } from "@src/store/profile-store";
import { DeckColorBar } from "./DeckColorBar";
import "./screen-battle-setup.css";

type Stage = "deck-select" | "attack-pick" | "cinematic";

export function ScreenBattleSetup(props: {
  profile: PlayerProfile;
  cpuActor: Actor;
  cpuDeckName: string;
  onStart: (customDeckId: string, firstPlayer: "player" | "cpu") => void;
}) {
  const [stage, setStage] = createSignal<Stage>("deck-select");
  const [selectedDeck, setSelectedDeck] = createSignal<CustomDeck | null>(null);
  const [firstPlayer, setFirstPlayer] = createSignal<"player" | "cpu">("player");

  // Stage 2: randomised card order — which slot holds "player goes first"
  const cardOrder: ["player" | "cpu", "player" | "cpu"] =
    Math.random() < 0.5 ? ["player", "cpu"] : ["cpu", "player"];
  const [leftFlipped, setLeftFlipped] = createSignal(false);
  const [rightFlipped, setRightFlipped] = createSignal(false);
  const [picked, setPicked] = createSignal(false);

  // Stage 3
  const [cinFadeOut, setCinFadeOut] = createSignal(false);

  // Cinematic refs
  let cpuRef!: HTMLDivElement;
  let playerRef!: HTMLDivElement;
  let cpuInfoRef!: HTMLDivElement;
  let playerInfoRef!: HTMLDivElement;
  let vsRef!: HTMLDivElement;

  const playerActor = () => getActorById(props.profile.avatarActorId);

  // Pending timer ids — tracked at module scope to allow cleanup
  let revealTimer = 0;
  let cinematicTimer = 0;

  const confirmDeck = () => {
    if (!selectedDeck()) return;
    setStage("attack-pick");
  };

  const pickCard = (idx: 0 | 1) => {
    if (picked()) return;
    setPicked(true);
    const fp = cardOrder[idx];
    setFirstPlayer(fp);

    // Flip chosen card immediately; reveal the other after a beat
    if (idx === 0) setLeftFlipped(true); else setRightFlipped(true);
    revealTimer = window.setTimeout(() => {
      setLeftFlipped(true);
      setRightFlipped(true);
    }, 380);

    cinematicTimer = window.setTimeout(() => setStage("cinematic"), 1900);
  };

  onCleanup(() => {
    clearTimeout(revealTimer);
    clearTimeout(cinematicTimer);
  });

  // ── GSAP cinematic sequence ─────────────────────────────────────────────
  createEffect(() => {
    if (stage() !== "cinematic") return;

    const fp = firstPlayer();
    const deck = selectedDeck();

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Compute offset from each panel's final position to its "center appear" position.
    // CPU appears upper-center (≈ 28 % from top), Player appears lower-center (≈ 65 %).
    const cpuRect = cpuRef.getBoundingClientRect();
    const cpuOffsetX = vw * 0.5 - cpuRect.width  * 0.5 - cpuRect.left;
    const cpuOffsetY = vh * 0.28 - cpuRect.height * 0.5 - cpuRect.top;

    const plrRect = playerRef.getBoundingClientRect();
    const plrOffsetX = vw * 0.5 - plrRect.width  * 0.5 - plrRect.left;
    const plrOffsetY = vh * 0.65 - plrRect.height * 0.5 - plrRect.top;

    // Initial states
    gsap.set(cpuRef,       { x: cpuOffsetX, y: cpuOffsetY, scale: 2,   opacity: 0 });
    gsap.set(playerRef,    { x: plrOffsetX, y: plrOffsetY, scale: 2,   opacity: 0 });
    gsap.set(cpuInfoRef,   { opacity: 0 });
    gsap.set(playerInfoRef, { opacity: 0 });
    // xPercent/yPercent replaces CSS transform:translate(-50%,-50%) so GSAP fully
    // owns the transform and the centering is preserved through scale animations.
    gsap.set(vsRef, { scale: 2.8, opacity: 0, xPercent: -50, yPercent: -50 });

    const tl = gsap.timeline();

    // Phase 1 (0 → 0.5 s): portraits appear at their center position, zoom out
    tl.to(cpuRef,    { scale: 1, opacity: 1, duration: 0.5, ease: "power2.out" }, 0);
    tl.to(playerRef, { scale: 1, opacity: 1, duration: 0.5, ease: "power2.out" }, 0.05);

    // Phase 2 (0.5 → 1.0 s): slide to final corners + info fades in
    tl.to(cpuRef,         { x: 0, y: 0, duration: 0.5, ease: "power3.inOut" }, 0.5);
    tl.to(playerRef,      { x: 0, y: 0, duration: 0.5, ease: "power3.inOut" }, 0.5);
    tl.to(cpuInfoRef,     { opacity: 1, duration: 0.3, ease: "power1.out"   }, 0.55);
    tl.to(playerInfoRef,  { opacity: 1, duration: 0.3, ease: "power1.out"   }, 0.60);

    // Phase 3 (1.0 → 1.45 s): VS zooms in
    tl.to(vsRef, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.4)" }, 1.0);

    // Hold at 1.45 s, then fade out
    const fadeTimer = window.setTimeout(() => setCinFadeOut(true), 2000);
    const startTimer = window.setTimeout(() => {
      if (deck) props.onStart(deck.id, fp);
    }, 2800);

    onCleanup(() => {
      tl.kill();
      clearTimeout(fadeTimer);
      clearTimeout(startTimer);
    });
  });

  return (
    <div class="sbs-root">

      {/* ── STAGE 1: DECK SELECT ──────────────────────────────────────── */}
      <Show when={stage() === "deck-select"}>
        <div class="sbs-deck-select">
          <p class="sbs-prompt">Choose your deck</p>
          <div class="sbs-deck-list">
            <For each={props.profile.decks}>
              {(deck) => (
                <button
                  class="sbs-deck-item"
                  classList={{ "sbs-deck-item--selected": selectedDeck()?.id === deck.id }}
                  onClick={() => setSelectedDeck(deck)}
                >
                  <div class="sbs-deck-item-header">
                    <span class="sbs-deck-item-name">{deck.name}</span>
                    <span class="sbs-deck-item-count">{deck.cardNumbers.length} cards</span>
                  </div>
                  <DeckColorBar cardNumbers={deck.cardNumbers} />
                </button>
              )}
            </For>
          </div>
          <button class="sbs-btn-confirm" disabled={!selectedDeck()} onClick={confirmDeck}>
            Confirm
          </button>
        </div>
      </Show>

      {/* ── STAGE 2: ATTACK ORDER PICK ────────────────────────────────── */}
      <Show when={stage() === "attack-pick"}>
        <div class="sbs-attack-pick">
          <p class="sbs-prompt">Choose a card to decide who attacks first</p>
          <div class="sbs-cards-row">

            {/* Left card */}
            <div
              class="sbs-card-flip"
              classList={{ "sbs-card-flip--flipped": leftFlipped(), "sbs-card-flip--done": picked() }}
              onClick={() => pickCard(0)}
            >
              <div class="sbs-card-inner">
                <div class="sbs-card-back">
                  <img src="/assets/cards/back.png" alt="Card Back" />
                </div>
                <div
                  class="sbs-card-front"
                  classList={{
                    "sbs-card-front--first":  cardOrder[0] === "player",
                    "sbs-card-front--second": cardOrder[0] === "cpu",
                  }}
                >
                  <span class="sbs-card-ord">{cardOrder[0] === "player" ? "1st" : "2nd"}</span>
                  <span class="sbs-card-atk">Attack</span>
                </div>
              </div>
            </div>

            {/* Right card */}
            <div
              class="sbs-card-flip"
              classList={{ "sbs-card-flip--flipped": rightFlipped(), "sbs-card-flip--done": picked() }}
              onClick={() => pickCard(1)}
            >
              <div class="sbs-card-inner">
                <div class="sbs-card-back">
                  <img src="/assets/cards/back.png" alt="Card Back" />
                </div>
                <div
                  class="sbs-card-front"
                  classList={{
                    "sbs-card-front--first":  cardOrder[1] === "player",
                    "sbs-card-front--second": cardOrder[1] === "cpu",
                  }}
                >
                  <span class="sbs-card-ord">{cardOrder[1] === "player" ? "1st" : "2nd"}</span>
                  <span class="sbs-card-atk">Attack</span>
                </div>
              </div>
            </div>

          </div>
          <Show when={picked()}>
            <p class="sbs-result">
              {firstPlayer() === "player"
                ? "You go first!"
                : `${props.cpuActor.name} goes first!`}
            </p>
          </Show>
        </div>
      </Show>

      {/* ── STAGE 3: CINEMATIC ────────────────────────────────────────── */}
      <Show when={stage() === "cinematic"}>
        <div class="sbs-cinematic" classList={{ "sbs-cinematic--fading": cinFadeOut() }}>

          {/* CPU — top-left: [portrait] [info →] */}
          <div class="sbs-cin-cpu" ref={cpuRef}>
            <img class="sbs-cin-portrait" src={props.cpuActor.portrait} alt={props.cpuActor.name} />
            <div class="sbs-cin-info" ref={cpuInfoRef}>
              <div class="sbs-cin-name">{props.cpuActor.name}</div>
              <div class="sbs-cin-deck">{props.cpuDeckName}</div>
              <div class="sbs-cin-order"
                classList={{
                  "sbs-cin-order--first":  firstPlayer() === "cpu",
                  "sbs-cin-order--second": firstPlayer() !== "cpu",
                }}
              >
                {firstPlayer() === "cpu" ? "1st Attack" : "2nd Attack"}
              </div>
            </div>
          </div>

          {/* VS — center */}
          <div class="sbs-cin-vs" ref={vsRef}>VS</div>

          {/* Player — bottom-right: [← info] [portrait] */}
          <div class="sbs-cin-player" ref={playerRef}>
            <div class="sbs-cin-info sbs-cin-info--right" ref={playerInfoRef}>
              <div class="sbs-cin-name">{props.profile.name}</div>
              <div class="sbs-cin-deck">{selectedDeck()?.name ?? ""}</div>
              <div class="sbs-cin-order"
                classList={{
                  "sbs-cin-order--first":  firstPlayer() === "player",
                  "sbs-cin-order--second": firstPlayer() !== "player",
                }}
              >
                {firstPlayer() === "player" ? "1st Attack" : "2nd Attack"}
              </div>
            </div>
            <img class="sbs-cin-portrait" src={playerActor()?.portrait ?? ""} alt={props.profile.name} />
          </div>

        </div>
      </Show>

    </div>
  );
}
