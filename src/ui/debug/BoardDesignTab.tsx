import { type JSX } from "solid-js";
import "./board-design.css";

// ─── Zone descriptors matching board-layout.svg (985 × 711 canvas) ───────────

type Side = "opp" | "ply" | "neu";

interface Zone {
  id:    string;
  label: string;
  side:  Side;
  l: number; t: number; w: number; h: number; // SVG px
}

const W = 985, H = 711;

const ZONES: Zone[] = [
  // ── Battle debug log — one-line horizontal strip across the top ──────────
  { id:"battle-log", label:"BATTLE LOG",      side:"neu", l:2.5,   t:2.5,  w:940, h:22 },

  // ── Opponent name bars (top) — narrowed to leave portrait column free ──────
  { id:"opp-name-l", label:"OPPONENT",        side:"opp", l:162.5, t:2.5,  w:335, h:44 },
  { id:"opp-name-r", label:"OPPONENT",        side:"opp", l:502.5, t:2.5,  w:440, h:44 },

  // ── Opponent avatar portrait — full height of win-slot column (left side) ──
  { id:"opp-portrait", label:"AVATAR",        side:"opp", l:2.5,   t:46.5, w:155, h:218 },

  // ── Opponent hand cards (4) ───────────────────────────────────────────────
  { id:"opp-h1",     label:"CARD",            side:"opp", l:161.5, t:51.5, w:159, h:184 },
  { id:"opp-h2",     label:"CARD",            side:"opp", l:325.5, t:51.5, w:159, h:184 },
  { id:"opp-h3",     label:"CARD",            side:"opp", l:489.5, t:51.5, w:159, h:184 },
  { id:"opp-h4",     label:"CARD",            side:"opp", l:653.5, t:51.5, w:159, h:184 },

  // ── Opponent 3 win point slots (top-left) ─────────────────────────────────
  { id:"opp-a1",     label:"WIN 1",           side:"opp", l:17.5,  t:73.5,  w:139, h:43 },
  { id:"opp-a2",     label:"WIN 2",           side:"opp", l:17.5,  t:121.5, w:139, h:43 },
  { id:"opp-a3",     label:"WIN 3",           side:"opp", l:17.5,  t:169.5, w:139, h:43 },

  // ── Opponent deck/trash/DP piles (top-right 2×2, shifted left for turn strip) ──
  { id:"opp-deck",   label:"DECK",            side:"opp", l:777.5, t:75.5,  w:80,  h:65 },
  { id:"opp-trash",  label:"TRASH",           side:"opp", l:862.5, t:75.5,  w:80,  h:65 },
  { id:"opp-dp1",    label:"DP PILE",         side:"opp", l:777.5, t:140.5, w:80,  h:65 },
  { id:"opp-dp2",    label:"DP PILE",         side:"opp", l:862.5, t:140.5, w:80,  h:65 },

  // ── CENTER: player active + name bar + 4 attack rows + player support ──────
  { id:"ply-active",    label:"PLAYER ACTIVE",   side:"ply", l:17.5,  t:274.5, w:159, h:173 },
  { id:"ply-digi-name", label:"DIGIMON NAME",    side:"ply", l:180.5, t:274.5, w:281, h:14  },
  { id:"ply-ar1",       label:"○",               side:"ply", l:180.5, t:292.5, w:113, h:38  },
  { id:"ply-ar2",       label:"△",               side:"ply", l:180.5, t:333.5, w:113, h:38  },
  { id:"ply-ar3",       label:"✕",               side:"ply", l:180.5, t:373.5, w:113, h:38  },
  { id:"ply-ar4",       label:"EFF",             side:"ply", l:180.5, t:413.5, w:113, h:38  },
  { id:"ply-sup",       label:"PLAYER SUPPORT",  side:"ply", l:303.5, t:291.5, w:159, h:173 },

  // ── CENTER: opp support + name bar + 4 attack rows + opp active ──────────
  { id:"opp-sup",       label:"OPP SUPPORT",     side:"opp", l:507.5, t:288.5, w:159, h:184 },
  { id:"opp-digi-name", label:"DIGIMON NAME",    side:"opp", l:507.5, t:264.5, w:281, h:14  },
  { id:"opp-ar1",       label:"○",               side:"opp", l:689.5, t:281.5, w:111, h:36  },
  { id:"opp-ar2",       label:"△",               side:"opp", l:689.5, t:322.5, w:111, h:36  },
  { id:"opp-ar3",       label:"✕",               side:"opp", l:689.5, t:363.5, w:111, h:36  },
  { id:"opp-ar4",       label:"EFF",             side:"opp", l:689.5, t:403.5, w:111, h:36  },
  { id:"opp-active",    label:"OPP ACTIVE",      side:"opp", l:805.5, t:264.5, w:159, h:184 },

  // ── Player hand cards (4) ─────────────────────────────────────────────────
  { id:"ply-h1",     label:"CARD",            side:"ply", l:172.5, t:489.5, w:159, h:173 },
  { id:"ply-h2",     label:"CARD",            side:"ply", l:336.5, t:489.5, w:159, h:173 },
  { id:"ply-h3",     label:"CARD",            side:"ply", l:500.5, t:489.5, w:159, h:173 },
  { id:"ply-h4",     label:"CARD",            side:"ply", l:664.5, t:489.5, w:159, h:173 },

  // ── Player avatar portrait — full height of win-slot column (right side) ───
  { id:"ply-portrait", label:"AVATAR",        side:"ply", l:828.5, t:450,   w:114, h:213 },

  // ── Player 3 win point slots (bottom-right, trimmed for turn strip) ─────────
  { id:"ply-a1",     label:"WIN 1",           side:"ply", l:828.5, t:510.5, w:114, h:38  },
  { id:"ply-a2",     label:"WIN 2",           side:"ply", l:828.5, t:555.5, w:114, h:38  },
  { id:"ply-a3",     label:"WIN 3",           side:"ply", l:828.5, t:600.5, w:114, h:38  },

  // ── Player deck/trash/DP piles (bottom-left 2×2) ─────────────────────────
  { id:"ply-deck",   label:"DECK",            side:"ply", l:86.5,  t:533.5, w:80,  h:61  },
  { id:"ply-trash",  label:"TRASH",           side:"ply", l:86.5,  t:594.5, w:80,  h:62  },
  { id:"ply-dp1",    label:"DP PILE",         side:"ply", l:2.5,   t:533.5, w:80,  h:61  },
  { id:"ply-dp2",    label:"DP PILE",         side:"ply", l:2.5,   t:594.5, w:80,  h:62  },

  // ── Player name bars (bottom) ─────────────────────────────────────────────
  { id:"ply-name-l", label:"PLAYER",          side:"ply", l:2.5,   t:665.5, w:480, h:41  },
  { id:"ply-name-r", label:"PLAYER",          side:"ply", l:487.5, t:665.5, w:335, h:41  },

  // ── Turn indicator — full-height vertical strip on the right edge ──────────
  { id:"turn-ind",   label:"TURN",            side:"neu", l:947.5, t:2.5,   w:35,  h:706 },
];

function pct(v: number, total: number): string {
  return `${((v / total) * 100).toFixed(3)}%`;
}

export function BoardDesignTab(): JSX.Element {
  return (
    <div class="debug-panel">
      <h2>🎮 BATTLE BOARD LAYOUT</h2>
      <p style={{ color: "rgba(226,232,240,0.5)", margin: "0 0 20px 0" }}>
        Converted from board-layout.svg — red = opponent, blue = player.
      </p>

      <div class="bd-viewport">
        {ZONES.map(z => (
          <div
            class={`bd-zone bd-zone-${z.side}`}
            data-id={z.id}
            style={{
              left:   pct(z.l, W),
              top:    pct(z.t, H),
              width:  pct(z.w, W),
              height: pct(z.h, H),
            }}
          >
            <span class="bd-zone-label">{z.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
