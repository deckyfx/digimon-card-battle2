import { For, Show, createMemo, createSignal } from "solid-js";
import type { City } from "@src/data/cities";
import { getCityById, getCityByActorId } from "@src/data/cities";
import { getActorById, type Actor } from "@src/data/actors";
import { getDeckById } from "@src/data/prebuilt-decks";
import { getPackById } from "@src/data/prize-packs";
import { MASTER_CARDS } from "@src/data/master-cards";
import { getTalkDialog } from "@src/data/dialogs";
import { resolveSegments } from "@src/data/dialog-resolver";
import type { PlayerProfile } from "@src/store/profile-store";
import { DeckColorBar } from "./DeckColorBar";
import { ActorMugshotView } from "./ActorMugshotView";
import "./screen-city.css";

type CityView = "menu" | "cafe" | "interact";
type InteractAction = "options" | "talk" | "deckinfo" | "battle-confirm";

/**
 * ScreenCity: city interior with Battle Cafe and Battle Arena entry points.
 * Battle Cafe residents can be talked to, inspected, or challenged.
 */
export function ScreenCity(props: {
  city: City;
  profile: PlayerProfile;
  onFight: (actorId: number) => void;
  onBack: () => void;
}) {
  const [view, setView] = createSignal<CityView>("menu");
  const [selectedActor, setSelectedActor] = createSignal<Actor | null>(null);
  const [action, setAction] = createSignal<InteractAction>("options");
  const [arenaNotice, setArenaNotice] = createSignal(false);
  const [lineIndex, setLineIndex] = createSignal(0);

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

  const dialogLines = () => activeDialog()?.lines ?? [];
  const currentLine = () => dialogLines()[lineIndex()];
  const isLastLine = () => lineIndex() >= dialogLines().length - 1;

  // Who is speaking on the current line: 0 = player, else opponent
  const speakingActorId = () => currentLine()?.actor ?? -1;
  const playerSpeaking = () => speakingActorId() === 0;

  const openResident = (actor: Actor) => {
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
      setAction("options");
    } else {
      setLineIndex((n) => n + 1);
    }
  };

  const goBack = () => {
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
              onClick={() => { setArenaNotice(false); setView("cafe"); }}
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
            <For each={props.city.cafeActorIds}>
              {(actorId, i) => {
                const actor = getActorById(actorId);
                if (!actor) return null;
                return (
                  <button
                    class="sc-resident-card"
                    classList={{ "sc-resident-card--beaten": wins(actorId) > 0 }}
                    style={{ "animation-delay": `${i() * 0.055}s` }}
                    onClick={() => openResident(actor)}
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
                      <Show when={wins(actorId) > 0}>
                        <span class="sc-beaten-badge">✓</span>
                      </Show>
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
                  "sc-avatar-col--speaking": action() === "talk" && playerSpeaking(),
                  "sc-avatar-col--silent":   action() === "talk" && !playerSpeaking(),
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
                {/* Talk mode: speaker + text + advance — whole bubble is clickable */}
                <Show when={action() === "talk"}>
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
                      <Show when={activeDialog()}>
                        <span class="sc-dialog-counter">
                          {lineIndex() + 1} / {dialogLines().length}
                        </span>
                      </Show>
                      <span class="sc-dialog-next">
                        {isLastLine() ? "✕ Close" : "▶ Next"}
                      </span>
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

                {/* Idle: empty bubble, no attribution */}
                <Show when={action() === "options" || action() === "battle-confirm"}>
                  <p class="sc-speech-text sc-speech-text--idle">…</p>
                </Show>
              </div>

              <div
                class="sc-avatar-col sc-avatar-col--opponent"
                classList={{
                  "sc-avatar-col--speaking": action() === "talk" && !playerSpeaking(),
                  "sc-avatar-col--silent":   action() === "talk" && playerSpeaking(),
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

            {/* Menu — replaced by battle confirm when active */}
            <Show
              when={action() === "battle-confirm"}
              fallback={
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
                  <button
                    class="sc-action-btn sc-action-btn--battle"
                    onClick={() => setAction("battle-confirm")}
                  >
                    ⚔ Battle
                  </button>
                </div>
              }
            >
              <div class="sc-battle-confirm">
                <p class="sc-confirm-text">
                  Challenge {selectedActor()?.name} to a battle?
                </p>
                <div class="sc-confirm-btns">
                  <button
                    class="sc-btn-yes"
                    onClick={() => {
                      const actor = selectedActor();
                      if (actor) props.onFight(actor.id);
                    }}
                  >
                    ⚔ Yes, fight!
                  </button>
                  <button class="sc-btn-no" onClick={() => setAction("options")}>
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
