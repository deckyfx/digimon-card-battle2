import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import type { City } from "@src/data/cities";
import { getCityById, getCityByActorId } from "@src/data/cities";
import { getActorById, type Actor } from "@src/data/actors";
import { getDeckById } from "@src/data/prebuilt-decks";
import { getPackById } from "@src/data/prize-packs";
import { MASTER_CARDS } from "@src/data/master-cards";
import { getDialogById, type DialogLine } from "@src/data/dialogs";
import { resolveSegments } from "@src/data/dialog-resolver";
import type { PlayerProfile } from "@src/store/profile-store";
import { getMapById } from "@src/data/maps";
import {
  resolveMap,
  resolveVisitors,
  type EventScript,
  type EventCommand,
  type MapId,
} from "@src/engine/event-engine";
import { DeckColorBar } from "./DeckColorBar";
import { ActorMugshotView } from "./ActorMugshotView";
import { TypedText, type TypedTextHandle } from "./TypedText";
import "./screen-city.css";

type CityView = "menu" | "cafe" | "interact";
type InteractAction = "options" | "talk" | "deckinfo" | "battle-confirm" | "post-win" | "post-lose";

interface ResolvedSlot {
  eventId: string | null;
  script: EventScript;
}

/**
 * ScreenCity: city interior with Battle Cafe and Battle Arena entry points.
 * Battle Cafe residents can be talked to, inspected, or challenged.
 */
export function ScreenCity(props: {
  city: City;
  profile: PlayerProfile;
  /** Fight: actor id, deck id, stable event id (null for visitors), captured dialog. */
  onFight: (
    actorId: number,
    deckId: number,
    eventId: string | null,
    capturedDialog: { winDialogId?: number; loseLine?: string; onWin: EventCommand[] },
  ) => void;
  /** Called when the player finishes the intro dialog for a stable event. */
  onMarkDialogSeen: (eventId: string) => void;
  onBack: () => void;
  pendingPostBattle?: {
    actorId: number;
    eventId: string | null;
    result: "win" | "lose";
    winDialogId?: number;
    loseLine?: string;
  } | null;
  onPostBattleConsumed?: () => void;
}) {
  // ── Signals ──────────────────────────────────────────────────────────────
  const [view, setView] = createSignal<CityView>("menu");
  const [selectedEventId, setSelectedEventId] = createSignal<string | null>(null);
  const [selectedScript, setSelectedScript] = createSignal<EventScript | null>(null);
  const [selectedActor, setSelectedActor] = createSignal<Actor | null>(null);
  const [action, setAction] = createSignal<InteractAction>("options");
  const [arenaNotice, setArenaNotice] = createSignal(false);
  const [lineIndex, setLineIndex] = createSignal(0);
  /** Visitor scripts rolled once when the player enters the cafe. */
  const [visitorScripts, setVisitorScripts] = createSignal<EventScript[]>([]);
  /** True while waiting for the read-delay before transitioning to battle setup. */
  const [launchingBattle, setLaunchingBattle] = createSignal(false);

  // Post-battle multi-line win dialog.
  const [postLines, setPostLines] = createSignal<DialogLine[]>([]);
  const [postLineIndex, setPostLineIndex] = createSignal(0);
  /** Single-line lose message captured from fight start. */
  const [postLoseLine, setPostLoseLine] = createSignal("");

  // ── Derived state ─────────────────────────────────────────────────────────

  const playerActor = () => getActorById(props.profile.avatarActorId);
  const wins = (id: number) => props.profile.records[id]?.wins ?? 0;

  /**
   * Stable event slots — re-derived from profile flags on every render so the
   * cafe grid updates immediately after a win without re-entering the city.
   */
  const resolvedStableSlots = createMemo((): ResolvedSlot[] => {
    const map = getMapById(props.city.id as MapId);
    if (!map) return [];
    return resolveMap(map, props.profile.flags).map(({ event, script }) => ({
      eventId: event.id,
      script,
    }));
  });

  /** All slots: stable events first, then this visit's visitors. */
  const allCafeSlots = (): ResolvedSlot[] => [
    ...resolvedStableSlots(),
    ...visitorScripts().map((script) => ({ eventId: null as string | null, script })),
  ];

  // Dialog context for template variable resolution.
  const dialogCtx = createMemo(() => ({
    player: props.profile,
    actorById: (id: number) => getActorById(id),
    deckById: (id: number) => getDeckById(id),
    packById: (id: number) => getPackById(id),
    cardByNumber: (num: string) => MASTER_CARDS.find((c) => c.number === num) ?? null,
    cityById: (id: string) => getCityById(id),
    actorCityName: (actorId: number) => getCityByActorId(actorId)?.name,
  }));

  /**
   * Intro dialog lines for the currently selected event.
   * Returns [] when: no introDialogId, already seen (stable events only),
   * or dialog has no lines.
   */
  const dialogLines = (): DialogLine[] => {
    const script = selectedScript();
    const introId = script?.dialog?.introDialogId;
    if (!introId) return [];
    const eventId = selectedEventId();
    if (eventId && props.profile.seenDialogs.includes(eventId)) return [];
    return getDialogById(introId)?.lines ?? [];
  };

  const currentLine = () => dialogLines()[lineIndex()];
  const isLastLine = () => lineIndex() >= dialogLines().length - 1;
  const speakingActorId = () => currentLine()?.actor ?? -1;
  const playerSpeaking = () => speakingActorId() === 0;

  // Post-battle dialog helpers.
  const postCurrentLine = () => postLines()[postLineIndex()];
  const isLastPostLine = () => postLineIndex() >= postLines().length - 1;
  const postSpeakingActor = () => postCurrentLine()?.actor ?? -1;
  const postPlayerSpeaking = () => postSpeakingActor() === 0;

  // ── React to pendingPostBattle ────────────────────────────────────────────
  createEffect(() => {
    const pending = props.pendingPostBattle;
    if (!pending) return;

    const actor = getActorById(pending.actorId) ?? null;
    if (!actor) { props.onPostBattleConsumed?.(); return; }

    setSelectedEventId(pending.eventId);
    setSelectedActor(actor);
    // Re-derive the script from the updated profile flags (win may have set flags).
    if (pending.eventId) {
      const updated = resolvedStableSlots().find((s) => s.eventId === pending.eventId);
      setSelectedScript(updated?.script ?? null);
    } else {
      setSelectedScript(null); // visitor — no re-derivation needed
    }
    setLineIndex(0);
    setArenaNotice(false);

    if (pending.result === "win" && pending.winDialogId != null) {
      const dlg = getDialogById(pending.winDialogId);
      if (dlg && dlg.lines.length > 0) {
        setPostLines(dlg.lines);
        setPostLineIndex(0);
        setAction("post-win");
      } else {
        setAction("options");
      }
    } else if (pending.result === "lose" && pending.loseLine) {
      setPostLoseLine(pending.loseLine);
      setPostLineIndex(0);
      setAction("post-lose");
    } else {
      setAction("options");
    }

    setView("interact");
    props.onPostBattleConsumed?.();
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  const openResident = (slot: ResolvedSlot) => {
    const actor = slot.script.actorId ? (getActorById(slot.script.actorId) ?? null) : null;
    if (!actor) return;
    setSelectedEventId(slot.eventId);
    setSelectedScript(slot.script);
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
      // Mark intro dialog seen for stable events.
      const eventId = selectedEventId();
      if (eventId && selectedScript()?.dialog?.introDialogId) {
        props.onMarkDialogSeen(eventId);
      }
      setAction("options");
    } else {
      setLineIndex((n) => n + 1);
    }
  };

  const advancePostLine = () => {
    if (isLastPostLine()) {
      setAction("options");
    } else {
      setPostLineIndex((n) => n + 1);
    }
  };

  const goBack = () => {
    if (launchingBattle()) return;
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

  // ── Typed-text handles — one per speech bubble slot ───────────────────────
  // Each handle is set synchronously by TypedText's onHandle callback on
  // render, so it's always valid when its bubble is visible.
  let introTyped: TypedTextHandle | undefined;
  let recurTyped: TypedTextHandle | undefined;
  let postWinTyped: TypedTextHandle | undefined;
  let postLoseTyped: TypedTextHandle | undefined;
  let battleConfirmTyped: TypedTextHandle | undefined;

  // ── Render ────────────────────────────────────────────────────────────────

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
                const map = getMapById(props.city.id as MapId);
                setVisitorScripts(
                  map ? resolveVisitors(map, props.profile.flags, Math.random) : [],
                );
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
            <For each={Array.from({ length: 12 }, (_, i) => allCafeSlots()[i] ?? null)}>
              {(slot, i) => {
                if (!slot) {
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
                }
                const actor = slot.script.actorId
                  ? (getActorById(slot.script.actorId) ?? null)
                  : null;
                if (!actor) {
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
                }
                return (
                  <button
                    class="sc-resident-card"
                    classList={{ "sc-resident-card--beaten": wins(actor.id) > 0 }}
                    style={{ "animation-delay": `${i() * 0.055}s` }}
                    onClick={() => openResident(slot)}
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
                {/* Talk mode: intro dialog if available and unseen, else recurLine */}
                <Show when={action() === "talk"}>
                  {dialogLines().length > 0 ? (
                    <div
                      class="sc-speech-bubble sc-speech-bubble--talk"
                      onClick={() => {
                        if (introTyped && !introTyped.isDone()) introTyped.skip();
                        else advanceLine();
                      }}
                    >
                      <div class="sc-speech-speaker">
                        {playerSpeaking() ? props.profile.name : selectedActor()?.name}
                      </div>
                      <p class="sc-speech-text">
                        <TypedText
                          segments={resolveSegments(currentLine()?.message ?? "", dialogCtx())}
                          onHandle={(h) => { introTyped = h; }}
                        />
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
                    <div
                      class="sc-speech-bubble sc-speech-bubble--talk"
                      onClick={() => {
                        if (recurTyped && !recurTyped.isDone()) recurTyped.skip();
                        else setAction("options");
                      }}
                    >
                      <div class="sc-speech-speaker">{selectedActor()?.name}</div>
                      <p class="sc-speech-text">
                        <TypedText
                          segments={resolveSegments(selectedScript()?.dialog?.recurLine ?? "…", dialogCtx())}
                          onHandle={(h) => { recurTyped = h; }}
                        />
                      </p>
                      <div class="sc-speech-advance">
                        <span class="sc-dialog-next">✕ Close</span>
                      </div>
                    </div>
                  )}
                </Show>

                {/* Post-win: multi-line win dialog */}
                <Show when={action() === "post-win"}>
                  <div
                    class="sc-speech-bubble sc-speech-bubble--talk sc-speech-bubble--win"
                    onClick={() => {
                      if (postWinTyped && !postWinTyped.isDone()) postWinTyped.skip();
                      else advancePostLine();
                    }}
                  >
                    <div class="sc-speech-speaker">
                      {postPlayerSpeaking() ? props.profile.name : selectedActor()?.name}
                    </div>
                    <p class="sc-speech-text">
                      <TypedText
                        segments={resolveSegments(postCurrentLine()?.message ?? "", dialogCtx())}
                        onHandle={(h) => { postWinTyped = h; }}
                      />
                    </p>
                    <div class="sc-speech-advance">
                      <span class="sc-dialog-counter">{postLineIndex() + 1} / {postLines().length}</span>
                      <span class="sc-dialog-next">{isLastPostLine() ? "✕ Close" : "▶ Next"}</span>
                    </div>
                  </div>
                </Show>

                {/* Post-lose: single opponent line */}
                <Show when={action() === "post-lose"}>
                  <div
                    class="sc-speech-bubble sc-speech-bubble--talk sc-speech-bubble--lose"
                    onClick={() => {
                      if (postLoseTyped && !postLoseTyped.isDone()) postLoseTyped.skip();
                      else setAction("options");
                    }}
                  >
                    <div class="sc-speech-speaker">{selectedActor()?.name}</div>
                    <p class="sc-speech-text">
                      <TypedText
                        segments={resolveSegments(postLoseLine() || "…", dialogCtx())}
                        onHandle={(h) => { postLoseTyped = h; }}
                      />
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
                      <TypedText
                        segments={resolveSegments(
                          launchingBattle()
                            ? (selectedScript()?.dialog?.battleStartLine ??
                               selectedScript()?.dialog?.challengeLine ??
                               "…")
                            : (selectedScript()?.dialog?.challengeLine ?? "…"),
                          dialogCtx(),
                        )}
                        onHandle={(h) => { battleConfirmTyped = h; }}
                      />
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
                      {selectedScript()?.canChallenge !== false && (
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
                    {launchingBattle()
                      ? "Preparing battle…"
                      : `Challenge ${selectedActor()?.name} to a battle?`}
                  </p>
                  <div class="sc-confirm-btns">
                    <button
                      class="sc-btn-yes"
                      disabled={launchingBattle()}
                      onClick={() => {
                        const actor = selectedActor();
                        const script = selectedScript();
                        if (!actor || !script?.deckId || launchingBattle()) return;
                        setLaunchingBattle(true);
                        setTimeout(() => {
                          setLaunchingBattle(false);
                          props.onFight(actor.id, script.deckId!, selectedEventId(), {
                            winDialogId: script.dialog?.winDialogId,
                            loseLine: script.dialog?.loseLine,
                            onWin: script.onWin ?? [],
                          });
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
