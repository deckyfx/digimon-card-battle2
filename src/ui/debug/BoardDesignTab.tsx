import { onMount, onCleanup, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import gsap from "gsap";
import { MASTER_CARDS } from "@src/data/master-cards";
import { DigiCard } from "@src/ui/DigiCard";
import "./board-design.css";

// ── Demo state ───────────────────────────────────────────────────────────────
const PLY_ACTIVE = MASTER_CARDS[0]!;   // Imperialdramon – U Fire
const OPP_ACTIVE = MASTER_CARDS[50]!;  // some other digimon
const PLY_HAND   = [MASTER_CARDS[20]!, MASTER_CARDS[80]!, MASTER_CARDS[140]!, MASTER_CARDS[200]!];
const PLY_SUP    = MASTER_CARDS[285]!; // option card
const PLY_WINS   = 1;
const OPP_WINS   = 0;

// ── Layout helpers ───────────────────────────────────────────────────────────
const W = 985, H = 711;

function pos(l: number, t: number, w: number, h: number): JSX.CSSProperties {
  const pct = (v: number, d: number) => `${(v / d * 100).toFixed(3)}%`;
  return { left: pct(l, W), top: pct(t, H), width: pct(w, W), height: pct(h, H) };
}

// ── Sub-components ───────────────────────────────────────────────────────────

/**
 * Renders a full DigiCard (or card back) at native 200×217px and uses GSAP to
 * scale it proportionally into the slot. ResizeObserver keeps the scale correct
 * when the board resizes with the viewport.
 */
function CardSlot(props: { style: JSX.CSSProperties; card?: typeof MASTER_CARDS[0]; back?: boolean }) {
  let slotEl!: HTMLDivElement;
  let scaleEl!: HTMLDivElement;

  onMount(() => {
    const update = () => {
      const { width, height } = slotEl.getBoundingClientRect();
      const scale = Math.min(width / 200, height / 217);
      gsap.set(scaleEl, { scale, transformOrigin: "top left" });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(slotEl);
    onCleanup(() => ro.disconnect());
  });

  return (
    <div ref={slotEl} class="bd-card-slot" style={props.style}>
      <div ref={scaleEl} style={{ width: "200px", height: "217px" }}>
        {props.back || !props.card
          ? <img src="/assets/cards/back.png" style={{ width: "200px", height: "217px", display: "block" }} alt="card back" />
          : <DigiCard card={props.card} />}
      </div>
    </div>
  );
}

function WinSlot(props: { style: JSX.CSSProperties; n: number; filled: boolean; side: "opp" | "ply" }) {
  return (
    <div class={`bd-win-slot bd-${props.side}`} style={props.style}>
      <span class="bd-win-label">WIN {props.n}</span>
      <div class={`bd-win-pip${props.filled ? " won" : ""}`} />
    </div>
  );
}

function PileBox(props: { style: JSX.CSSProperties; label: string; count: number; side: "opp" | "ply" }) {
  return (
    <div class={`bd-pile bd-${props.side}`} style={props.style}>
      <span class="bd-pile-count">{props.count}</span>
      <span class="bd-pile-label">{props.label}</span>
    </div>
  );
}

function AtkRow(props: { style: JSX.CSSProperties; icon: string; pow: number | string; side: "opp" | "ply" }) {
  return (
    <div class={`bd-atk-row bd-${props.side}`} style={props.style}>
      <span class="bd-atk-icon">{props.icon}</span>
      <span class="bd-atk-power">{props.pow}</span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function BoardDesignTab(): JSX.Element {
  return (
    <Portal mount={document.body}>
      <div class="bd-viewport">

        {/* ── Battle debug log ──────────────────────────────────────────── */}
        <div class="bd-log" style={pos(2.5, 2.5, 940, 22)}>
          <span class="bd-log-text">
            {PLY_ACTIVE.name} used {PLY_ACTIVE.c_attack}! Dealt {PLY_ACTIVE.c_pow} damage.
          </span>
        </div>

        {/* ── Turn indicator strip (right edge, full height) ────────────── */}
        <div class={`bd-turn-strip${true ? " ply" : " opp"}`} style={pos(947.5, 2.5, 35, 706)}>
          <span class="bd-turn-label">YOUR TURN</span>
        </div>

        {/* ══ OPPONENT SIDE ═════════════════════════════════════════════════ */}

        {/* Name bars */}
        <div class="bd-name-bar bd-opp" style={pos(162.5, 2.5, 335, 44)}>
          <span class="bd-name-text">DARKSIDE</span>
        </div>
        <div class="bd-name-bar bd-opp" style={pos(502.5, 2.5, 440, 44)}>
          <span class="bd-name-text">DARKSIDE</span>
        </div>

        {/* Avatar portrait */}
        <div class="bd-portrait bd-opp" style={pos(2.5, 46.5, 155, 218)}>
          <span class="bd-avatar-text">CPU</span>
        </div>

        {/* Win slots (overlay on portrait) */}
        <WinSlot style={pos(17.5, 73.5, 139, 43)}  n={1} filled={OPP_WINS >= 1} side="opp" />
        <WinSlot style={pos(17.5, 121.5, 139, 43)} n={2} filled={OPP_WINS >= 2} side="opp" />
        <WinSlot style={pos(17.5, 169.5, 139, 43)} n={3} filled={OPP_WINS >= 3} side="opp" />

        {/* Hand – face-down */}
        <CardSlot back style={pos(161.5, 51.5, 159, 184)} />
        <CardSlot back style={pos(325.5, 51.5, 159, 184)} />
        <CardSlot back style={pos(489.5, 51.5, 159, 184)} />
        <CardSlot back style={pos(653.5, 51.5, 159, 184)} />

        {/* Pile 2×2 */}
        <PileBox style={pos(777.5, 75.5,  80, 65)} label="DECK"  count={18} side="opp" />
        <PileBox style={pos(862.5, 75.5,  80, 65)} label="TRASH" count={8}  side="opp" />
        <PileBox style={pos(777.5, 140.5, 80, 65)} label="DP"    count={2}  side="opp" />
        <PileBox style={pos(862.5, 140.5, 80, 65)} label="DP"    count={40} side="opp" />

        {/* Active card */}
        <CardSlot card={OPP_ACTIVE} style={pos(805.5, 264.5, 159, 184)} />

        {/* Digimon name bar */}
        <div class="bd-digi-name bd-opp" style={pos(507.5, 264.5, 281, 16)}>
          <span class="bd-digi-name-text">{OPP_ACTIVE.name}</span>
        </div>

        {/* Attack rows */}
        <AtkRow style={pos(689.5, 281.5, 111, 36)} icon="○" pow={OPP_ACTIVE.c_pow} side="opp" />
        <AtkRow style={pos(689.5, 322.5, 111, 36)} icon="△" pow={OPP_ACTIVE.t_pow} side="opp" />
        <AtkRow style={pos(689.5, 363.5, 111, 36)} icon="✕" pow={OPP_ACTIVE.x_pow || "EFF"} side="opp" />
        <AtkRow style={pos(689.5, 403.5, 111, 36)} icon="★" pow={OPP_ACTIVE.support ? "SUP" : "—"} side="opp" />

        {/* Support – face-down */}
        <CardSlot back style={pos(507.5, 288.5, 159, 184)} />

        {/* ══ PLAYER SIDE ══════════════════════════════════════════════════ */}

        {/* Active card */}
        <CardSlot card={PLY_ACTIVE} style={pos(17.5, 274.5, 159, 173)} />

        {/* Digimon name bar */}
        <div class="bd-digi-name bd-ply" style={pos(180.5, 274.5, 281, 16)}>
          <span class="bd-digi-name-text">{PLY_ACTIVE.name}</span>
        </div>

        {/* Attack rows */}
        <AtkRow style={pos(180.5, 292.5, 113, 38)} icon="○" pow={PLY_ACTIVE.c_pow} side="ply" />
        <AtkRow style={pos(180.5, 333.5, 113, 38)} icon="△" pow={PLY_ACTIVE.t_pow} side="ply" />
        <AtkRow style={pos(180.5, 373.5, 113, 38)} icon="✕" pow={PLY_ACTIVE.x_pow || "EFF"} side="ply" />
        <AtkRow style={pos(180.5, 413.5, 113, 38)} icon="★" pow={PLY_ACTIVE.support ? "SUP" : "—"} side="ply" />

        {/* Support – face-down */}
        <CardSlot card={PLY_SUP} style={pos(303.5, 291.5, 159, 173)} />

        {/* Hand – face-up */}
        {PLY_HAND.map((card, i) => (
          <CardSlot card={card} style={pos(172.5 + i * 164, 489.5, 159, 173)} />
        ))}

        {/* Avatar portrait */}
        <div class="bd-portrait bd-ply" style={pos(828.5, 450, 114, 213)}>
          <span class="bd-avatar-text">YOU</span>
        </div>

        {/* Win slots (overlay on portrait) */}
        <WinSlot style={pos(828.5, 510.5, 114, 38)} n={1} filled={PLY_WINS >= 1} side="ply" />
        <WinSlot style={pos(828.5, 555.5, 114, 38)} n={2} filled={PLY_WINS >= 2} side="ply" />
        <WinSlot style={pos(828.5, 600.5, 114, 38)} n={3} filled={PLY_WINS >= 3} side="ply" />

        {/* Pile 2×2 */}
        <PileBox style={pos(86.5, 533.5, 80, 61)} label="DECK"  count={22} side="ply" />
        <PileBox style={pos(86.5, 594.5, 80, 62)} label="TRASH" count={5}  side="ply" />
        <PileBox style={pos(2.5,  533.5, 80, 61)} label="DP"    count={3}  side="ply" />
        <PileBox style={pos(2.5,  594.5, 80, 62)} label="DP"    count={60} side="ply" />

        {/* Name bars */}
        <div class="bd-name-bar bd-ply" style={pos(2.5, 665.5, 480, 41)}>
          <span class="bd-name-text">PLAYER</span>
        </div>
        <div class="bd-name-bar bd-ply" style={pos(487.5, 665.5, 335, 41)}>
          <span class="bd-name-text">PLAYER</span>
        </div>

      </div>
    </Portal>
  );
}
