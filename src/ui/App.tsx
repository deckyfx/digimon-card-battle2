import { Show, createEffect, createSignal } from "solid-js";
import type { AttackType } from "@src/types";
import { GameEngine, type PlayerId, type PlayerState } from "@src/engine/game-engine";
import { CpuPlayer } from "@src/ai/cpu-player";
import { OPPONENT_ACTORS, getActorById } from "@src/data/actors";
import { getDeckById } from "@src/data/prebuilt-decks";
import type { PlayerProfile } from "@src/store/profile-store";
import { MASTER_CARDS } from "@src/data/master-cards";
import { getPackById, openPack } from "@src/data/prize-packs";
import { getCityById, type City } from "@src/data/cities";
import { getCafeBattleById } from "@src/data/battle-cafe-datas";
import { CITY_ROSTER_RULES } from "@src/data/progression-scripts";
import { ScreenSetupDeck } from "./ScreenSetupDeck";
import { ScreenBattleSetup } from "./ScreenBattleSetup";
import { ProfilesScreen } from "./ScreenProfiles";
import { ScreenWelcome } from "./ScreenWelcome";
import { ScreenSetupBattle } from "./SetupScreen";
import { ScreenWorldMap } from "./ScreenWorldMap";
import { ScreenCity } from "./ScreenCity";
import { BattleResultModal, type MatchRewards } from "./BattleResultModal";
import { LogArea } from "./LogArea";
import { ControlPanel } from "./ControlPanel";
import { OpponentArea } from "./OpponentArea";
import { PlayerArea } from "./PlayerArea";
import { Battlefield } from "./Battlefield";
import { PromptDialogs } from "./PromptDialogs";
import { TurnInfo } from "./TurnInfo";
import { CardInspector } from "./CardInspector";
import { CUSTOM_PREFIX, PREBUILT_PREFIX, RANDOM_DECK, deckIllegal, profileStore, resolveDeck } from "./deck-select";

const CPU_DELAY_MS = 600;
const BATTLE_STEP_MS = 1000;

/**
 * Top-level app: profile selection → battle setup → match. Holds match
 * state and the CPU/battle-step drivers; all visual pieces live in their
 * own modules.
 */
export function App() {
  const [engine, setEngine] = createSignal<GameEngine | null>(null);
  const [cpu, setCpu] = createSignal<CpuPlayer | null>(null);
  const [version, setVersion] = createSignal(0);
  const [playerDeck, setPlayerDeck] = createSignal<string>("");
  const [cpuActorId, setCpuActorId] = createSignal(OPPONENT_ACTORS[0]?.id ?? 2);
  const [cpuDeck, setCpuDeck] = createSignal<string>(RANDOM_DECK);
  const cpuActor = () => getActorById(cpuActorId()) ?? OPPONENT_ACTORS[0]!;
  const [setupError, setSetupError] = createSignal("");
  // App opens on profile management; the world map is the scenario hub.
  const [view, setView] = createSignal<"ScreenProfiles" | "welcome" | "world" | "city" | "setup" | "battle-intro" | "builder">("ScreenProfiles");
  const [profile, setProfile] = createSignal<PlayerProfile | null>(null);
  /** City currently being visited (view "city" / scenario duels). */
  const [activeCityId, setActiveCityId] = createSignal<string | null>(null);
  /** Where a battle was launched from — decides where the lobby is. */
  const [battleOrigin, setBattleOrigin] = createSignal<"free" | string>("free");
  /** The CafeBattle id for the current scenario duel (null for free battles). */
  const [activeCafeBattleId, setActiveCafeBattleId] = createSignal<number | null>(null);
  /** Post-battle dialog to show when returning to the city after a duel. */
  const [pendingPostBattle, setPendingPostBattle] = createSignal<{
    cafeBattleId: number;
    result: "win" | "lose";
  } | null>(null);
  /** Where the builder was opened from, to return there on Back. */
  let builderOrigin: "world" | "setup" = "world";

  const playerPortrait = () => getActorById(profile()?.avatarActorId ?? 0)?.portrait;

  const selectProfile = (p: PlayerProfile) => {
    setProfile(p);
    setPlayerDeck(p.decks[0] ? `${CUSTOM_PREFIX}${p.decks[0].id}` : "");
    setView("welcome");
  };

  /** Enter a city resident duel: opponent locked to this CafeBattle, lobby = the city. */
  const fightResident = (cityId: string, actorId: number, cafeBattleId: number) => {
    setCpuActorId(actorId);
    const cafeBattle = getCafeBattleById(cafeBattleId);
    // Use the specific deck defined for this CafeBattle slot, not a random one.
    setCpuDeck(cafeBattle ? `${PREBUILT_PREFIX}${cafeBattle.deckId}` : RANDOM_DECK);
    setBattleOrigin(cityId);
    setActiveCafeBattleId(cafeBattleId);
    setView("battle-intro");
  };

  /** Re-reads the active profile from the store (after builder edits). */
  const refreshProfile = () => {
    const id = profile()?.id;
    if (!id) return;
    const fresh = profileStore.get(id);
    setProfile(fresh);
    if (fresh && !fresh.decks.some((d) => `${CUSTOM_PREFIX}${d.id}` === playerDeck())) {
      setPlayerDeck(fresh.decks[0] ? `${CUSTOM_PREFIX}${fresh.decks[0].id}` : "");
    }
  };

  // Dynamic visibility rule: revealed vs CPU for now; PvP will set this false.
  const [revealOpponentHand, setRevealOpponentHand] = createSignal(true);
  const [firstPlayer, setFirstPlayer] = createSignal<PlayerId | "random">("random");

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
    const prof = profile();
    if (!prof) return;
    const mine = resolveDeck(playerDeck(), prof);
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
      // Mirror match: the opponent plays one of the profile's decks.
      if (prof.decks.length === 0) return;
      const valid = prof.decks.some((d) => `${CUSTOM_PREFIX}${d.id}` === cpuDeck());
      cpuDeckValue = valid
        ? cpuDeck()
        : `${CUSTOM_PREFIX}${prof.decks[Math.floor(Math.random() * prof.decks.length)]!.id}`;
    } else {
      const ownedIds = actor.deckIds;
      const cpuDeckId =
        cpuDeck() === RANDOM_DECK || !ownedIds.some((id) => `deck:${id}` === cpuDeck())
          ? (ownedIds[Math.floor(Math.random() * ownedIds.length)] ?? 1)
          : parseInt(cpuDeck().slice(PREBUILT_PREFIX.length), 10);
      cpuDeckValue = `${PREBUILT_PREFIX}${cpuDeckId}`;
    }
    const theirs = resolveDeck(cpuDeckValue, prof);
    const eng = new GameEngine(
      mine.cards,
      theirs.cards,
      Date.now(),
      {
        playerName: prof.name,
        cpuName: actor.name,
        playerDeckName: mine.name,
        cpuDeckName: theirs.name,
      },
      { player: mine.armors, cpu: theirs.armors },
    );
    eng.log.push(`${eng.players.player.name} [${mine.name}] vs ${eng.players.cpu.name} [${theirs.name}]`);
    eng.setOnChange(() => setVersion((v) => v + 1));
    rewardClaim = null;
    resultRecorded = false;
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

  // ── Victory rewards: claimed (and persisted) exactly once per match. ──
  let rewardClaim: MatchRewards | null = null;
  function claimRewards(): MatchRewards {
    if (rewardClaim) return rewardClaim;
    const actor = cpuActor();
    // Resolve deck to get exp and prizePack (deck is the source of truth now).
    const deckIdStr = cpuDeck();
    const deckId = deckIdStr.startsWith(PREBUILT_PREFIX)
      ? parseInt(deckIdStr.slice(PREBUILT_PREFIX.length), 10)
      : null;
    const deck = deckId !== null ? getDeckById(deckId) : null;
    const exp = deck?.exp ?? 0;
    const pack = deck?.prizePack ? getPackById(deck.prizePack) : null;
    const cards = pack ? openPack(pack) : [];
    const bonusCards = (actor.prizeCards ?? [])
      .map((n) => MASTER_CARDS.find((c) => c.number === n))
      .filter((c): c is NonNullable<typeof c> => c !== undefined);
    const prof = profile();
    if (prof) {
      profileStore.grantCards(prof.id, [...cards, ...bonusCards].map((c) => c.number));
      profileStore.addExp(prof.id, exp);

      // Apply story flags from this CafeBattle and recompute the city roster.
      const cafeBattleId = activeCafeBattleId();
      const cafeBattle = cafeBattleId !== null ? getCafeBattleById(cafeBattleId) : null;
      if (cafeBattle?.onWin?.length) {
        let flaggedProfile = prof;
        for (const flagKey of cafeBattle.onWin) {
          flaggedProfile = profileStore.setFlag(prof.id, flagKey, true);
        }
        const cityId = battleOrigin();
        const rosterRule = CITY_ROSTER_RULES[cityId];
        if (rosterRule) {
          const newRoster = rosterRule(flaggedProfile.flags);
          profileStore.applyCityRoster(prof.id, cityId, newRoster);
        }
      }

      refreshProfile();
    }
    rewardClaim = { exp, packName: pack?.name ?? null, cards, bonusCards };
    return rewardClaim;
  }

  // Record EVERY match result (wins and losses) once, at game over.
  let resultRecorded = false;
  createEffect(() => {
    const g = game();
    if (!g || g.phase !== "game-over" || resultRecorded) return;
    resultRecorded = true;
    const prof = profile();
    if (!prof) return;
    profileStore.recordResult(prof.id, cpuActor().id, g.winner === "player");
    refreshProfile();
  });

  function backToLobby() {
    // Capture winner before clearing the engine.
    const result: "win" | "lose" = engine()?.winner === "player" ? "win" : "lose";
    rewardClaim = null;
    setEngine(null);
    // Scenario duels return to their city with a post-battle dialog; free battles go to setup.
    if (battleOrigin() !== "free" && getCityById(battleOrigin())) {
      setActiveCityId(battleOrigin());
      const cafeBattleId = activeCafeBattleId();
      if (cafeBattleId !== null) {
        setPendingPostBattle({ cafeBattleId, result });
      }
      setView("city");
    } else {
      setView("setup");
    }
  }

  return (
    <div class="layout">
      <Show
        when={game()}
        fallback={
          <>
            <Show when={view() === "ScreenProfiles"}>
              <ProfilesScreen store={profileStore} onSelect={selectProfile} />
            </Show>
            <Show when={view() === "welcome" && profile()}>
              <ScreenWelcome
                profile={profile() as PlayerProfile}
                onContinue={() => setView("world")}
              />
            </Show>
            <Show when={view() === "world" && profile()}>
              <ScreenWorldMap
                profile={profile() as PlayerProfile}
                onEnterCity={(city: City) => {
                  setActiveCityId(city.id);
                  setView("city");
                }}
                onFreeBattle={() => {
                  setBattleOrigin("free");
                  setView("setup");
                }}
                onChangeProfile={() => setView("ScreenProfiles")}
                onOpenBuilder={() => {
                  builderOrigin = "world";
                  setView("builder");
                }}
              />
            </Show>
            <Show when={view() === "city" && profile() && getCityById(activeCityId() ?? "")}>
              <ScreenCity
                city={getCityById(activeCityId() ?? "") as City}
                profile={profile() as PlayerProfile}
                onFight={(actorId, cafeBattleId) => fightResident(activeCityId() as string, actorId, cafeBattleId)}
                onFlagSet={(key, value) => {
                  const prof = profile();
                  if (prof) {
                    profileStore.setFlag(prof.id, key, value);
                    refreshProfile();
                  }
                }}
                onBack={() => setView("world")}
                pendingPostBattle={pendingPostBattle()}
                onPostBattleConsumed={() => setPendingPostBattle(null)}
              />
            </Show>
            <Show when={view() === "battle-intro" && profile()}>
              <ScreenBattleSetup
                profile={profile() as PlayerProfile}
                cpuActor={cpuActor()}
                cpuDeckName={
                  cpuDeck().startsWith(PREBUILT_PREFIX)
                    ? (getDeckById(parseInt(cpuDeck().slice(PREBUILT_PREFIX.length), 10))?.name ?? "???")
                    : "???"
                }
                onStart={(customDeckId, fp) => {
                  setPlayerDeck(`${CUSTOM_PREFIX}${customDeckId}`);
                  setFirstPlayer(fp);
                  startMatch();
                }}
              />
            </Show>
            <Show when={view() === "setup" && profile()}>
              <ScreenSetupBattle
                profile={profile() as PlayerProfile}
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
                lockedOpponent={battleOrigin() !== "free"}
                onBack={() => {
                  if (battleOrigin() !== "free" && getCityById(battleOrigin())) {
                    setActiveCityId(battleOrigin());
                    setView("city");
                  } else {
                    setView("world");
                  }
                }}
                onOpenBuilder={() => {
                  builderOrigin = "setup";
                  setView("builder");
                }}
                onChangeProfile={() => setView("ScreenProfiles")}
                onStart={startMatch}
              />
            </Show>
            <Show when={view() === "builder" && profile()}>
              <ScreenSetupDeck
                store={profileStore}
                profileId={(profile() as PlayerProfile).id}
                onBack={() => {
                  refreshProfile();
                  setView(builderOrigin === "setup" ? "setup" : "world");
                }}
              />
            </Show>
          </>
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
              portrait={playerPortrait()}
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
              <BattleResultModal
                g={game()!}
                playerPortrait={playerPortrait()}
                cpuPortrait={cpuActor().portrait}
                claimRewards={claimRewards}
                onBackToLobby={backToLobby}
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
