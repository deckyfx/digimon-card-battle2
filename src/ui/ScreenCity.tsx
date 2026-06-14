import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import type { City } from "@src/data/cities";
import { getCityById, getCityByActorId } from "@src/data/cities";
import { getActorById, type Actor } from "@src/data/actors";
import { getCafeBattleById, type CafeBattle } from "@src/data/battle-cafe-datas";
import { getDeckById } from "@src/data/prebuilt-decks";
import { getPackById } from "@src/data/prize-packs";
import { MASTER_CARDS } from "@src/data/master-cards";
import { getTalkDialog, getDialogById, type DialogLine } from "@src/data/dialogs";
import { resolveSegments } from "@src/data/dialog-resolver";
import type { PlayerProfile } from "@src/store/profile-store";
import { runTrigger } from "@src/engine/progression-engine";
import { PROGRESSION_SCRIPTS } from "@src/data/progression-scripts";
import { DeckColorBar } from "./DeckColorBar";
import { ActorMugshotView } from "./ActorMugshotView";
import "./screen-city.css";

type CityView = "menu" | "cafe" | "interact";
type InteractAction = "options" | "talk" | "deckinfo" | "battle-confirm" | "post-win" | "post-lose";

/**
 * ScreenCity: city interior with Battle Cafe and Battle Arena entry points.
 * Battle Cafe residents can be talked to, inspected, or challenged.
 */
export function ScreenCity(props: {
  city: City;
  profile: PlayerProfile;
  onFight: (actorId: number, cafeBattleId: number) => void;
  onFlagSet: (key: string, value: boolean) => void;
  onBack: () => void;
  pendingPostBattle?: { cafeBattleId: number; result: "win" | "lose" } | null;
  onPostBattleConsumed?: () => void;
}) {
  // ── Signals ──────────────────────────────────────────────────────────────
  const [view, setView] = createSignal<CityView>("menu");
  const [selectedActor, setSelectedActor] = createSignal<Actor | null>(null);
  const [selectedBattle, setSelectedBattle] = createSignal<CafeBattle | null>(null);
  const [action, setAction] = createSignal<InteractAction>("options");
  const [arenaNotice, setArenaNotice] = createSignal(false);
  const [lineIndex, setLineIndex] = createSignal(0);
  const [cafeBattleVisitors, setCafeBattleVisitors] = createSignal<number[]>([]);
  /** True while waiting for the read-delay before transitioning to battle setup. */
  const [launchingBattle, setLaunchingBattle] = createSignal(false);

  // Post-battle dialog lines (win = multi-line from Dialog; lose = single line).
  const [postLines, setPostLines] = createSignal<DialogLine[]>([]);
  const [postLineIndex, setPostLineIndex] = createSignal(0);

  // React to pendingPostBattle: opens the interact view with the right post-battle
  // dialog. createEffect tracks props.pendingPostBattle reactively so it fires
  // correctly after the parent's batch update (including the setView("city") call).
  createEffect(() => {
    const pending = props.pendingPostBattle;
    if (!pending) return;

    const battle = getCafeBattleById(pending.cafeBattleId);
    const actor  = battle ? (getActorById(battle.actorId) ?? null) : null;
    if (!battle || !actor) return;

    setSelectedBattle(battle);
    setSelectedActor(actor);
    setLineIndex(0);
    setArenaNotice(false);

    if (pending.result === "win") {
      const dlg = battle.winDialog != null ? getDialogById(battle.winDialog) : undefined;
      if (dlg && dlg.lines.length > 0) {
        setPostLines(dlg.lines);
        setPostLineIndex(0);
        setAction("post-win");
      } else {
        setAction("options");
      }
    } else if (battle.loseLine) {
      setPostLineIndex(0);
      setAction("post-lose");
    } else {
      setAction("options");
    }

    setView("interact");
    props.onPostBattleConsumed?.();
  });

  /** Effective cafe roster: progression override first, then static city data. */
  const effectiveRoster = () => props.profile.cityRosters[props.city.id] ?? props.city.cafeBattleIds;

  const playerActor = () => getActorById(props.profile.avatarActorId);
  const wins = (id: number) => props.profile.records[id]?.wins ?? 0;

  // Dialog context for template variable resolution
  const dialogCtx = createMemo(() => ({
    player: props.profile,
    actorById: (id: number) => getActorById(id),
    deckById: (id: number) => getDeckById(id),
    packById: (id: number) => getPackById(id),
    cardByNumber: (num: string) => MASTER_CARDS.find((c) => c.number === num) ?? null,
    cityById: (id: string) => getCityById(id),
    actorCityName: (actorId: number) => getCityByActorId(actorId)?.name,
  }));

  // Active dialog for the current actor's Talk action
  const activeDialog = createMemo(() => {
    const actor = selectedActor();
    return actor ? getTalkDialog(actor.id) : undefined;
  });

  const dialogLines = () => {
    const battle = selectedBattle();
    if (battle && props.profile.flags[`intro_seen_${battle.id}`]) return [];
    return activeDialog()?.lines ?? [];
  };
  const currentLine = () => dialogLines()[lineIndex()];
  const isLastLine = () => lineIndex() >= dialogLines().length - 1;

  // Who is speaking on the current line: 0 = player, else opponent
  const speakingActorId = () => currentLine()?.actor ?? -1;
  const playerSpeaking = () => speakingActorId() === 0;

  // Post-battle line helpers
  const postCurrentLine    = () => postLines()[postLineIndex()];
  const isLastPostLine     = () => postLineIndex() >= postLines().length - 1;
  const postSpeakingActor  = () => postCurrentLine()?.actor ?? -1;
  const postPlayerSpeaking = () => postSpeakingActor() === 0;

  const advancePostLine = () => {
    if (isLastPostLine()) {
      setAction("options");
    } else {
      setPostLineIndex((n) => n + 1);
    }
  };

  const openResident = (battle: CafeBattle, actor: Actor) => {
    setSelectedBattle(battle);
    setSelectedActor(actor);
    setLineIndex(0);
    setAction("options");
    setArenaNotice(false);
    setView("interact");
  };

  const openTalk = () => {
    setLineIndex(0);
    setAction("talk");
  };

  const advanceLine = () => {
    if (isLastLine()) {
      // Persist that this CafeBattle's intro has been seen so recurLine shows next time.
      const battle = selectedBattle();
      if (battle && activeDialog()) {
        props.onFlagSet(`intro_seen_${battle.id}`, true);
      }
      setAction("options");
    } else {
      setLineIndex((n) => n + 1);
    }
  };

  const goBack = () => {
    if (launchingBattle()) return; // don't navigate mid-transition
    if (view() === "menu") {
      props.onBack();
    } else if (view() === "cafe") {
      setView("menu");
    } else {
      if (action() !== "options") {
        setAction("options");
      } else {
        setView("cafe");
      }
    }
  };

  const backLabel = () => {
    if (view() === "menu") return "← World Map";
    return "← Back";
  };

  return (
    <div class="sc-root">
      {/* Persistent header */}
      <div class="sc-header">
        <button class="sc-btn-nav" onClick={goBack}>
          {backLabel()}
        </button>
        <span class="sc-breadcrumb">
          {view() === "menu" && props.city.name}
          {view() === "cafe" && `${props.city.name} · Battle Cafe`}
          {view() === "interact" && `${props.city.name} · ${selectedActor()?.name ?? ""}`}
        </span>
      </div>

      {/* ── MENU VIEW ──────────────────────────────────────────────────── */}
      <Show when={view() === "menu"}>
        <div class="sc-menu">
          <div class="sc-menu-banner">
            <img class="sc-banner-img" src={props.city.overview} alt={props.city.name} />
            <h1 class="sc-city-title">{props.city.name}</h1>
          </div>
          <div class="sc-menu-btns">
            <button
              class="sc-entry-btn"
              onClick={() => {
                setArenaNotice(false);
                const result = runTrigger(
                  "enter-cafe",
                  { cityId: props.city.id, profile: props.profile, random: Math.random },
                  PROGRESSION_SCRIPTS,
                );
                setCafeBattleVisitors(result.cafeBattleVisitors);
                setView("cafe");
              }}
            >
              <span class="sc-entry-icon">☕</span>
              <span class="sc-entry-label">Enter Battle Cafe</span>
            </button>
            <button
              class="sc-entry-btn sc-entry-btn--arena"
              onClick={() => setArenaNotice(true)}
            >
              <span class="sc-entry-icon">🏟</span>
              <span class="sc-entry-label">Enter Battle Arena</span>
            </button>
          </div>
          <Show when={arenaNotice()}>
            <div class="sc-arena-notice">
              The Battle Arena is not available yet. Check back later!
            </div>
          </Show>
        </div>
      </Show>

      {/* ── CAFE VIEW ──────────────────────────────────────────────────── */}
      <Show when={view() === "cafe"}>
        <div class="sc-cafe">
          <div class="sc-cafe-banner">
            <img class="sc-cafe-img" src={props.city.cafe} alt="Battle Cafe" />
            <p class="sc-cafe-subtitle">Who would you like to speak with?</p>
          </div>
          <div class="sc-resident-grid">
            <For each={Array.from({ length: 12 }, (_, i) => {
                const ids = [...effectiveRoster(), ...cafeBattleVisitors()];
                return ids[i] ?? null;
              })}>
              {(battleId, i) => {
                const battle: CafeBattle | null = battleId !== null ? getCafeBattleById(battleId) ?? null : null;
                const actor: Actor | null = battle ? getActorById(battle.actorId) ?? null : null;
                if (battle && actor) {
                  return (
                    <button
                      class="sc-resident-card"
                      classList={{ "sc-resident-card--beaten": wins(battle.actorId) > 0 }}
                      style={{ "animation-delay": `${i() * 0.055}s` }}
                      onClick={() => openResident(battle, actor)}
                    >
                      <div class="sc-resident-portrait-wrap">
                        <ActorMugshotView
                          fill
                          mugshot={actor.mugshot}
                          label={actor.name}
                        />
                        <div class="sc-resident-overlay">
                          <span class="sc-resident-name">{actor.name}</span>
                        </div>
                      </div>
                    </button>
                  );
                }
                return (
                  <div
                    class="sc-resident-card sc-resident-card--empty"
                    style={{ "animation-delay": `${i() * 0.055}s` }}
                  >
                    <div class="sc-resident-portrait-wrap">
                      <ActorMugshotView fill mugshot="" />
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </Show>

      {/* ── INTERACT VIEW ──────────────────────────────────────────────── */}
      <Show when={view() === "interact"}>
        <div class="sc-interact">
          <div class="sc-stage">

            {/* Dialog group: portraits + speech bubble in a row */}
            <div class="sc-dialog-group">
              <div
                class="sc-avatar-col sc-avatar-col--player"
                classList={{
                  "sc-avatar-col--speaking":
                    (action() === "talk" && playerSpeaking()) ||
                    (action() === "post-win" && postPlayerSpeaking()),
                  "sc-avatar-col--silent":
                    (action() === "talk" && !playerSpeaking()) ||
                    action() === "battle-confirm" ||
                    action() === "post-lose" ||
                    (action() === "post-win" && !postPlayerSpeaking()),
                }}
              >
                <div class="sc-avatar-name">{props.profile.name}</div>
                <ActorMugshotView
                  mugshot={playerActor()?.mugshot ?? ""}
                  label={props.profile.name}
                  size={3}
                />
              </div>

              {/* Speech bubble */}
              <div class="sc-speech">
                {/* Talk mode: multi-line dialog if authored, else fall back to recurLine */}
                <Show when={action() === "talk"}>
                  {dialogLines().length > 0 ? (
                    <div class="sc-speech-bubble sc-speech-bubble--talk" onClick={advanceLine}>
                      <div class="sc-speech-speaker">
                        {playerSpeaking() ? props.profile.name : selectedActor()?.name}
                      </div>
                      <p class="sc-speech-text">
                        <For each={resolveSegments(currentLine()?.message ?? "", dialogCtx())}>
                          {(seg) => (
                            <Show when={seg.kind !== "text"} fallback={<>{seg.value}</>}>
                              <span class={`dlg-var dlg-var-${seg.kind}`}>{seg.value}</span>
                            </Show>
                          )}
                        </For>
                      </p>
                      <div class="sc-speech-advance">
                        <span class="sc-dialog-counter">
                          {lineIndex() + 1} / {dialogLines().length}
                        </span>
                        <span class="sc-dialog-next">
                          {isLastLine() ? "✕ Close" : "▶ Next"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* No authored dialog — show the CafeBattle recurLine as a single actor line */
                    <div class="sc-speech-bubble sc-speech-bubble--talk" onClick={() => setAction("options")}>
                      <div class="sc-speech-speaker">{selectedActor()?.name}</div>
                      <p class="sc-speech-text">
                        <For each={resolveSegments(selectedBattle()?.recurLine ?? "…", dialogCtx())}>
                          {(seg) => (
                            <Show when={seg.kind !== "text"} fallback={<>{seg.value}</>}>
                              <span class={`dlg-var dlg-var-${seg.kind}`}>{seg.value}</span>
                            </Show>
                          )}
                        </For>
                      </p>
                      <div class="sc-speech-advance">
                        <span class="sc-dialog-next">✕ Close</span>
                      </div>
                    </div>
                  )}
                </Show>

                {/* Post-win: multi-line win dialog */}
                <Show when={action() === "post-win"}>
                  <div class="sc-speech-bubble sc-speech-bubble--talk sc-speech-bubble--win" onClick={advancePostLine}>
                    <div class="sc-speech-speaker">
                      {postPlayerSpeaking() ? props.profile.name : selectedActor()?.name}
                    </div>
                    <p class="sc-speech-text">
                      <For each={resolveSegments(postCurrentLine()?.message ?? "", dialogCtx())}>
                        {(seg) => (
                          <Show when={seg.kind !== "text"} fallback={<>{seg.value}</>}>
                            <span class={`dlg-var dlg-var-${seg.kind}`}>{seg.value}</span>
                          </Show>
                        )}
                      </For>
                    </p>
                    <div class="sc-speech-advance">
                      <span class="sc-dialog-counter">{postLineIndex() + 1} / {postLines().length}</span>
                      <span class="sc-dialog-next">{isLastPostLine() ? "✕ Close" : "▶ Next"}</span>
                    </div>
                  </div>
                </Show>

                {/* Post-lose: single opponent line */}
                <Show when={action() === "post-lose"}>
                  <div class="sc-speech-bubble sc-speech-bubble--talk sc-speech-bubble--lose" onClick={() => setAction("options")}>
                    <div class="sc-speech-speaker">{selectedActor()?.name}</div>
                    <p class="sc-speech-text">
                      <For each={resolveSegments(selectedBattle()?.loseLine ?? "…", dialogCtx())}>
                        {(seg) => (
                          <Show when={seg.kind !== "text"} fallback={<>{seg.value}</>}>
                            <span class={`dlg-var dlg-var-${seg.kind}`}>{seg.value}</span>
                          </Show>
                        )}
                      </For>
                    </p>
                    <div class="sc-speech-advance">
                      <span class="sc-dialog-next">✕ Close</span>
                    </div>
                  </div>
                </Show>

                {/* Deck info rendered inside the bubble */}
                <Show when={action() === "deckinfo"}>
                  <div class="sc-speech-bubble sc-speech-bubble--scroll">
                    <Show
                      when={(selectedActor()?.deckIds.length ?? 0) > 0}
                      fallback={<p class="sc-no-deck">No deck data available.</p>}
                    >
                      <For each={selectedActor()?.deckIds ?? []}>
                        {(deckId) => {
                          const deck = getDeckById(deckId);
                          if (!deck) return null;
                          return (
                            <div class="sc-deck-entry">
                              <div class="sc-deck-entry-name">{deck.name}</div>
                              <DeckColorBar cardNumbers={deck.cardNumbers} />
                              <Show when={deck.description}>
                                <p class="sc-deck-desc">{deck.description}</p>
                              </Show>
                            </div>
                          );
                        }}
                      </For>
                    </Show>
                  </div>
                </Show>

                {/* Idle: empty bubble */}
                <Show when={action() === "options"}>
                  <p class="sc-speech-text sc-speech-text--idle">…</p>
                </Show>

                {/* Battle confirm: challenge line → battleStartLine once player confirms */}
                <Show when={action() === "battle-confirm"}>
                  <div class="sc-speech-bubble sc-speech-bubble--talk">
                    <div class="sc-speech-speaker">{selectedActor()?.name}</div>
                    <p class="sc-speech-text">
                      <For each={resolveSegments(
                        launchingBattle()
                          ? (selectedBattle()?.battleStartLine ?? selectedBattle()?.challengeLine ?? "…")
                          : (selectedBattle()?.challengeLine ?? "…"),
                        dialogCtx(),
                      )}>
                        {(seg) => (
                          <Show when={seg.kind !== "text"} fallback={<>{seg.value}</>}>
                            <span class={`dlg-var dlg-var-${seg.kind}`}>{seg.value}</span>
                          </Show>
                        )}
                      </For>
                    </p>
                  </div>
                </Show>
              </div>

              <div
                class="sc-avatar-col sc-avatar-col--opponent"
                classList={{
                  "sc-avatar-col--speaking":
                    (action() === "talk" && !playerSpeaking()) ||
                    action() === "battle-confirm" ||
                    action() === "post-lose" ||
                    (action() === "post-win" && !postPlayerSpeaking()),
                  "sc-avatar-col--silent":
                    (action() === "talk" && playerSpeaking()) ||
                    (action() === "post-win" && postPlayerSpeaking()),
                }}
              >
                <div class="sc-avatar-name">{selectedActor()?.name}</div>
                <ActorMugshotView
                  mugshot={selectedActor()?.mugshot ?? ""}
                  label={selectedActor()?.name}
                  size={3}
                />
              </div>
            </div>

            {/* Action panel — sibling of dialog group, stacked below */}
            <div class="sc-panel">

            {/* Options hidden during battle-confirm and post-battle dialogs */}
            <Show
              when={action() === "battle-confirm"}
              fallback={
                <Show when={action() !== "post-win" && action() !== "post-lose"}>
                <div class="sc-action-list">
                  <button
                    class="sc-action-btn"
                    classList={{ "sc-action-btn--active": action() === "talk" }}
                    onClick={openTalk}
                  >
                    💬 Talk
                  </button>
                  <button
                    class="sc-action-btn"
                    classList={{ "sc-action-btn--active": action() === "deckinfo" }}
                    onClick={() => setAction("deckinfo")}
                  >
                    🃏 Deck Info
                  </button>
                  {selectedBattle()?.canChallenge !== false && (
                    <button
                      class="sc-action-btn sc-action-btn--battle"
                      onClick={() => setAction("battle-confirm")}
                    >
                      ⚔ Battle
                    </button>
                  )}
                </div>
                </Show>
              }
            >
              <div class="sc-battle-confirm">
                <p class="sc-confirm-text">
                  {launchingBattle() ? "Preparing battle…" : `Challenge ${selectedActor()?.name} to a battle?`}
                </p>
                <div class="sc-confirm-btns">
                  <button
                    class="sc-btn-yes"
                    disabled={launchingBattle()}
                    onClick={() => {
                      const actor = selectedActor();
                      const battle = selectedBattle();
                      if (!actor || !battle || launchingBattle()) return;
                      setLaunchingBattle(true);
                      setTimeout(() => {
                        setLaunchingBattle(false);
                        props.onFight(actor.id, battle.id);
                      }, 1400);
                    }}
                  >
                    ⚔ Yes, fight!
                  </button>
                  <button
                    class="sc-btn-no"
                    disabled={launchingBattle()}
                    onClick={() => setAction("options")}
                  >
                    ✗ No
                  </button>
                </div>
              </div>
            </Show>

          </div>

          </div>{/* /sc-stage */}
        </div>{/* /sc-interact */}
      </Show>
    </div>
  );
}
