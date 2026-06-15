import { Show, createEffect, createSignal } from "solid-js";
import type { AttackType, MasterCard } from "@src/types";
import { correctPartnerCard } from "@src/data/digiparts";
import { GameEngine, type PlayerId, type PlayerState } from "@src/engine/game-engine";
import { CpuPlayer } from "@src/ai/cpu-player";
import { OPPONENT_ACTORS, getActorById } from "@src/data/actors";
import { getDeckById } from "@src/data/prebuilt-decks";
import type { PlayerProfile } from "@src/store/profile-store";
import { MASTER_CARDS } from "@src/data/master-cards";
import { getPackById, openPack } from "@src/data/prize-packs";
import { getCityById, type City } from "@src/data/cities";
import { executeCommands, type EventCommand } from "@src/engine/event-engine";
import { ScreenSetupDeck } from "./ScreenSetupDeck";
import { ScreenBattleSetup } from "./ScreenBattleSetup";
import { ProfilesScreen } from "./ScreenProfiles";
import { ScreenWelcome } from "./ScreenWelcome";
import { ScreenSetupBattle } from "./SetupScreen";
import { ScreenWorldMap } from "./ScreenWorldMap";
import { ScreenCity } from "./ScreenCity";
import { BattleResultModal, type MatchRewards } from "./BattleResultModal";
import { InventoryModal } from "./InventoryModal";
import { ScreenPartnerManagement } from "./ScreenPartnerManagement";
import { LogArea } from "./LogArea";
import { ControlPanel } from "./ControlPanel";
import { OpponentArea } from "./OpponentArea";
import { PlayerArea } from "./PlayerArea";
import { Battlefield } from "./Battlefield";
import { PromptDialogs } from "./PromptDialogs";
import { TurnInfo } from "./TurnInfo";
import { CardInspector } from "./CardInspector";
import { CUSTOM_PREFIX, PREBUILT_PREFIX, RANDOM_DECK, deckIllegal, profileStore, resolveDeck } from "./deck-select";
import { PARTNERS, partnerLevelFromExp } from "@src/data/partners";
import { computeExpBonuses } from "@src/engine/battle-stats";
import type { PartnerExpGain } from "./BattleResultModal";

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
  const [view, setView] = createSignal<"ScreenProfiles" | "welcome" | "world" | "city" | "setup" | "battle-intro" | "builder" | "partners">("ScreenProfiles");
  const [profile, setProfile] = createSignal<PlayerProfile | null>(null);
  /** City currently being visited (view "city" / scenario duels). */
  const [activeCityId, setActiveCityId] = createSignal<string | null>(null);
  /** Where a battle was launched from — decides where the lobby is. */
  const [battleOrigin, setBattleOrigin] = createSignal<"free" | string>("free");
  /** Info captured at fight-start for claimRewards and pendingPostBattle. */
  const [activeFight, setActiveFight] = createSignal<{
    actorId: number;
    eventId: string | null;
    onWin: EventCommand[];
    winDialogId?: number;
    loseLine?: string;
  } | null>(null);
  /** Post-battle dialog to show when returning to the city after a duel. */
  const [pendingPostBattle, setPendingPostBattle] = createSignal<{
    actorId: number;
    eventId: string | null;
    result: "win" | "lose";
    winDialogId?: number;
    loseLine?: string;
  } | null>(null);
  /** Where the builder was opened from, to return there on Back. */
  let builderOrigin: "world" | "setup" = "world";
  const [inventoryOpen, setInventoryOpen] = createSignal(false);

  const playerPortrait = () => getActorById(profile()?.avatarActorId ?? 0)?.portrait;

  const selectProfile = (p: PlayerProfile) => {
    setProfile(p);
    setPlayerDeck(p.decks[0] ? `${CUSTOM_PREFIX}${p.decks[0].id}` : "");
    setView("welcome");
  };

  /** Enter a city resident duel: opponent locked to the given deck, lobby = the city. */
  const fightResident = (
    cityId: string,
    actorId: number,
    deckId: number,
    eventId: string | null,
    capturedDialog: { winDialogId?: number; loseLine?: string; onWin: EventCommand[] },
  ) => {
    setCpuActorId(actorId);
    setCpuDeck(`${PREBUILT_PREFIX}${deckId}`);
    setBattleOrigin(cityId);
    setActiveFight({ actorId, eventId, ...capturedDialog });
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
    const partnerNums = new Set(
      (prof.partners ?? []).flatMap((ps) => {
        const def = PARTNERS.find((d) => d.id === ps.id);
        return def ? [def.cardNumber, ...def.armorNumbers] : [];
      }),
    );
    // Apply equipped cross_eff / support_eff DigiPart corrections to the
    // player's partner Rookies (and their armor cards) before battle.
    const partsByCardNumber = new Map<string, number[]>();
    for (const ps of prof.partners ?? []) {
      const def = PARTNERS.find((d) => d.id === ps.id);
      if (!def) continue;
      for (const num of [def.cardNumber, ...def.armorNumbers]) {
        partsByCardNumber.set(num, ps.equippedDigiparts);
      }
    }
    const correctForPartner = (c: MasterCard): MasterCard => {
      const parts = partsByCardNumber.get(c.number);
      return parts ? correctPartnerCard(c, parts) : c;
    };
    const playerCards = mine.cards.map(correctForPartner);
    const playerArmors = mine.armors.map(correctForPartner);
    const eng = new GameEngine(
      playerCards,
      theirs.cards,
      Date.now(),
      {
        playerName: prof.name,
        cpuName: actor.name,
        playerDeckName: mine.name,
        cpuDeckName: theirs.name,
      },
      { player: playerArmors, cpu: theirs.armors },
      partnerNums,
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
    const baseExp = deck?.exp ?? 0;
    const pack = deck?.prizePack ? getPackById(deck.prizePack) : null;
    const cards = pack ? openPack(pack) : [];
    const bonusCards = (actor.prizeCards ?? [])
      .map((n) => MASTER_CARDS.find((c) => c.number === n))
      .filter((c): c is NonNullable<typeof c> => c !== undefined);
    const partnerGains: PartnerExpGain[] = [];
    const prof = profile();

    // Compute EXP breakdown (base + challenge bonuses).
    const eng = engine();
    const expBreakdown = eng
      ? [
          { key: "base", name: "Base EXP", exp: baseExp },
          ...(prof
            ? computeExpBonuses(
                eng.battleStats,
                {
                  deckLeft: eng.players.player.deck.length,
                  handLeft: eng.players.player.hand.length,
                  score: eng.players.player.score,
                },
                {
                  deckLeft: eng.players.cpu.deck.length,
                  handLeft: eng.players.cpu.hand.length,
                  score: eng.players.cpu.score,
                },
                prof,
              )
            : []),
        ]
      : [{ key: "base", name: "Base EXP", exp: baseExp }];
    const exp = expBreakdown.reduce((s, line) => s + line.exp, 0);

    if (prof) {
      profileStore.grantCards(prof.id, [...cards, ...bonusCards].map((c) => c.number));
      profileStore.addExp(prof.id, exp);

      // Execute onWin commands (set flags, give items, etc.).
      const fight = activeFight();
      if (fight?.onWin?.length) {
        executeCommands(fight.onWin, prof.id, profileStore, () => {});
      }

      // Grant EXP to partners whose Rookie card appeared in the player's deck.
      if (exp > 0) {
        const playerCardSet = new Set(
          resolveDeck(playerDeck(), prof).cards.map((c) => c.number),
        );

        // Re-read so the EXP loop sees the latest profile state after
        // grantCards / addExp / executeCommands mutations above.
        const currentProf = profileStore.get(prof.id) ?? prof;

        for (const partnerState of currentProf.partners) {
          const partnerDef = PARTNERS.find((p) => p.id === partnerState.id);
          if (!partnerDef || !playerCardSet.has(partnerDef.cardNumber)) continue;

          const oldExp = partnerState.totalExp;
          const oldLevel = partnerLevelFromExp(oldExp);
          const oldDigipartSet = new Set(currentProf.ownedDigiparts);

          const updated = profileStore.setPartnerExp(
            prof.id,
            partnerState.id,
            Math.min(9999, oldExp + exp),
          );
          const updatedPartner = updated.partners.find((p) => p.id === partnerState.id)!;
          const newLevel = partnerLevelFromExp(updatedPartner.totalExp);

          partnerGains.push({
            partnerName: partnerDef.name,
            cardNumber: partnerDef.cardNumber,
            expGained: exp,
            oldExp,
            newExp: updatedPartner.totalExp,
            oldLevel,
            newLevel,
            leveledUp: newLevel > oldLevel,
            oldBonusHp: partnerState.bonusHp,
            oldBonusCircle: partnerState.bonusCircle,
            oldBonusTriangle: partnerState.bonusTriangle,
            oldBonusCross: partnerState.bonusCross,
            newBonusHp: updatedPartner.bonusHp,
            newBonusCircle: updatedPartner.bonusCircle,
            newBonusTriangle: updatedPartner.bonusTriangle,
            newBonusCross: updatedPartner.bonusCross,
            newDigiparts: updated.ownedDigiparts.filter((id) => !oldDigipartSet.has(id)),
          });
        }
      }

      refreshProfile();
    }
    rewardClaim = { exp, expBreakdown, packName: pack?.name ?? null, cards, bonusCards, partnerGains };
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
      const fight = activeFight();
      if (fight) {
        setPendingPostBattle({
          actorId: fight.actorId,
          eventId: fight.eventId,
          result,
          winDialogId: fight.winDialogId,
          loseLine: fight.loseLine,
        });
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
                onOpenInventory={() => setInventoryOpen(true)}
                onOpenPartners={() => setView("partners")}
              />
            </Show>
            <Show when={inventoryOpen() && profile()}>
              <InventoryModal
                profile={profile() as PlayerProfile}
                store={profileStore}
                onClose={() => setInventoryOpen(false)}
                onProfileChange={refreshProfile}
              />
            </Show>
            <Show when={view() === "partners" && profile()}>
              <ScreenPartnerManagement
                profile={profile() as PlayerProfile}
                store={profileStore}
                onClose={() => setView("world")}
                onProfileChange={refreshProfile}
              />
            </Show>
            <Show when={view() === "city" && profile() && getCityById(activeCityId() ?? "")}>
              <ScreenCity
                city={getCityById(activeCityId() ?? "") as City}
                profile={profile() as PlayerProfile}
                onFight={(actorId, deckId, eventId, capturedDialog) =>
                  fightResident(activeCityId() as string, actorId, deckId, eventId, capturedDialog)
                }
                onMarkDialogSeen={(eventId) => {
                  const prof = profile();
                  if (prof) {
                    profileStore.markDialogSeen(prof.id, eventId);
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
