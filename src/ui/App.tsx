import { For, Show, createEffect, createSignal } from "solid-js";
import type { AttackType } from "@src/types";
import { GameEngine, type PlayerId, type PlayerState } from "@src/engine/game-engine";
import { CpuPlayer } from "@src/ai/cpu-player";
import { DECK_NAMES, buildDeck, randomDeckName } from "@src/data/prebuilt-decks";
import { CardView } from "./CardView";

const RANDOM_DECK = "__random__";

const CPU_DELAY_MS = 600;

export function App() {
  const [engine, setEngine] = createSignal<GameEngine | null>(null);
  const [cpu, setCpu] = createSignal<CpuPlayer | null>(null);
  const [version, setVersion] = createSignal(0);
  const [playerDeck, setPlayerDeck] = createSignal<string>(DECK_NAMES[0] ?? "Tutorial Deck");
  const [cpuDeck, setCpuDeck] = createSignal<string>(RANDOM_DECK);
  // Dynamic visibility rule: revealed vs CPU for now; PvP will set this false.
  const [revealOpponentHand, setRevealOpponentHand] = createSignal(true);
  const [firstPlayer, setFirstPlayer] = createSignal<PlayerId | "random">("random");
  const [playerName, setPlayerName] = createSignal("Player");
  const [cpuName, setCpuName] = createSignal("CPU");

  // Battle-select inputs for the human player.
  const [attack, setAttack] = createSignal<AttackType>("c");
  const [supportIdx, setSupportIdx] = createSignal<number | null>(null);

  /** Version-tracked engine accessor — components re-render on every change. */
  const game = () => {
    version();
    return engine();
  };

  function startMatch() {
    const cpuDeckName = cpuDeck() === RANDOM_DECK ? randomDeckName() : cpuDeck();
    const eng = new GameEngine(buildDeck(playerDeck()), buildDeck(cpuDeckName), Date.now(), {
      playerName: playerName().trim(),
      cpuName: cpuName().trim(),
      playerDeckName: playerDeck(),
      cpuDeckName,
    });
    eng.log.push(`${eng.players.player.name} [${playerDeck()}] vs ${eng.players.cpu.name} [${cpuDeckName}]`);
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
        cpu()?.runPrepPhase();
      }, CPU_DELAY_MS);
    }
  });

  function confirmBattle() {
    const g = engine();
    const ai = cpu();
    if (!g || !ai || g.phase !== "battle-select") return;
    const human = { attack: attack(), supportHandIndex: supportIdx() };
    if (g.turn === "player") {
      g.resolveBattlePhase(human, ai.chooseBattle());
    } else {
      g.resolveBattlePhase(ai.chooseBattle(), human);
    }
    setAttack("c");
    setSupportIdx(null);
  }

  return (
    <div class="layout">
      <Show
        when={game()}
        fallback={
          <div class="area banner">
            <h1>Digital Card Battle</h1>
            <p>
              Your name:{" "}
              <input
                type="text"
                value={playerName()}
                onInput={(e) => setPlayerName(e.currentTarget.value)}
                maxLength={20}
              />{" "}
              CPU name:{" "}
              <input type="text" value={cpuName()} onInput={(e) => setCpuName(e.currentTarget.value)} maxLength={20} />
            </p>
            <p>
              Your deck:{" "}
              <select onChange={(e) => setPlayerDeck(e.currentTarget.value)}>
                <For each={DECK_NAMES}>
                  {(name) => <option value={name} selected={name === playerDeck()}>{name}</option>}
                </For>
              </select>
            </p>
            <p>
              CPU deck:{" "}
              <select onChange={(e) => setCpuDeck(e.currentTarget.value)}>
                <option value={RANDOM_DECK} selected={cpuDeck() === RANDOM_DECK}>
                  Random
                </option>
                <For each={DECK_NAMES}>
                  {(name) => <option value={name} selected={name === cpuDeck()}>{name}</option>}
                </For>
              </select>
            </p>
            <p>
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
            </p>
            <p>
              <label>
                <input
                  type="checkbox"
                  checked={revealOpponentHand()}
                  onChange={(e) => setRevealOpponentHand(e.currentTarget.checked)}
                />{" "}
                Reveal opponent's hand (vs CPU)
              </label>
            </p>
            <button class="primary" onClick={startMatch}>
              Start Match
            </button>
          </div>
        }
      >
        {/* Read game() directly in every expression: the engine object is
            mutated in place, so reactivity must flow through the version
            signal, not through Show's equality-memoized accessor. */}
        <OpponentArea p={game()!.players.cpu} g={game()!} revealHand={revealOpponentHand()} />
        <LogArea g={game()!} />
        <PlayerArea
          g={game()!}
          attack={attack()}
          setAttack={setAttack}
          supportIdx={supportIdx()}
          setSupportIdx={setSupportIdx}
          confirmBattle={confirmBattle}
        />
        <Show when={game()!.phase === "game-over"}>
          <div class="area banner">
            {game()!.winner === "player"
              ? `🏆 ${game()!.players.player.name} wins!`
              : `💀 ${game()!.players.cpu.name} wins!`}{" "}
            <button class="primary" onClick={startMatch}>
              Play Again
            </button>
          </div>
        </Show>
      </Show>
    </div>
  );
}

function Stats(props: { p: PlayerState; g: GameEngine }) {
  return (
    <div class="stats">
      <span class="score">★ {props.p.score}/3</span>
      <span>Deck {props.p.deck.length}</span>
      <span>Hand {props.p.hand.length}</span>
      <span>Trash {props.p.trash.length}</span>
      <span>
        DP {props.g.dpTotal(props.p)} ({props.p.dpSlot.length} cards)
      </span>
    </div>
  );
}

function ActiveDigimonView(props: { p: PlayerState }) {
  // Read props.p.active directly — the object is mutated in place, so going
  // through Show's memoized children accessor would freeze HP updates.
  const a = () => props.p.active;
  return (
    <Show when={a()} fallback={<div class="card">— no active Digimon —</div>}>
      <CardView card={a()!.card}>
        <div>
          HP {a()!.hp}/{a()!.maxHp}
          {a()!.penalty < 1 ? ` · ×${a()!.penalty} penalty` : ""}
        </div>
        <Show when={a()!.penalty < 1}>
          <div class="warn">
            Effective: ○{Math.round(a()!.card.c_pow * a()!.penalty)} △{Math.round(a()!.card.t_pow * a()!.penalty)} ✕
            {Math.round(a()!.card.x_pow * a()!.penalty)}
          </div>
        </Show>
        <div class="hp-bar">
          <div style={{ width: `${Math.max(0, Math.min(100, (a()!.hp / a()!.maxHp) * 100))}%` }} />
        </div>
        <Show when={a()!.stack.length > 0}>
          <div class="tag">Stacked: {a()!.stack.map((c) => c.name).join(" → ")}</div>
        </Show>
      </CardView>
    </Show>
  );
}

function OpponentArea(props: { p: PlayerState; g: GameEngine; revealHand: boolean }) {
  return (
    <div class="area">
      <h2>
        {props.p.name} · {props.p.deckName}
        {props.g.turn === "cpu" ? " — their turn" : ""}
      </h2>
      <Stats p={props.p} g={props.g} />
      <ActiveDigimonView p={props.p} />
      <Show when={props.revealHand}>
        <h2 style={{ "margin-top": "10px" }}>Opponent Hand (revealed vs CPU)</h2>
        <div class="row">
          <For each={props.p.hand}>{(card) => <CardView card={card} />}</For>
        </div>
      </Show>
    </div>
  );
}

function LogArea(props: { g: GameEngine }) {
  let ref: HTMLDivElement | undefined;
  createEffect(() => {
    props.g.log.length; // track via parent version signal re-render
    if (ref) ref.scrollTop = ref.scrollHeight;
  });
  return (
    <div class="area">
      <h2>Battle Log</h2>
      <div class="log" ref={ref}>
        <For each={props.g.log}>
          {(line) => <div classList={{ "turn-marker": line.startsWith("—") }}>{line}</div>}
        </For>
      </div>
    </div>
  );
}

function PlayerArea(props: {
  g: GameEngine;
  attack: AttackType;
  setAttack: (a: AttackType) => void;
  supportIdx: number | null;
  setSupportIdx: (i: number | null) => void;
  confirmBattle: () => void;
}) {
  const p = () => props.g.players.player;
  const isMyTurn = () => props.g.turn === "player";
  const isMyDeploy = () => props.g.phase === "deploy" && isMyTurn();
  const isMyDigivolve = () => props.g.phase === "digivolve" && isMyTurn();
  const isMyPrep = () => isMyDeploy() || isMyDigivolve();
  const isBattleSelect = () => props.g.phase === "battle-select";
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
      <h2>
        {p().name} · {p().deckName}
        {isMyTurn()
          ? ` — your turn${isMyDeploy() ? " · Deploy Phase" : isMyDigivolve() ? " · Digivolve Phase" : ""}`
          : ""}
      </h2>
      <Stats p={p()} g={props.g} />
      <ActiveDigimonView p={p()} />

      <Show when={isBattleSelect()}>
        <h2 style={{ "margin-top": "10px" }}>Battle — choose attack &amp; support</h2>
        <div class="row">
          <For each={["c", "t", "x"] as AttackType[]}>
            {(t) => {
              const a = () => p().active;
              const label = { c: "○", t: "△", x: "✕" }[t];
              const pow = () => {
                const act = a();
                if (!act) return 0;
                const base = { c: act.card.c_pow, t: act.card.t_pow, x: act.card.x_pow }[t];
                return Math.round(base * act.penalty);
              };
              return (
                <button
                  classList={{ primary: props.attack === t }}
                  onClick={() => props.setAttack(t)}
                >
                  {label} {pow()}
                </button>
              );
            }}
          </For>
          <select
            onChange={(e) => {
              const v = e.currentTarget.value;
              props.setSupportIdx(v === "" ? null : parseInt(v, 10));
            }}
          >
            <option value="" selected={props.supportIdx === null}>
              No support
            </option>
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
        </div>
      </Show>

      <h2 style={{ "margin-top": "10px" }}>Hand</h2>
      <div class="row">
        <For each={p().hand}>
          {(card, i) => (
            <CardView card={card}>
              <Show when={isMyPrep()}>
                <div>
                  <Show when={isMyDeploy() && props.g.isDeployable(card)}>
                    <button onClick={() => props.g.deploy(i())}>{p().active ? "Switch to" : "Deploy"}</button>
                    <Show when={props.g.deployPenaltyFor(card) < 1}>
                      <div class="warn">
                        ⚠ Deploys penalized ×{props.g.deployPenaltyFor(card)} — HP{" "}
                        {Math.round(card.hp * props.g.deployPenaltyFor(card))} · ○
                        {Math.round(card.c_pow * props.g.deployPenaltyFor(card))} △
                        {Math.round(card.t_pow * props.g.deployPenaltyFor(card))} ✕
                        {Math.round(card.x_pow * props.g.deployPenaltyFor(card))}
                      </div>
                    </Show>
                  </Show>
                  <Show when={isMyDigivolve() && props.g.isDeployable(card) && !props.g.dpStockedThisTurn}>
                    <button onClick={() => props.g.stockDp(i())}>Stock DP</button>
                  </Show>
                  <Show when={isMyDigivolve() && props.g.canEvolve(p(), card)}>
                    <button onClick={() => props.g.evolve(i())}>Digivolve</button>
                  </Show>
                  {/* "Use" on a digivolve option card (ineffective use trashes it). */}
                  <Show when={isMyDigivolve() && props.g.digivolveOptionKind(card)}>
                    {(kind) => {
                      const opt = () => digiOptions().find((o) => o.index === i());
                      const effective = () => (opt() ? optionEffective(opt()!) : false);
                      return (
                        <button
                          title={effective() ? "" : "No valid target — card will be trashed"}
                          onClick={() => props.g.useDigivolveOption(i())}
                        >
                          Use {optionLabel[kind()]}
                          {effective() ? "" : " (no effect)"}
                        </button>
                      );
                    }}
                  </Show>
                  {/* Target buttons: one per digivolve option that can reach this card. */}
                  <For each={isMyDigivolve() ? digiOptions().filter((o) => o.targets.includes(i())) : []}>
                    {(o) => (
                      <button onClick={() => props.g.useDigivolveOption(o.index, i())}>
                        {optionLabel[o.kind]} → this
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </CardView>
          )}
        </For>
      </div>

      <Show when={isMyDeploy()}>
        <div style={{ "margin-top": "10px" }}>
          <button class="primary" disabled={!p().active} onClick={() => props.g.finalizeDeploy()}>
            Finalize Deploy → Digivolve Phase
          </button>{" "}
          <Show when={p().active}>
            <button onClick={() => props.g.cancelDeploy()}>Cancel Deploy</button>
          </Show>{" "}
          <Show when={props.g.canRedrawHand()}>
            <button onClick={() => props.g.redrawHand()}>Trash Hand &amp; Redraw</button>
          </Show>
        </div>
      </Show>

      <Show when={isMyDigivolve()}>
        <div style={{ "margin-top": "10px" }}>
          <button class="primary" onClick={() => props.g.endPrep()}>
            {props.g.opponentOf("player").active ? "To Battle" : "Pass Turn"}
          </button>{" "}
          <Show when={props.g.canRedrawHand()}>
            <button onClick={() => props.g.redrawHand()}>Trash Hand &amp; Redraw</button>
          </Show>{" "}
          <Show when={props.g.canCancelStockDp()}>
            <button onClick={() => props.g.cancelStockDp()}>Undo DP Stock</button>
          </Show>
        </div>
      </Show>
    </div>
  );
}
