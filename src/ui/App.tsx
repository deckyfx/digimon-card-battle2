import { For, Index, Show, createEffect, createSignal, onCleanup, untrack } from "solid-js";
import type { AttackType, MasterCard } from "@src/types";
import { GameEngine, type PlayerId, type PlayerState } from "@src/engine/game-engine";
import { CpuPlayer } from "@src/ai/cpu-player";
import { cardsByNumbers, getDeckById } from "@src/data/prebuilt-decks";
import { OPPONENT_ACTORS, PLAYER_ACTORS, getActorById } from "@src/data/actors";
import { CustomDeckStore } from "@src/store/custom-deck-store";
import { LocalStorageProvider } from "@src/store/storage-provider";
import { DeckBuilder } from "./DeckBuilder";
import { DeckColorBar } from "./DeckColorBar";
import { CardView, setInspectedCard, inspectedCard, specialtyClass } from "./CardView";

const RANDOM_DECK = "__random__";
const CUSTOM_PREFIX = "custom:";
const PREBUILT_PREFIX = "deck:";

/** Persistent custom decks (browser localStorage provider for now). */
export const customDeckStore = new CustomDeckStore(new LocalStorageProvider());

const CPU_DELAY_MS = 600;
const BATTLE_STEP_MS = 1000;

export function App() {
  const [engine, setEngine] = createSignal<GameEngine | null>(null);
  const [cpu, setCpu] = createSignal<CpuPlayer | null>(null);
  const [version, setVersion] = createSignal(0);
  const [playerDeck, setPlayerDeck] = createSignal<string>("");
  const [playerActorId, setPlayerActorId] = createSignal(0);
  const [cpuActorId, setCpuActorId] = createSignal(OPPONENT_ACTORS[0]?.id ?? 2);
  const [cpuDeck, setCpuDeck] = createSignal<string>(RANDOM_DECK);
  const cpuActor = () => getActorById(cpuActorId()) ?? OPPONENT_ACTORS[0]!;
  const [setupError, setSetupError] = createSignal("");

  /** Card numbers of the currently selected deck for a side ([] if unresolved). */
  const selectedNumbers = (value: string): string[] => {
    if (value.startsWith(CUSTOM_PREFIX)) return customDeckStore.get(value.slice(CUSTOM_PREFIX.length))?.cardNumbers ?? [];
    if (value.startsWith(PREBUILT_PREFIX)) return getDeckById(parseInt(value.slice(PREBUILT_PREFIX.length), 10))?.cardNumbers ?? [];
    return [];
  };
  const playerActor = () => getActorById(playerActorId()) ?? PLAYER_ACTORS[0]!;
  const [view, setView] = createSignal<"menu" | "builder">("menu");

  /** Custom decks re-read whenever we return from the builder. */
  const customDecks = () => {
    view();
    return customDeckStore.list();
  };

  // Auto-select the first custom deck — a listbox highlights its first row
  // without firing onChange, so an explicit default keeps state truthful.
  createEffect(() => {
    const decks = customDecks();
    if (playerDeck() === "" && decks[0]) setPlayerDeck(`custom:${decks[0].id}`);
  });

  /** Resolves a deck selection value ("deck:<id>" prebuilt or "custom:<uuid>"). */
  const resolveDeck = (value: string): { name: string; cards: ReturnType<typeof cardsByNumbers> } => {
    if (value.startsWith(CUSTOM_PREFIX)) {
      const deck = customDeckStore.get(value.slice(CUSTOM_PREFIX.length));
      if (deck) return { name: deck.name, cards: cardsByNumbers(deck.cardNumbers) };
    }
    if (value.startsWith(PREBUILT_PREFIX)) {
      const deck = getDeckById(parseInt(value.slice(PREBUILT_PREFIX.length), 10));
      if (deck) return { name: deck.name, cards: cardsByNumbers(deck.cardNumbers) };
    }
    const fallback = getDeckById(1);
    return { name: fallback?.name ?? "", cards: cardsByNumbers(fallback?.cardNumbers ?? []) };
  };
  // Dynamic visibility rule: revealed vs CPU for now; PvP will set this false.
  const [revealOpponentHand, setRevealOpponentHand] = createSignal(true);
  const [firstPlayer, setFirstPlayer] = createSignal<PlayerId | "random">("random");
  const [playerName, setPlayerName] = createSignal("Player");

  // Battle-select inputs for the human player.
  const [attack, setAttack] = createSignal<AttackType>("c");
  // Delay between battle steps (ms) — pacing only, not animation speed.
  const [battleSpeed, setBattleSpeed] = createSignal(
    parseInt(localStorage.getItem("battleStepMs") ?? "", 10) || BATTLE_STEP_MS,
  );
  const changeBattleSpeed = (ms: number) => {
    setBattleSpeed(ms);
    localStorage.setItem("battleStepMs", String(ms));
  };
  const [supportIdx, setSupportIdx] = createSignal<number | "deck" | null>(null);

  /** Version-tracked engine accessor — components re-render on every change. */
  const game = () => {
    version();
    return engine();
  };

  /** Final legality check — guards against hand-edited localStorage decks. */
  const deckIllegal = (cards: { number: string }[]): string | null => {
    if (cards.length !== 30) return `deck has ${cards.length} cards (must be exactly 30)`;
    const counts = new Map<string, number>();
    for (const c of cards) counts.set(c.number, (counts.get(c.number) ?? 0) + 1);
    if ([...counts.values()].some((n) => n > 4)) return "deck has more than 4 copies of a card";
    return null;
  };

  function startMatch() {
    setSetupError("");
    const mine = resolveDeck(playerDeck());
    if (mine.cards.length === 0) {
      setSetupError("Pick your deck first.");
      return;
    }
    const illegal = deckIllegal(mine.cards);
    if (illegal) {
      setSetupError(`"${mine.name}" is invalid: ${illegal}.`);
      return;
    }
    const actor = cpuActor();
    let cpuDeckValue: string;
    if (actor.isPlayer) {
      // Mirror match: the opponent plays the user's custom decks.
      const customs = customDecks();
      if (customs.length === 0) return;
      const valid = customs.some((d) => `custom:${d.id}` === cpuDeck());
      cpuDeckValue = valid
        ? cpuDeck()
        : `custom:${customs[Math.floor(Math.random() * customs.length)]!.id}`;
    } else {
      const ownedIds = actor.deckIds;
      const cpuDeckId =
        cpuDeck() === RANDOM_DECK || !ownedIds.some((id) => `deck:${id}` === cpuDeck())
          ? (ownedIds[Math.floor(Math.random() * ownedIds.length)] ?? 1)
          : parseInt(cpuDeck().slice(PREBUILT_PREFIX.length), 10);
      cpuDeckValue = `deck:${cpuDeckId}`;
    }
    const theirs = resolveDeck(cpuDeckValue);
    const eng = new GameEngine(mine.cards, theirs.cards, Date.now(), {
      playerName: playerName().trim(),
      cpuName: actor.name,
      playerDeckName: mine.name,
      cpuDeckName: theirs.name,
    });
    eng.log.push(`${eng.players.player.name} [${mine.name}] vs ${eng.players.cpu.name} [${theirs.name}]`);
    eng.setOnChange(() => setVersion((v) => v + 1));
    setCpu(new CpuPlayer(eng));
    setEngine(eng);
    setAttack("c");
    setSupportIdx(null);
    eng.startMatch(firstPlayer());
  }

  // Drive the CPU's prep phase automatically with a small delay for pacing.
  let cpuScheduled = false;
  createEffect(() => {
    const g = game();
    if (!g || cpuScheduled) return;
    if ((g.phase === "deploy" || g.phase === "digivolve") && g.turn === "cpu") {
      cpuScheduled = true;
      setTimeout(() => {
        cpuScheduled = false;
        // Re-check at fire time — the turn may have changed since scheduling.
        const cur = engine();
        if (cur && cur.turn === "cpu" && (cur.phase === "deploy" || cur.phase === "digivolve")) {
          cpu()?.runPrepPhase();
        }
      }, CPU_DELAY_MS);
    }
  });

  // Drive staged battle resolution: one step per beat so the UI can animate
  // support flips, effect glows, and strikes. The engine stays timing-agnostic.
  let battleScheduled = false;
  createEffect(() => {
    const g = game();
    if (!g || battleScheduled) return;
    if (g.phase === "battle-resolve") {
      battleScheduled = true;
      setTimeout(() => {
        battleScheduled = false;
        g.battleStep();
      }, battleSpeed());
    }
  });

  function confirmBattle() {
    const g = engine();
    const ai = cpu();
    if (!g || !ai || g.phase !== "battle-select") return;
    const si = supportIdx();
    const human = {
      attack: attack(),
      supportHandIndex: typeof si === "number" ? si : null,
      supportFromDeck: si === "deck",
    };
    if (g.turn === "player") {
      g.startBattle(human, ai.chooseBattle());
    } else {
      g.startBattle(ai.chooseBattle(), human);
    }
    setAttack("c");
    setSupportIdx(null);
  }

  return (
    <div class="layout">
      <Show
        when={game()}
        fallback={
          <Show
            when={view() === "menu"}
            fallback={<DeckBuilder store={customDeckStore} onBack={() => setView("menu")} />}
          >
          <div class="setup">
            <h1 class="game-title">DIGITAL CARD BATTLE</h1>
            <p class="subtitle">Battle Engine · 301 Cards · 125 Decks</p>

            <div class="setup-grid">
              <div class="setup-side">
                <h3>You</h3>
                <div class="portrait-row">
                  <For each={PLAYER_ACTORS}>
                    {(a) => (
                      <img
                        class="portrait"
                        classList={{ selected: playerActorId() === a.id }}
                        src={a.portrait}
                        alt={a.name}
                        onClick={() => setPlayerActorId(a.id)}
                      />
                    )}
                  </For>
                </div>
                <label>Name</label>
                <input
                  type="text"
                  value={playerName()}
                  onInput={(e) => setPlayerName(e.currentTarget.value)}
                  maxLength={20}
                />
                <div class="label-row">
                  <label>Deck (your custom decks)</label>
                  <button class="mini" onClick={() => setView("builder")}>🛠 Deck Builder</button>
                </div>
                <Show
                  when={customDecks().length > 0}
                  fallback={
                    <div class="tag">
                      No custom decks yet — build one!{" "}
                      <button onClick={() => setView("builder")}>🛠 Open Builder</button>
                    </div>
                  }
                >
                  <select size={Math.min(6, Math.max(3, customDecks().length))} onChange={(e) => setPlayerDeck(e.currentTarget.value)}>
                    <For each={customDecks()}>
                      {(d) => (
                        <option value={`custom:${d.id}`} selected={`custom:${d.id}` === playerDeck()}>
                          {d.name}
                        </option>
                      )}
                    </For>
                  </select>
                  <DeckColorBar cardNumbers={selectedNumbers(playerDeck())} />
                </Show>
              </div>

              <div class="setup-side">
                <h3>Opponent</h3>
                <ActorPicker
                  selectedId={cpuActorId()}
                  onPick={(id) => {
                    setCpuActorId(id);
                    setCpuDeck(RANDOM_DECK);
                  }}
                />
                <label>Their deck</label>
                <Show
                  when={!cpuActor().isPlayer}
                  fallback={
                    <Show
                      when={customDecks().length > 0}
                      fallback={<div class="tag">Mirror match needs a custom deck — build one first.</div>}
                    >
                      <select onChange={(e) => setCpuDeck(e.currentTarget.value)}>
                        <option value={RANDOM_DECK} selected={cpuDeck() === RANDOM_DECK}>
                          🎲 Random ({customDecks().length} custom deck{customDecks().length > 1 ? "s" : ""})
                        </option>
                        <For each={customDecks()}>
                          {(d) => (
                            <option value={`custom:${d.id}`} selected={`custom:${d.id}` === cpuDeck()}>
                              {d.name}
                            </option>
                          )}
                        </For>
                      </select>
                    </Show>
                  }
                >
                  <select onChange={(e) => setCpuDeck(e.currentTarget.value)}>
                    <option value={RANDOM_DECK} selected={cpuDeck() === RANDOM_DECK}>
                      🎲 Random ({cpuActor().deckIds.length} deck{cpuActor().deckIds.length > 1 ? "s" : ""})
                    </option>
                    <For each={cpuActor().deckIds}>
                      {(id) => {
                        const deck = getDeckById(id);
                        return (
                          <option value={`deck:${id}`} selected={`deck:${id}` === cpuDeck()}>
                            {deck?.name}
                            {deck?.note ? ` (${deck.note})` : ""}
                          </option>
                        );
                      }}
                    </For>
                  </select>
                </Show>
                <Show when={cpuDeck() !== RANDOM_DECK}>
                  <DeckColorBar cardNumbers={selectedNumbers(cpuDeck())} />
                </Show>
              </div>
            </div>

            <div class="setup-options">
              <span>
                First player:{" "}
                <select onChange={(e) => setFirstPlayer(e.currentTarget.value as PlayerId | "random")}>
                  <option value="random" selected={firstPlayer() === "random"}>
                    Random
                  </option>
                  <option value="player" selected={firstPlayer() === "player"}>
                    Me
                  </option>
                  <option value="cpu" selected={firstPlayer() === "cpu"}>
                    CPU
                  </option>
                </select>
              </span>
              <label>
                <input
                  type="checkbox"
                  checked={revealOpponentHand()}
                  onChange={(e) => setRevealOpponentHand(e.currentTarget.checked)}
                />{" "}
                Reveal CPU hand
              </label>
            </div>

            <Show when={setupError()}>
              <div class="warn" style={{ "margin-bottom": "8px" }}>
                ⚠ {setupError()}
              </div>
            </Show>
            <div class="setup-actions">
              <button class="primary" onClick={startMatch}>
                ▶ START MATCH
              </button>
            </div>
          </div>
          </Show>
        }
      >
        {/* Read game() directly in every expression: the engine object is
            mutated in place, so reactivity must flow through the version
            signal, not through Show's equality-memoized accessor. */}
        <div class="columns">
          <div class="column">
            <LogArea g={game()!} />
            <ControlPanel
              g={game()!}
              attack={attack()}
              setAttack={setAttack}
              supportIdx={supportIdx()}
              setSupportIdx={setSupportIdx}
              confirmBattle={confirmBattle}
            />
          </div>
          <div class="column-center">
            <OpponentArea p={game()!.players.cpu} g={game()!} revealHand={revealOpponentHand()} portrait={cpuActor().portrait} />
            <Battlefield
              g={game()!}
              support={
                game()!.phase !== "battle-select"
                  ? null
                  : supportIdx() === "deck"
                    ? "deck"
                    : typeof supportIdx() === "number"
                      ? (game()!.players.player.hand[supportIdx() as number] ?? null)
                      : null
              }
            />
            <PlayerArea
              g={game()!}
              portrait={playerActor().portrait}
              supportIdx={
                game()!.phase === "battle-select" && typeof supportIdx() === "number"
                  ? (supportIdx() as number)
                  : null
              }
            />
            <Show when={game()!.phase === "game-over"}>
              {/* Match-settled dialog with the final scoreboard. */}
              <div class="modal-overlay">
                <div class="modal">
                  <h2>Match Settled</h2>
                  <div class="scoreboard">
                    <div class="score-side" classList={{ winner: game()!.winner === "player" }}>
                      <img class="portrait" src={playerActor().portrait} alt={game()!.players.player.name} />
                      <div class="score-name">{game()!.players.player.name}</div>
                      <div class="score-points">{game()!.players.player.score}</div>
                    </div>
                    <div class="score-vs">—</div>
                    <div class="score-side" classList={{ winner: game()!.winner === "cpu" }}>
                      <img class="portrait" src={cpuActor().portrait} alt={game()!.players.cpu.name} />
                      <div class="score-name">{game()!.players.cpu.name}</div>
                      <div class="score-points">{game()!.players.cpu.score}</div>
                    </div>
                  </div>
                  <div class="modal-verdict">
                    🏆 {game()!.players[game()!.winner ?? "player"].name} Wins!
                  </div>
                  <div class="setup-actions">
                    <button class="primary" onClick={startMatch}>
                      ▶ Play Again
                    </button>
                    <button onClick={() => setEngine(null)}>Change Setup</button>
                  </div>
                </div>
              </div>
            </Show>
          </div>
          <div class="column">
            <TurnInfo g={game()!} />
            <div class="area">
              <h2>Battle Speed</h2>
              <input
                type="range"
                min="300"
                max="3000"
                step="100"
                value={battleSpeed()}
                onInput={(e) => changeBattleSpeed(parseInt(e.currentTarget.value, 10))}
                style={{ width: "100%" }}
              />
              <div class="tag">{(battleSpeed() / 1000).toFixed(1)}s per action</div>
            </div>
            <CardInspector />
          </div>
        </div>
      </Show>
    </div>
  );
}

/**
 * Animated number: eases the displayed value toward the target so counters
 * (HP, DP, deck, trash) visibly step up/down instead of jumping.
 */
function createTicker(target: () => number, durationMs = 600, fromZero = false): () => number {
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
function Ticker(props: { value: number; fromZero?: boolean }) {
  const display = createTicker(() => props.value, 600, props.fromZero ?? false);
  return <>{display()}</>;
}

/**
 * Stable hand slots: cards keep their slot when others are used, so the view
 * never shifts — a used card simply leaves an empty slot. New draws fill the
 * first empty slots. Duplicate copies share a card object, so reconciliation
 * is multiset-based.
 */
function createStableHand(hand: () => MasterCard[]): () => (MasterCard | null)[] {
  let prev: (MasterCard | null)[] = [];
  return () => {
    const counts = new Map<MasterCard, number>();
    for (const c of hand()) counts.set(c, (counts.get(c) ?? 0) + 1);

    // Keep cards that are still in hand in their existing slots.
    const slots: (MasterCard | null)[] = prev.map((c) => {
      if (c && (counts.get(c) ?? 0) > 0) {
        counts.set(c, (counts.get(c) as number) - 1);
        return c;
      }
      return null;
    });

    // Place newly drawn cards into the first empty slots.
    for (const [card, n] of counts) {
      for (let k = 0; k < n; k++) {
        const empty = slots.indexOf(null);
        if (empty !== -1) slots[empty] = card;
        else slots.push(card);
      }
    }

    // Normalize to the 4 standard slots (allow temporary overflow).
    while (slots.length > 4 && slots[slots.length - 1] === null) slots.pop();
    while (slots.length < 4) slots.push(null);
    prev = slots;
    return slots;
  };
}

/**
 * Side rail beside the hand: deck/trash counts and the three win lights
 * (one turns green per point scored; three lights = match won).
 * `mirrored` flips the order for the player side (lights on top).
 */
function SideRail(props: { p: PlayerState; mirrored?: boolean }) {
  const counts = (
    <>
      <div class="rail-stat">
        <div class="rail-label">Deck</div>
        <div class="rail-num">
          <Ticker value={props.p.deck.length} />
        </div>
      </div>
      <div class="rail-stat">
        <div class="rail-label">Trash</div>
        <div class="rail-num">
          <Ticker value={props.p.trash.length} />
        </div>
      </div>
    </>
  );
  const lights = (
    <div class="win-lights">
      <For each={[0, 1, 2]}>{(i) => <div class="win-light" classList={{ on: props.p.score > i }} />}</For>
    </div>
  );
  return (
    <div class="rail">
      {props.mirrored ? lights : counts}
      {props.mirrored ? counts : lights}
    </div>
  );
}

/**
 * Battle-zone card: shows EFFECTIVE values — penalty-adjusted powers, live
 * battle boosts while a battle is resolving, and current HP.
 */
function ActiveDigimonView(props: { p: PlayerState; g: GameEngine }) {
  // Read props.p.active directly — the object is mutated in place, so going
  // through Show's memoized children accessor would freeze HP updates.
  const a = () => props.p.active;

  /** Live battle side for this player, when a battle is resolving. */
  const side = () => {
    const b = props.g.activeBattle;
    if (!b) return null;
    return b.ownerId === props.p.id ? b.owner : b.defender;
  };

  const pow = (t: "c" | "t" | "x") => {
    const sd = side();
    if (sd) return Math.round(sd.ctx[`${t}_power`]);
    const act = a();
    return act ? Math.round(act.card[`${t}_pow`] * act.penalty) : 0;
  };

  return (
    <Show when={a()} fallback={<div class="card empty">— no active Digimon —</div>}>
      <div class={`card battler ${specialtyClass(a()!.card)}`} onMouseEnter={() => setInspectedCard(a()!.card)}>
        <div class="name-row">
          <span class="name">{a()!.card.name}</span>
          <span class="lvl">{a()!.card.level}</span>
        </div>
        <div>
          HP: <Ticker value={a()!.hp} fromZero />/<Ticker value={a()!.maxHp} fromZero />
          {a()!.penalty < 1 ? ` · ×${a()!.penalty}` : ""}
        </div>
        <div class="hp-bar">
          <div style={{ width: `${Math.max(0, Math.min(100, (a()!.hp / a()!.maxHp) * 100))}%` }} />
        </div>
        <div class="stat-split">
          <span>
            ○ <Ticker value={pow("c")} fromZero />
          </span>
          <span>
            △ <Ticker value={pow("t")} fromZero />
          </span>
        </div>
        <div>
          ✕ <Ticker value={pow("x")} fromZero />
        </div>
        <Show when={a()!.card.x_effect}>
          <div class="effect">✕: {a()!.card.x_effect}</div>
        </Show>
        <Show when={a()!.stack.length > 0}>
          <div class="tag">Stacked: {a()!.stack.map((c) => c.name).join(" → ")}</div>
        </Show>
      </div>
    </Show>
  );
}

function OpponentArea(props: { p: PlayerState; g: GameEngine; revealHand: boolean; portrait?: string }) {
  const slots = createStableHand(() => props.p.hand);
  return (
    <div class="area">
      <h2 class="split-head">
        <span class="head-id">
          <Show when={props.portrait}>
            <img class="portrait small" src={props.portrait} alt={props.p.name} />
          </Show>
          {props.p.name}
        </span>
        <span>{props.p.deckName}</span>
      </h2>
      {/* Side rail + hand; active Digimon lives in the battlefield below. */}
      <div class="with-rail">
        <SideRail p={props.p} />
        <div class="rail-main">
          <Show when={props.revealHand}>
            <div class="row">
              <Index each={slots()}>
                {(slot) => (
                  <Show when={slot()} fallback={<div class="card empty">— empty slot —</div>}>
                    <CardView card={slot() as MasterCard} />
                  </Show>
                )}
              </Index>
            </div>
          </Show>
        </div>
        <TurnTab on={props.g.turn === "cpu"} />
      </div>
    </div>
  );
}

/** Left-column control panel: all phase actions + battle selection. */
function ControlPanel(props: {
  g: GameEngine;
  attack: AttackType;
  setAttack: (a: AttackType) => void;
  supportIdx: number | "deck" | null;
  setSupportIdx: (i: number | "deck" | null) => void;
  confirmBattle: () => void;
}) {
  const p = () => props.g.players.player;
  const isMyTurn = () => props.g.turn === "player";
  const isMyDeploy = () => props.g.phase === "deploy" && isMyTurn();
  const isMyDigivolve = () => props.g.phase === "digivolve" && isMyTurn();
  const isBattleSelect = () => props.g.phase === "battle-select";

  return (
    <div class="area controls">
      <h2>Controls</h2>

      <Show when={isMyDeploy()}>
        <button class="primary" disabled={!p().active} onClick={() => props.g.finalizeDeploy()}>
          Finalize Deploy → Digivolve
        </button>
        <Show when={p().active}>
          <button onClick={() => props.g.cancelDeploy()}>Cancel Deploy</button>
        </Show>
        <Show when={props.g.canRedrawHand()}>
          <button onClick={() => props.g.redrawHand()}>Trash Hand & Redraw</button>
        </Show>
      </Show>

      <Show when={isMyDigivolve()}>
        <button class="primary" onClick={() => props.g.endPrep()}>
          {props.g.opponentOf("player").active ? "To Battle" : "Pass Turn"}
        </button>
        <Show when={props.g.canRedrawHand()}>
          <button onClick={() => props.g.redrawHand()}>Trash Hand & Redraw</button>
        </Show>
        <Show when={props.g.canCancelStockDp()}>
          <button onClick={() => props.g.cancelStockDp()}>Undo DP Stock</button>
        </Show>
      </Show>

      <Show when={isBattleSelect()}>
        <div class="tag">Choose attack &amp; support</div>
        <div class="attack-row">
          <For each={["c", "t", "x"] as AttackType[]}>
            {(t) => {
              const label = { c: "○", t: "△", x: "✕" }[t];
              const pow = () => {
                const act = p().active;
                if (!act) return 0;
                const base = { c: act.card.c_pow, t: act.card.t_pow, x: act.card.x_pow }[t];
                return Math.round(base * act.penalty);
              };
              return (
                <button classList={{ primary: props.attack === t }} onClick={() => props.setAttack(t)}>
                  {label} {pow()}
                </button>
              );
            }}
          </For>
        </div>
        <select
          onChange={(e) => {
            const v = e.currentTarget.value;
            props.setSupportIdx(v === "" ? null : v === "deck" ? "deck" : parseInt(v, 10));
          }}
        >
          <option value="" selected={props.supportIdx === null}>
            No support
          </option>
          <Show when={p().deck.length > 0}>
            <option value="deck" selected={props.supportIdx === "deck"}>
              🎲 Gamble: top of deck ({p().deck.length} left)
            </option>
          </Show>
          <For each={p().hand}>
            {(card, i) => (
              <option value={i()} selected={props.supportIdx === i()}>
                Support: {card.name}
              </option>
            )}
          </For>
        </select>
        <button class="primary" onClick={props.confirmBattle}>
          Fight!
        </button>
      </Show>

      <Show when={props.g.phase === "battle-resolve"}>
        <div class="tag">⚔ Battle resolving…</div>
      </Show>

      <Show when={!isMyDeploy() && !isMyDigivolve() && !isBattleSelect() && props.g.phase !== "battle-resolve"}>
        <div class="tag">Waiting…</div>
      </Show>
    </div>
  );
}

/** DP stack readout flanking the battle zone. */
function DpRail(props: { p: PlayerState; g: GameEngine; side: PlayerId }) {
  return (
    <div class={`rail dp-rail dp-${props.side}`}>
      <div class="rail-stat">
        <div class="rail-label">DP</div>
        <div class="rail-num">
          <Ticker value={props.g.dpTotal(props.p)} />
        </div>
        <div class="dp-slots">
          <For each={Array.from({ length: 8 })}>
            {(_, i) => <div class="dp-slot" classList={{ filled: i() < props.p.dpSlot.length }} />}
          </For>
        </div>
      </div>
    </div>
  );
}

/** Tall TURN tab shown in a hand row's right rail when it is that side's turn. */
function TurnTab(props: { on: boolean }) {
  return (
    <div class="turn-rail">
      <div class="turn-tab" classList={{ on: props.on }}>
        <span>T</span>
        <span>U</span>
        <span>R</span>
        <span>N</span>
      </div>
    </div>
  );
}

/** Opponent picker: search actors, click a portrait to choose. */
function ActorPicker(props: { selectedId: number; onPick: (id: number) => void }) {
  const [query, setQuery] = createSignal("");
  // Player actors are selectable too — they bring the user's custom decks.
  const matches = () =>
    [...PLAYER_ACTORS, ...OPPONENT_ACTORS].filter((a) =>
      a.name.toLowerCase().includes(query().toLowerCase()),
    );
  const selected = () => getActorById(props.selectedId);
  return (
    <div>
      <div class="actor-selected">
        <img class="portrait selected" src={selected()?.portrait} alt={selected()?.name} />
        <span class="actor-name">{selected()?.name}</span>
      </div>
      <input
        type="text"
        placeholder="🔍 Search opponents…"
        value={query()}
        onInput={(e) => setQuery(e.currentTarget.value)}
      />
      <div class="actor-grid">
        <For each={matches()}>
          {(a) => (
            <img
              class="portrait"
              classList={{ selected: props.selectedId === a.id }}
              src={a.portrait}
              alt={a.name}
              title={a.name}
              onClick={() => props.onPick(a.id)}
            />
          )}
        </For>
      </div>
    </div>
  );
}

/** Right-panel full card details for the hovered card (any side's). */
export function CardInspector() {
  const c = () => inspectedCard();
  return (
    <div class="area">
      <h2>Card Details</h2>
      <Show when={c()} fallback={<div class="tag">Hover a card to inspect it.</div>}>
        <div class="inspect">
          <img class="inspect-img" src={c()!.img_src} alt={c()!.name} />
          <div class="name-row">
            <span class="name">
              #{c()!.number} {c()!.name}
            </span>
            <Show when={c()!.type === "Digimon"}>
              <span class="lvl">{c()!.level}</span>
            </Show>
          </div>
          <div class="tag">
            {c()!.type}
            {c()!.type === "Digimon" ? ` · ${c()!.specialty}` : ""}
          </div>
          <Show when={c()!.type === "Digimon"}>
            <div>HP {c()!.hp}</div>
            <div>
              DP gives {c()!.dp_point} · costs {c()!.dp_required} to digivolve into
            </div>
            <div class="inspect-attacks">
              <div>
                ○ {c()!.c_attack} — {c()!.c_pow}
              </div>
              <div>
                △ {c()!.t_attack} — {c()!.t_pow}
              </div>
              <div>
                ✕ {c()!.x_attack} — {c()!.x_pow}
              </div>
            </div>
            <Show when={c()!.x_effect}>
              <div class="effect">✕ effect: {c()!.x_effect}</div>
            </Show>
          </Show>
          <div class="effect">Support: {c()!.support || "None"}</div>
        </div>
      </Show>
    </div>
  );
}

/** Right-panel turn & phase readout. */
function TurnInfo(props: { g: GameEngine }) {
  const phaseLabel = () =>
    ({
      setup: "Setting up…",
      deploy: "Deploy Phase",
      digivolve: "Digivolve Phase",
      "battle-select": "Battle — choose attack & support",
      "battle-resolve": "Battle!",
      "game-over": "Match over",
    })[props.g.phase];
  const turnLabel = () =>
    props.g.phase === "game-over"
      ? `${props.g.players[props.g.winner ?? "player"].name} wins`
      : props.g.turn === "player"
        ? "Your turn"
        : `${props.g.players.cpu.name}'s turn`;
  return (
    <div class="area">
      <h2>Turn {props.g.turnCount}</h2>
      <div class="turn-info-name">{turnLabel()}</div>
      <div class="tag">{phaseLabel()}</div>
    </div>
  );
}

/** Shared battle zone: both active Digimon overlapping face-to-face. */
function Battlefield(props: { g: GameEngine; support: MasterCard | "deck" | null }) {
  const battle = () => props.g.activeBattle;
  const fx = () => props.g.currentFx;

  const sideFor = (id: PlayerId) => {
    const b = battle();
    return b ? (b.ownerId === id ? b.owner : b.defender) : null;
  };

  /** Support to display for a side: live battle side, or the player's pick. */
  const supportFor = (id: PlayerId): { card: MasterCard | null; faceUp: boolean } | null => {
    const side = sideFor(id);
    if (side) {
      if (!side.support) return null;
      // Own hand supports are known; gambles and the CPU's stay facedown
      // until the resolver reveals them.
      const faceUp = side.revealed || (id === "player" && !side.fromDeck);
      return { card: side.support, faceUp };
    }
    if (id === "player" && props.support) {
      return props.support === "deck" ? { card: null, faceUp: false } : { card: props.support, faceUp: true };
    }
    return null;
  };

  const sideClass = (id: PlayerId) => ({
    "fx-strike": fx()?.kind === "strike" && fx()?.side === id,
    "fx-hit": fx()?.kind === "strike" && fx()?.side !== id && battle() !== null,
    "fx-glow": (fx()?.kind === "support" || fx()?.kind === "x-effect") && fx()?.side === id,
  });

  return (
    <div class="area">
      <div class="with-rail">
        {/* DP stacks flank the battle zone: yours bottom-left, theirs top-right. */}
        <DpRail p={props.g.players.player} g={props.g} side="player" />
        <div class="vs-zone rail-main">
          <div class="vs-side vs-player vs-with-support" classList={sideClass("player")}>
            <ActiveDigimonView p={props.g.players.player} g={props.g} />
            <SupportDock s={supportFor("player")} />
          </div>
          <div class="vs-side vs-cpu vs-with-support" classList={sideClass("cpu")}>
            <SupportDock s={supportFor("cpu")} />
            <ActiveDigimonView p={props.g.players.cpu} g={props.g} />
          </div>
        </div>
        <DpRail p={props.g.players.cpu} g={props.g} side="cpu" />
      </div>
    </div>
  );
}

/** Docked support card display (face up or mystery-down). */
function SupportDock(props: { s: { card: MasterCard | null; faceUp: boolean } | null }) {
  return (
    <Show when={props.s}>
      <div class="support-card">
        <div class="tag">Support</div>
        <Show when={props.s!.faceUp && props.s!.card} fallback={<div class="card mystery">?</div>}>
          <CardView card={props.s!.card as MasterCard} />
        </Show>
      </div>
    </Show>
  );
}

function LogArea(props: { g: GameEngine }) {
  // Newest first — no autoscroll needed, the latest line is always on top.
  const reversed = () => [...props.g.log].reverse();
  return (
    <div class="area">
      <h2>Battle Log</h2>
      <div class="log">
        <For each={reversed()}>
          {(line) => <div classList={{ "turn-marker": line.startsWith("—") }}>{line}</div>}
        </For>
      </div>
    </div>
  );
}

function PlayerArea(props: { g: GameEngine; supportIdx: number | null; portrait?: string }) {
  const p = () => props.g.players.player;
  const slots = createStableHand(() => p().hand);

  /** Slot currently lent to the battlefield as the selected support card. */
  const supportSlotIdx = () => {
    const si = props.supportIdx;
    if (si === null) return -1;
    const hand = p().hand;
    const target = hand[si];
    if (!target) return -1;
    // With duplicate copies, match the Nth copy in hand to the Nth slot copy.
    const copyN = hand.slice(0, si).filter((c) => c === target).length;
    let seen = 0;
    const sl = slots();
    for (let i = 0; i < sl.length; i++) {
      if (sl[i] === target) {
        if (seen === copyN) return i;
        seen++;
      }
    }
    return -1;
  };
  const isMyTurn = () => props.g.turn === "player";
  const isMyDeploy = () => props.g.phase === "deploy" && isMyTurn();
  const isMyDigivolve = () => props.g.phase === "digivolve" && isMyTurn();
  const isMyPrep = () => isMyDeploy() || isMyDigivolve();
  /** Digivolve option cards currently in hand: [handIndex, kind, eligible target indices]. */
  const digiOptions = () =>
    p()
      .hand.map((card, index) => ({ index, kind: props.g.digivolveOptionKind(card) }))
      .filter((o): o is { index: number; kind: NonNullable<ReturnType<typeof props.g.digivolveOptionKind>> } => o.kind !== null)
      .map((o) => ({ ...o, targets: props.g.digivolveOptionTargets(p(), o.kind) }));

  const optionLabel: Record<string, string> = {
    download: "Download",
    special: "Special",
    mutant: "Mutant",
    warp: "Warp",
    speed: "Speed",
    devolve: "Devolve",
  };

  const optionEffective = (o: { kind: string; targets: number[] }) =>
    o.kind === "devolve" ? props.g.canDevolve(p()) : o.targets.length > 0;

  return (
    <div class="area">
      <div class="with-rail" style={{ "margin-top": "10px" }}>
        <SideRail p={p()} mirrored />
        <div class="rail-main">
          <div class="row">
            <Index each={slots()}>
              {(slot, slotIdx) => {
                const card = () => slot() as MasterCard;
                const hi = () => p().hand.indexOf(card());
                const lentAsSupport = () => slotIdx === supportSlotIdx();
                const targetOptions = () =>
                  isMyDigivolve() ? digiOptions().filter((o) => o.targets.includes(hi())) : [];
                /** Any action available? No actions → no speech balloon. */
                const hasActions = () =>
                  (isMyDeploy() && props.g.isDeployable(card())) ||
                  (isMyDigivolve() &&
                    ((props.g.isDeployable(card()) && !props.g.dpStockedThisTurn && props.g.canStockMoreDp(p())) ||
                      props.g.canEvolve(p(), card()) ||
                      props.g.digivolveOptionKind(card()) !== null ||
                      targetOptions().length > 0));
                return (
                  <Show
                    when={slot() && !lentAsSupport()}
                    fallback={
                      <div class="card empty">{lentAsSupport() ? "→ support" : "— empty slot —"}</div>
                    }
                  >
                    <CardView card={card()}>
                      <Show when={isMyPrep() && hasActions()}>
                        {/* Manga balloon with action icons over the card's head. */}
                        <div class="bubbles">
                          <Show when={isMyDeploy() && props.g.isDeployable(card())}>
                            <button
                              title={`${p().active ? "Switch deployment to this" : "Deploy"}${
                                props.g.deployPenaltyFor(card()) < 1
                                  ? ` — penalized ×${props.g.deployPenaltyFor(card())}`
                                  : ""
                              }`}
                              onClick={() => props.g.deploy(hi())}
                            >
                              {props.g.deployPenaltyFor(card()) === 1
                                ? "OK"
                                : props.g.deployPenaltyFor(card()) === 0.5
                                  ? "⚠½"
                                  : "⚠¼"}
                            </button>
                          </Show>
                          <Show
                            when={
                              isMyDigivolve() &&
                              props.g.isDeployable(card()) &&
                              !props.g.dpStockedThisTurn &&
                              props.g.canStockMoreDp(p())
                            }
                          >
                            <button title="Stock DP" onClick={() => props.g.stockDp(hi())}>
                              DP⬆
                            </button>
                          </Show>
                          <Show when={isMyDigivolve() && props.g.canEvolve(p(), card())}>
                            <button title="Digivolve" onClick={() => props.g.evolve(hi())}>
                              Digivolve
                            </button>
                          </Show>
                          {/* "Use" a digivolve option card (ineffective use trashes it). */}
                          <Show when={isMyDigivolve() && props.g.digivolveOptionKind(card())}>
                            {(kind) => {
                              const opt = () => digiOptions().find((o) => o.index === hi());
                              const hasTargets = () => (opt()?.targets.length ?? 0) > 0;
                              const effective = () =>
                                kind() === "devolve" ? props.g.canDevolve(p()) : hasTargets();
                              return (
                                <Show
                                  when={kind() === "devolve" || !hasTargets()}
                                  fallback={
                                    <span class="bubble-hint" title="Click Digivolve on the target card">
                                      Pick target →
                                    </span>
                                  }
                                >
                                  <button
                                    classList={{ fizzle: !effective() }}
                                    title={`Use ${optionLabel[kind()]}${effective() ? "" : " — no valid target, card will be trashed"}`}
                                    onClick={() => props.g.useDigivolveOption(hi())}
                                  >
                                    Use
                                  </button>
                                </Show>
                              );
                            }}
                          </Show>
                          {/* Target bubbles: one per digivolve option that can reach this card. */}
                          <For each={targetOptions()}>
                            {(o) => (
                              <button
                                title={`${optionLabel[o.kind]} Digivolve → this card`}
                                onClick={() => props.g.useDigivolveOption(o.index, hi())}
                              >
                                Digivolve
                              </button>
                            )}
                          </For>
                        </div>
                      </Show>
                    </CardView>
                  </Show>
                );
              }}
            </Index>
          </div>
        </div>
        <TurnTab on={props.g.turn === "player"} />
      </div>

      {/* Identity + stats at the bottom, mirroring the opponent layout. */}
      <h2 class="split-head" style={{ "margin-top": "10px" }}>
        <span class="head-id">
          <Show when={props.portrait}>
            <img class="portrait small" src={props.portrait} alt={p().name} />
          </Show>
          {p().name}
        </span>
        <span>{p().deckName}</span>
      </h2>
    </div>
  );
}
