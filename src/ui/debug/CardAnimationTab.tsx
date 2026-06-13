import { createSignal, onCleanup, For, createEffect } from "solid-js";
import { MASTER_CARDS } from "@src/data/master-cards";
import { CardLevel, CardSpecialty, MasterCard } from "@src/types";
import gsap from "gsap";

// ─── Asset helpers ────────────────────────────────────────────────────────────

function getCardFrame(card: MasterCard): string {
  if (card.level === CardLevel.None) return "/assets/card-frames/card-option.png";
  switch (card.specialty) {
    case CardSpecialty.Fire:      return "/assets/card-frames/card-fire.png";
    case CardSpecialty.Ice:       return "/assets/card-frames/card-ice.png";
    case CardSpecialty.Nature:    return "/assets/card-frames/card-nature.png";
    case CardSpecialty.Darkness:  return "/assets/card-frames/card-darkness.png";
    case CardSpecialty.Rare:
    default:                      return "/assets/card-frames/card-rare.png";
  }
}

function getLevelBadge(card: MasterCard): string {
  if (card.is_partner === 1 && card.level === CardLevel.R) return "/assets/icons/badge-rp.svg";
  switch (card.level) {
    case CardLevel.R: return "/assets/icons/badge-r.svg";
    case CardLevel.C: return "/assets/icons/badge-c.svg";
    case CardLevel.U: return "/assets/icons/badge-u.svg";
    case CardLevel.A: return "/assets/icons/badge-a.svg";
    default:          return "/assets/icons/badge-r.svg";
  }
}

function getSpecialtyIcon(card: MasterCard): string {
  switch (card.specialty) {
    case CardSpecialty.Fire:      return "/assets/icons/icon-fire.svg";
    case CardSpecialty.Ice:       return "/assets/icons/icon-ice.svg";
    case CardSpecialty.Nature:    return "/assets/icons/icon-nature.svg";
    case CardSpecialty.Darkness:  return "/assets/icons/icon-darkness.svg";
    case CardSpecialty.Rare:
    default:                      return "/assets/icons/icon-rare.svg";
  }
}

function getOptionIcon(card: MasterCard): string {
  const num = parseInt(card.number, 10);
  return (num >= 293 && num <= 300)
    ? "/assets/icons/icon-digivolve.svg"
    : "/assets/icons/icon-option.svg";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type SliderRowProps = {
  label: string;
  unit: string;
  min: number;
  max: number;
  step?: number;
  value: () => number;
  onInput: (v: number) => void;
};

function SliderRow(props: SliderRowProps) {
  const display = () =>
    props.step !== undefined && props.step < 1
      ? `${props.value().toFixed(2)}${props.unit}`
      : `${props.value()}${props.unit}`;

  return (
    <div>
      <div style={{ display: "flex", "justify-content": "space-between", "font-size": "0.75rem", "margin-bottom": "2px" }}>
        <span>{props.label}</span>
        <span style={{ color: "rgba(226, 232, 240, 0.7)" }}>{display()}</span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value()}
        onInput={(e) => props.onInput(Number(e.currentTarget.value))}
        style={{ width: "100%" }}
      />
    </div>
  );
}

/** Fully reactive card face — reads props.card every render, never caches. */
function CardFaceFront(props: { card: MasterCard }) {
  const isDigimon = () => props.card.level !== CardLevel.None;

  return (
    <div
      class="debug-card-face debug-card-front"
      style={{ "background-image": `url(${getCardFrame(props.card)})` }}
    >
      {/* Top-left: Level badge (Digimon only) */}
      {isDigimon() && (
        <img class="debug-card-badge-level" src={getLevelBadge(props.card)} alt={props.card.level} />
      )}

      {/* Top-right: Specialty icon (Digimon) or Option/Digivolve icon */}
      {isDigimon()
        ? <img class="debug-card-badge-specialty" src={getSpecialtyIcon(props.card)} alt={props.card.specialty} />
        : <img class="debug-card-badge-specialty" src={getOptionIcon(props.card)} alt="option" />
      }

      {/* Centre artwork */}
      <div class="debug-card-picture-container">
        <img class="debug-card-picture" src={props.card.img_src} alt={props.card.name} />
      </div>

      {/* Name bar — ALL CAPS */}
      <div class="debug-card-name-container">
        <span class="debug-card-name">{props.card.name.toUpperCase()}</span>
      </div>

      {/* Footer stats */}
      <div class="debug-card-footer">
        {isDigimon() ? (
          <>
            {/* HP + DP row */}
            <div class="debug-card-stats">
              <span class="debug-card-hp">HP {props.card.hp}</span>
              <span class="debug-card-dp">
                {/* DP+ [dp_point]  ▲ [dp_required] */}
                <span class="dp-gain">
                  DP<span class="dp-plus">+</span>
                  <span class="dp-gain-val">{props.card.dp_point}</span>
                </span>
                <span class="dp-sep" />
                <span class="dp-cost">
                  <span class="dp-up-arrow">DP↑</span>
                  <span class="dp-cost-val">{props.card.dp_required}</span>
                </span>
              </span>
            </div>

            {/* Attack rows: ○ △ ✕ */}
            <div class="debug-card-attacks">
              {/* Circle attack */}
              <div class="debug-card-attack-row">
                <span class="atk-label">
                  <img class="atk-icon" src="/assets/icons/button-circle.png" alt="circle" />
                  <span class="atk-name">{props.card.c_attack}</span>
                </span>
                <span class="atk-pow">{props.card.c_pow.toLocaleString()}</span>
              </div>

              {/* Triangle attack */}
              <div class="debug-card-attack-row">
                <span class="atk-label">
                  <img class="atk-icon" src="/assets/icons/button-triangle.png" alt="triangle" />
                  <span class="atk-name">{props.card.t_attack}</span>
                </span>
                <span class="atk-pow">{props.card.t_pow.toLocaleString()}</span>
              </div>

              {/* Cross attack */}
              <div class="debug-card-attack-row">
                <span class="atk-label">
                  <img class="atk-icon" src="/assets/icons/button-cross.png" alt="cross" />
                  <span class="atk-name">{props.card.x_attack}</span>
                </span>
                <span class="atk-pow">{props.card.x_pow > 0 ? props.card.x_pow.toLocaleString() : ""}</span>
              </div>

              {/* X Effect row (shown if effect text exists) */}
              {props.card.x_effect && (
                <div class="debug-card-effect-row">
                  <img class="atk-icon atk-icon-sm" src="/assets/icons/button-cross.png" alt="x-eff" />
                  <span class="eff-label">eff:</span>
                  <span class="eff-text">{props.card.x_effect}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div class="debug-card-option-text">
            <strong>Support:</strong> {props.card.support || "None"}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function CardAnimationTab() {
  const [searchQuery, setSearchQuery] = createSignal("");
  const [selectedIdx, setSelectedIdx] = createSignal(0);

  // Manual transform sliders
  const [tx, setTx] = createSignal(0);
  const [ty, setTy] = createSignal(0);
  const [rx, setRx] = createSignal(0);
  const [ry, setRy] = createSignal(0);
  const [rz, setRz] = createSignal(0);
  const [sc, setSc] = createSignal(1);

  // Flags
  const [isFlipped, setIsFlipped] = createSignal(false);
  const [parallax, setParallax] = createSignal(true);
  const [spinning, setSpinning] = createSignal(false);
  const [busy, setBusy] = createSignal(false);

  // Hover / tilt
  const [tiltX, setTiltX] = createSignal(0);
  const [tiltY, setTiltY] = createSignal(0);
  const [hovering, setHovering] = createSignal(false);

  let cardEl: HTMLDivElement | undefined;
  let spinTween: gsap.core.Tween | null = null;
  let activeTl: gsap.core.Timeline | null = null;

  // ── Derived ──────────────────────────────────────────────────────────────
  const filteredCards = () =>
    MASTER_CARDS.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery().toLowerCase()) ||
        c.number.includes(searchQuery())
    );

  const selectedCard = (): MasterCard => {
    const list = filteredCards();
    return list[selectedIdx()] ?? list[0] ?? MASTER_CARDS[0]!;
  };

  // ── Spin loop effect ─────────────────────────────────────────────────────
  createEffect(() => {
    if (spinning()) {
      if (!cardEl) return;
      spinTween = gsap.to(cardEl, {
        rotationZ: "+=360",
        duration: 2,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
        force3D: true,
      });
    } else {
      spinTween?.kill();
      spinTween = null;
    }
  });

  onCleanup(() => {
    spinTween?.kill();
    activeTl?.kill();
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  const killActive = () => {
    activeTl?.kill();
    activeTl = null;
    spinTween?.kill();
    spinTween = null;
    setSpinning(false);
  };

  const resetCard = () => {
    killActive();
    setBusy(false);
    setTx(0); setTy(0);
    setRx(0); setRy(0); setRz(0);
    setSc(1);
    setIsFlipped(false);
    if (cardEl) {
      gsap.set(cardEl, { clearProps: "all" });
      gsap.set(cardEl, { transformOrigin: "50% 50%", force3D: true });
    }
  };

  const applySliderTransform = () => {
    if (!cardEl || busy()) return;
    const finalRy = ry() + (isFlipped() ? -180 : 0);
    const pRx = parallax() && hovering() ? tiltX() : 0;
    const pRy = parallax() && hovering() ? tiltY() : 0;

    gsap.to(cardEl, {
      x: tx(),
      y: ty(),
      rotationX: rx() + pRx,
      rotationY: finalRy + pRy,
      rotationZ: rz(),
      scale: sc(),
      duration: 0.35,
      ease: "power2.out",
      overwrite: "auto",
      transformOrigin: "50% 50%",
      force3D: true,
    });
  };

  createEffect(applySliderTransform);

  // ── Mouse Parallax ───────────────────────────────────────────────────────
  const onMouseMove = (e: MouseEvent) => {
    if (!parallax() || !cardEl || busy() || spinning()) return;
    const rect = cardEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxTilt = 18;
    const newTX = ((cy - e.clientY) / (rect.height / 2)) * maxTilt;
    const newTY = ((e.clientX - cx) / (rect.width / 2)) * maxTilt;
    setTiltX(newTX);
    setTiltY(newTY);
    gsap.to(cardEl, {
      rotationX: rx() + newTX,
      rotationY: ry() + newTY + (isFlipped() ? -180 : 0),
      duration: 0.12,
      ease: "power1.out",
      overwrite: "auto",
      transformOrigin: "50% 50%",
      force3D: true,
    });
  };

  const onMouseEnter = () => setHovering(true);
  const onMouseLeave = () => {
    setHovering(false);
    setTiltX(0);
    setTiltY(0);
    if (!busy() && cardEl) applySliderTransform();
  };

  // ── Preset Choreographies (GSAP timelines) ───────────────────────────────

  const presetDraw = () => {
    if (!cardEl || busy()) return;
    killActive();
    setBusy(true);
    setIsFlipped(true);

    const tl = gsap.timeline({
      onComplete: () => {
        setIsFlipped(false);
        setBusy(false);
        gsap.set(cardEl!, { clearProps: "all" });
      },
    });
    activeTl = tl;

    tl.fromTo(cardEl, {
      x: -350, y: 350, z: -100, scale: 0.3,
      rotationX: 20, rotationY: -180, rotationZ: -60,
      opacity: 0, transformOrigin: "50% 50%", force3D: true
    }, {
      x: -80, y: 80, z: -20, scale: 0.75,
      rotationX: 10, rotationY: -180, rotationZ: -20,
      opacity: 1, duration: 0.5, ease: "power2.in",
      transformOrigin: "50% 50%", force3D: true
    })
    .to(cardEl, {
      x: 0, y: 0, z: 0, scale: 1,
      rotationX: 0, rotationY: -180, rotationZ: 0,
      opacity: 1, duration: 0.4, ease: "back.out(1.5)",
      transformOrigin: "50% 50%", force3D: true
    })
    .to(cardEl, {
      rotationY: 0, duration: 0.45, ease: "power3.inOut",
      transformOrigin: "50% 50%", force3D: true
    });
  };

  const presetDeploy = () => {
    if (!cardEl || busy()) return;
    killActive();
    setBusy(true);

    const tl = gsap.timeline({
      onComplete: () => {
        setBusy(false);
        gsap.set(cardEl!, { clearProps: "all" });
      },
    });
    activeTl = tl;

    tl.fromTo(cardEl, {
      scale: 0.2, rotationX: 45, y: 200, opacity: 0,
      filter: "brightness(3)", transformOrigin: "50% 50%", force3D: true
    }, {
      scale: 1.25, rotationX: -20, y: -20, opacity: 1, filter: "brightness(1.6)",
      duration: 0.55, ease: "expo.out",
      transformOrigin: "50% 50%", force3D: true
    })
    .to(cardEl, {
      scale: 0.95, rotationX: 10, y: 5, filter: "brightness(1.2)",
      duration: 0.18, ease: "power2.inOut",
      transformOrigin: "50% 50%", force3D: true
    })
    .to(cardEl, {
      scale: 1, rotationX: 0, y: 0, filter: "brightness(1)",
      duration: 0.22, ease: "back.out(2)",
      transformOrigin: "50% 50%", force3D: true
    });
  };

  const presetAttack = () => {
    if (!cardEl || busy()) return;
    killActive();
    setBusy(true);

    const tl = gsap.timeline({
      onComplete: () => {
        setBusy(false);
        gsap.set(cardEl!, { clearProps: "all" });
      },
    });
    activeTl = tl;

    tl.to(cardEl, {
      y: 50, z: -20, scale: 0.95, rotationX: -15,
      duration: 0.15, ease: "power2.in",
      transformOrigin: "50% 50%", force3D: true
    })
    .to(cardEl, {
      y: -150, z: 80, scale: 1.15, rotationX: 30,
      duration: 0.22, ease: "power4.out",
      transformOrigin: "50% 50%", force3D: true
    })
    .to(cardEl, { rotationZ: -6, duration: 0.07, ease: "none", transformOrigin: "50% 50%", force3D: true })
    .to(cardEl, { rotationZ: 6, duration: 0.07, ease: "none", yoyo: true, repeat: 2, transformOrigin: "50% 50%", force3D: true })
    .to(cardEl, { rotationZ: 0, duration: 0.05, transformOrigin: "50% 50%", force3D: true })
    .to(cardEl, {
      y: 0, z: 0, scale: 1, rotationX: 0,
      duration: 0.5, ease: "elastic.out(1, 0.55)",
      transformOrigin: "50% 50%", force3D: true
    });
  };

  const presetTrash = () => {
    if (!cardEl || busy()) return;
    killActive();
    setBusy(true);

    const tl = gsap.timeline({ onComplete: () => setBusy(false) });
    activeTl = tl;

    tl.to(cardEl, {
      x: 40, y: -20, rotationZ: -12, scale: 1.05, duration: 0.2, ease: "power1.out",
      transformOrigin: "50% 50%", force3D: true
    })
    .to(cardEl, {
      x: 250, y: 350, z: -150, scale: 0.08, rotationX: 55, rotationY: 100, rotationZ: 110,
      opacity: 0, duration: 0.65, ease: "power3.in",
      transformOrigin: "50% 50%", force3D: true
    });
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div class="debug-panel">
      <h2>🎴 3D CARD ANIMATION &amp; RENDERING LAB</h2>
      <p style={{ margin: "0 0 6px 0", color: "rgba(226, 232, 240, 0.55)", "font-size": "0.85rem" }}>
        Powered by <strong style={{ color: "#88c0d0" }}>GSAP 3</strong> — spring easing, timelines, and GPU-accelerated transforms.
      </p>

      <div class="animation-grid">
        {/* ── CONTROLS PANEL ── */}
        <div class="debug-panel debug-panel-purple" style={{ padding: "16px", display: "flex", "flex-direction": "column", gap: "14px" }}>

          {/* Card picker */}
          <div>
            <label class="anim-label">Select Card</label>
            <input
              type="text"
              class="sim-input"
              style={{ "margin-bottom": "6px" }}
              placeholder="Search by name or number…"
              value={searchQuery()}
              onInput={(e) => { setSearchQuery(e.currentTarget.value); setSelectedIdx(0); }}
            />
            <select
              class="sim-select"
              value={selectedIdx()}
              onChange={(e) => setSelectedIdx(parseInt(e.currentTarget.value, 10))}
            >
              <For each={filteredCards()}>
                {(card, idx) => (
                  <option value={idx()}>#{card.number} — {card.name} ({card.level})</option>
                )}
              </For>
            </select>
          </div>

          <hr class="anim-divider" />

          {/* Presets */}
          <div>
            <label class="anim-label">Preset Choreographies</label>
            <div style={{ display: "grid", "grid-template-columns": "1fr 1fr", gap: "8px", "margin-top": "6px" }}>
              <button class="debug-btn anim-preset-btn" onClick={presetDraw}   disabled={busy()}>✋ Draw</button>
              <button class="debug-btn anim-preset-btn" onClick={presetDeploy} disabled={busy()}>⚡ Deploy</button>
              <button class="debug-btn anim-preset-btn" onClick={presetAttack} disabled={busy()}>⚔️ Attack</button>
              <button class="debug-btn anim-preset-btn" onClick={presetTrash}  disabled={busy()}>🗑 Trash</button>
            </div>
          </div>

          <hr class="anim-divider" />

          {/* Manual transforms */}
          <div>
            <div style={{ display: "flex", "justify-content": "space-between", "align-items": "center", "margin-bottom": "8px" }}>
              <label class="anim-label" style={{ margin: 0 }}>Manual Transforms</label>
              <button class="debug-btn" style={{ padding: "2px 10px", "font-size": "0.72rem" }} onClick={resetCard}>↺ Reset</button>
            </div>
            <div style={{ display: "flex", "flex-direction": "column", gap: "7px" }}>
              <SliderRow label="Translate X" unit="px" min={-200} max={200} value={tx} onInput={setTx} />
              <SliderRow label="Translate Y" unit="px" min={-200} max={200} value={ty} onInput={setTy} />
              <SliderRow label="Rotate X (tilt)" unit="°" min={-90} max={90} value={rx} onInput={setRx} />
              <SliderRow label="Rotate Y (flip)" unit="°" min={-180} max={180} value={ry} onInput={setRy} />
              <SliderRow label="Rotate Z (spin)" unit="°" min={-180} max={180} value={rz} onInput={setRz} />
              <SliderRow label="Scale" unit="×" min={0.3} max={2.5} step={0.05} value={sc} onInput={setSc} />
            </div>
          </div>

          <hr class="anim-divider" />

          {/* Toggles */}
          <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
            <label class="anim-toggle">
              <input type="checkbox" checked={isFlipped()} onChange={(e) => setIsFlipped(e.currentTarget.checked)} />
              <span>Flip Card (face-down)</span>
            </label>
            <label class="anim-toggle">
              <input type="checkbox" checked={parallax()} onChange={(e) => setParallax(e.currentTarget.checked)} />
              <span>3D Mouse Parallax</span>
            </label>
            <label class="anim-toggle">
              <input type="checkbox" checked={spinning()} onChange={(e) => setSpinning(e.currentTarget.checked)} />
              <span>Z-Axis Continuous Spin</span>
            </label>
          </div>
        </div>

        {/* ── STAGE ── */}
        <div class="card-stage-container">
          <div
            class="debug-card-wrapper"
            onMouseMove={onMouseMove}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <div ref={cardEl} class="debug-card">
              <CardFaceFront card={selectedCard()} />
              <div class="debug-card-face debug-card-back">
                <img src="/assets/cards/back.png" alt="Card Back" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
