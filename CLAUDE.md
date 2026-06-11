# Digital Card Battle

Playable recreation of the Digimon Digital Card Battle (PS1) battle system.
Solid + TypeScript frontend, Bun as runtime/package manager, Vite for dev/build
(Bun's bundler lacks Solid's JSX transform — do not switch back).

## Architecture — THE prime directive

**The battle game engine must remain decoupled from the UI (and any future
server) as much as possible.**

```
src/engine/  +  src/ai/  +  src/data/   ← pure game logic, NO UI imports
        ↓ plain method calls / readable state
src/ui/                                  ← Solid components, owns ALL timing
```

Rules that enforce this:

- `src/engine/` and `src/ai/` must never import from `src/ui/` or solid-js.
  They run headless (see `scripts/simulate.ts`) — keep it that way.
- The engine is **timing-agnostic**: no timers, no async, no animation
  knowledge. Pacing lives in the UI (e.g. battle steps: the engine exposes
  `startBattle()` + `battleStep()` as a pull-based step machine; the UI calls
  steps on its own clock).
- UI reads engine state directly (mutable objects) and is re-rendered via a
  version signal bumped by `engine.setOnChange()`. Everything the UI needs
  must be exposed as readable state or query methods — never callbacks into
  UI code.
- AI (`CpuPlayer`) talks to the engine through the same public action methods
  as the UI. Engine actions operate on the *current turn player* — AI must
  guard `engine.turn === this.id` before acting (stale scheduled calls once
  played for the human; don't regress this).
- New mechanics: implement + verify in the engine first (headless), then wire
  UI. Always run `bun run simulate 50` after engine changes — all matches must
  complete with 0 script warnings.

## Key engine concepts

- **Card effect scripts**: the 301 master cards carry JS source strings
  (`support_script`, `x_effect_script`) executed by `ScriptRunner` via
  `new Function("own", "opponent", "commands", script)`. The `CombatantCtx`
  property names (snake_case: `c_power`, `is_first_attack`, `is_countering`,
  `jamming`, `is_absorbing`, `is_crashing`, `is_reviving`, …) are a **frozen
  contract** with the card data — never rename them.
- Commands queue: `draw-card|own|N`, `move-card|side|from|to|count|pos`,
  `shuffle|own|deck` — relative to the script owner's side.
- **Battle contexts are throwaway**: built fresh each battle from
  `base stat × penalty`; only HP persists back. Support boosts/specialty
  changes must never leak across battles.
- **Evolution stacking**: digivolving stacks the old form under the new one
  (`ActiveDigimon.stack`); the whole stack trashes together on KO;
  Digi-devolve pops it. Penalty (1 / 0.5 / 0.25) is inherited by natural
  digivolution; Download/Mutant/Special remove it; Speed requires unpenalized.
- **Turn flow**: draw (auto, with mulligan rules) → deploy phase (only when
  field empty; cancel/switch until finalized) → digivolve phase (1 DP stock
  per turn, undoable; digivolve options; redraw before first action) →
  battle-select → battle-resolve (stepped) → end turn. First to 3 points.
- DP slot: max 8 cards, value capped at 90.

## Data

- `src/data/master-cards.ts` (301 cards) and `src/data/deck-lists.ts`
  (125 prebuilt decks) are **generated artifacts** — do not hand-edit.
  Their seeds (migrate-master-cards.ts, DECKLIST.txt) were removed from the
  repo; treat the generated files as the source of truth now.
- Card numbers 293–300 are the digivolve option cards; 294/298 (Armor)
  are intentionally unimplemented until Armor level exists.
- "Dark Hand" doesn't exist in this card set — 5 decks legitimately run short.

## Commands

```bash
bun run dev          # Vite dev server (user runs this — never start it yourself)
bun run typecheck    # must stay at 0 errors
bun run simulate 50  # headless AI-vs-AI regression of full matches
bun run build        # production build
```

## Conventions

- TypeScript strict, no `any`/`unknown` casts; typecheck after every change.
- UI: Solid pitfalls already hit twice — the engine mutates objects in place,
  so never pass engine state through `<Show>`'s memoized children accessor;
  read the version-tracked accessor (`game()`) directly in JSX expressions.
- Hand rendering uses stable slots (`createStableHand`) — cards keep their
  position; duplicates of one card share an object reference (multiset
  reconciliation, indexOf-resolved actions).
- Battle log lines are user-facing game narration; keep them precise — they
  double as the debugging trail for effect scripts.
