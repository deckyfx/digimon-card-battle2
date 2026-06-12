import { Show, createEffect, createSignal } from "solid-js";
import type { AttackType } from "@src/types";
import { GameEngine, type PlayerId, type PlayerState } from "@src/engine/game-engine";
import { CpuPlayer } from "@src/ai/cpu-player";
import { OPPONENT_ACTORS, PLAYER_ACTORS, getActorById } from "@src/data/actors";
import { DeckBuilder } from "./DeckBuilder";
import { SetupScreen } from "./SetupScreen";
import { GameOverModal } from "./GameOverModal";
import { LogArea } from "./LogArea";
import { ControlPanel } from "./ControlPanel";
import { OpponentArea } from "./OpponentArea";
import { PlayerArea } from "./PlayerArea";
import { Battlefield } from "./Battlefield";
import { PromptDialogs } from "./PromptDialogs";
import { TurnInfo } from "./TurnInfo";
import { CardInspector } from "./CardInspector";
import { CUSTOM_PREFIX, PREBUILT_PREFIX, RANDOM_DECK, customDeckStore, deckIllegal, resolveDeck } from "./deck-select";

const CPU_DELAY_MS = 600;
const BATTLE_STEP_MS = 1000;

/**
 * Top-level app: match/setup state, the CPU and battle-step drivers, and
 * layout composition. All visual pieces live in their own modules.
 */
export function App() {
  const [engine, setEngine] = createSignal<GameEngine | null>(null);
  const [cpu, setCpu] = createSignal<CpuPlayer | null>(null);
  const [version, setVersion] = createSignal(0);
  const [playerDeck, setPlayerDeck] = createSignal<string>("");
  const [playerActorId, setPlayerActorId] = createSignal(0);
  const [cpuActorId, setCpuActorId] = createSignal(OPPONENT_ACTORS[0]?.id ?? 2);
  const [cpuDeck, setCpuDeck] = createSignal<string>(RANDOM_DECK);
  const cpuActor = () => getActorById(cpuActorId()) ?? OPPONENT_ACTORS[0]!;
  const playerActor = () => getActorById(playerActorId()) ?? PLAYER_ACTORS[0]!;
  const [setupError, setSetupError] = createSignal("");
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

  // Dynamic visibility rule: revealed vs CPU for now; PvP will set this false.
  const [revealOpponentHand, setRevealOpponentHand] = createSignal(true);
  const [firstPlayer, setFirstPlayer] = createSignal<PlayerId | "random">("random");
  const [playerName, setPlayerName] = createSignal("Player");

  // Per-turn prompt acknowledgements (keyed by engine turnCount).
  const [handOkTurn, setHandOkTurn] = createSignal(0);
  const [forcedAckTurn, setForcedAckTurn] = createSignal(0);

  // Battle-select inputs for the human player.
  const [attack, setAttack] = createSignal<AttackType>("c");
  // Two-step battle prompt: pick the attack first, then support / fight.
  const [attackConfirmed, setAttackConfirmed] = createSignal(false);
  const [supportIdx, setSupportIdx] = createSignal<number | "deck" | null>(null);

  // Delay between battle steps (ms) — pacing only, not animation speed.
  const [battleSpeed, setBattleSpeed] = createSignal(
    parseInt(localStorage.getItem("battleStepMs") ?? "", 10) || BATTLE_STEP_MS,
  );
  const changeBattleSpeed = (ms: number) => {
    setBattleSpeed(ms);
    localStorage.setItem("battleStepMs", String(ms));
  };

  /** Version-tracked engine accessor — components re-render on every change. */
  const game = () => {
    version();
    return engine();
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
        : `${CUSTOM_PREFIX}${customs[Math.floor(Math.random() * customs.length)]!.id}`;
    } else {
      const ownedIds = actor.deckIds;
      const cpuDeckId =
        cpuDeck() === RANDOM_DECK || !ownedIds.some((id) => `deck:${id}` === cpuDeck())
          ? (ownedIds[Math.floor(Math.random() * ownedIds.length)] ?? 1)
          : parseInt(cpuDeck().slice(PREBUILT_PREFIX.length), 10);
      cpuDeckValue = `${PREBUILT_PREFIX}${cpuDeckId}`;
    }
    const theirs = resolveDeck(cpuDeckValue);
    const eng = new GameEngine(
      mine.cards,
      theirs.cards,
      Date.now(),
      {
        playerName: playerName().trim(),
        cpuName: actor.name,
        playerDeckName: mine.name,
        cpuDeckName: theirs.name,
      },
      { player: mine.armors, cpu: theirs.armors },
    );
    eng.log.push(`${eng.players.player.name} [${mine.name}] vs ${eng.players.cpu.name} [${theirs.name}]`);
    eng.setOnChange(() => setVersion((v) => v + 1));
    setCpu(new CpuPlayer(eng));
    setEngine(eng);
    setAttack("c");
    setSupportIdx(null);
    setHandOkTurn(0);
    setForcedAckTurn(0);
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
    setAttackConfirmed(false);
  }

  // Leaving battle-select resets the two-step prompt state.
  createEffect(() => {
    if (game()?.phase !== "battle-select" && attackConfirmed()) setAttackConfirmed(false);
  });

  return (
    <div class="layout">
      <Show
        when={game()}
        fallback={
          <Show
            when={view() === "menu"}
            fallback={<DeckBuilder store={customDeckStore} onBack={() => setView("menu")} />}
          >
            <SetupScreen
              customDecks={customDecks()}
              playerActorId={playerActorId()}
              setPlayerActorId={setPlayerActorId}
              playerName={playerName()}
              setPlayerName={setPlayerName}
              playerDeck={playerDeck()}
              setPlayerDeck={setPlayerDeck}
              cpuActorId={cpuActorId()}
              setCpuActorId={setCpuActorId}
              cpuDeck={cpuDeck()}
              setCpuDeck={setCpuDeck}
              firstPlayer={firstPlayer()}
              setFirstPlayer={setFirstPlayer}
              revealOpponentHand={revealOpponentHand()}
              setRevealOpponentHand={setRevealOpponentHand}
              setupError={setupError()}
              onOpenBuilder={() => setView("builder")}
              onStart={startMatch}
            />
          </Show>
        }
      >
        {/* Read game() directly in every expression: the engine object is
            mutated in place, so reactivity must flow through the version
            signal, not through Show's equality-memoized accessor.
            IMPORTANT: use game()?. (never game()!.) — these expressions can
            re-evaluate with null while the Show tears down after
            setEngine(null) (e.g. "Change Setup"). */}
        <div class="columns">
          <div class="column">
            <LogArea g={game()!} />
            <ControlPanel g={game()!} />
          </div>
          <div class="column-center">
            <OpponentArea
              p={game()?.players.cpu as PlayerState}
              g={game()!}
              revealHand={revealOpponentHand()}
              portrait={cpuActor().portrait}
            />
            <Battlefield
              g={game()!}
              revealOpponentHand={revealOpponentHand()}
              support={
                game()?.phase !== "battle-select"
                  ? null
                  : supportIdx() === "deck"
                    ? "deck"
                    : typeof supportIdx() === "number"
                      ? (game()?.players.player.hand[supportIdx() as number] ?? null)
                      : null
              }
            />
            <PlayerArea
              g={game()!}
              portrait={playerActor().portrait}
              supportIdx={
                game()?.phase === "battle-select" && typeof supportIdx() === "number"
                  ? (supportIdx() as number)
                  : null
              }
              supportPick={game()?.phase === "battle-select" && attackConfirmed()}
              setSupportIdx={setSupportIdx}
            />
            <PromptDialogs
              g={game()!}
              handOkTurn={handOkTurn()}
              setHandOkTurn={setHandOkTurn}
              forcedAckTurn={forcedAckTurn()}
              setForcedAckTurn={setForcedAckTurn}
              attack={attack()}
              setAttack={setAttack}
              attackConfirmed={attackConfirmed()}
              setAttackConfirmed={setAttackConfirmed}
              supportIdx={supportIdx()}
              setSupportIdx={setSupportIdx}
              confirmBattle={confirmBattle}
            />
            <Show when={game()?.phase === "game-over"}>
              <GameOverModal
                g={game()!}
                playerPortrait={playerActor().portrait}
                cpuPortrait={cpuActor().portrait}
                onPlayAgain={startMatch}
                onChangeSetup={() => setEngine(null)}
              />
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
