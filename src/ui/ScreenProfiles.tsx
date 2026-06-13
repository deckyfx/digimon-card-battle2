import { For, Show, createSignal } from "solid-js";
import { getActorById } from "@src/data/actors";
import { type PlayerProfile, type ProfileStore } from "@src/store/profile-store";
import { ScreenCreateProfile } from "./ScreenCreateProfile";
import "./screen-profiles.css";

export function ProfilesScreen(props: { store: ProfileStore; onSelect: (profile: PlayerProfile) => void }) {
  const [profiles, setProfiles] = createSignal(props.store.list());
  const [creating, setCreating] = createSignal(false);
  const [confirmDeleteId, setConfirmDeleteId] = createSignal<string | null>(null);

  const bagTotal = (p: PlayerProfile) => Object.values(p.bag).reduce((a, b) => a + b, 0);
  const record   = (p: PlayerProfile) => props.store.totalRecord(p);

  const deleteProfile = (id: string) => {
    if (confirmDeleteId() !== id) { setConfirmDeleteId(id); return; }
    props.store.delete(id);
    setConfirmDeleteId(null);
    setProfiles(props.store.list());
  };

  const goDebug = () => {
    window.history.pushState(null, "", "/debug");
    window.dispatchEvent(new Event("popstate"));
  };

  return (
    <Show
      when={!creating()}
      fallback={
        <ScreenCreateProfile
          store={props.store}
          onDone={(p) => { setProfiles(props.store.list()); setCreating(false); props.onSelect(p); }}
          onCancel={() => setCreating(false)}
        />
      }
    >
      <div class="sp-root">

        <div class="sp-hero">
          <h1 class="sp-title">DIGITAL CARD BATTLE</h1>
          <p class="sp-subtitle">Select a profile to begin</p>
        </div>

        <div class="sp-toolbar">
          <button class="sp-btn-create" onClick={() => setCreating(true)}>＋ Create New</button>
          <button class="sp-btn-debug" onClick={goDebug}>🛠</button>
        </div>

        <div class="sp-list">
          <For each={profiles()} fallback={
            <div class="sp-empty">No profiles yet — create your first tamer!</div>
          }>
            {(p) => {
              const r = record(p);
              const portrait = getActorById(p.avatarActorId)?.portrait;
              return (
                <div class="sp-card">
                  <div class="sp-card-portrait">
                    <Show when={portrait} fallback={<div class="sp-portrait-placeholder">?</div>}>
                      <img class="sp-portrait-img" src={portrait} alt={p.name} />
                    </Show>
                  </div>

                  <div class="sp-card-body">
                    <div class="sp-card-name">{p.name}</div>
                    <div class="sp-card-stats">
                      <span class="sp-stat"><span class="sp-stat-icon">🎴</span>{bagTotal(p)} cards</span>
                      <span class="sp-stat-sep">·</span>
                      <span class="sp-stat"><span class="sp-stat-icon">🃏</span>{p.decks.length} deck{p.decks.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div class="sp-card-stats">
                      <span class="sp-stat"><span class="sp-stat-icon">⭐</span>{p.exp.toLocaleString()} EXP</span>
                      <span class="sp-stat-sep">·</span>
                      <span class="sp-stat sp-stat-wins">{r.wins}W</span>
                      <span class="sp-stat-sep">/</span>
                      <span class="sp-stat sp-stat-losses">{r.losses}L</span>
                    </div>
                  </div>

                  <div class="sp-card-actions">
                    <button class="sp-btn-play" onClick={() => props.onSelect(p)}>▶ PLAY</button>
                    <button
                      class="sp-btn-delete"
                      classList={{ "sp-btn-delete--confirm": confirmDeleteId() === p.id }}
                      onClick={(e) => { e.stopPropagation(); deleteProfile(p.id); }}
                    >
                      {confirmDeleteId() === p.id ? "Confirm?" : "🗑 Delete"}
                    </button>
                  </div>
                </div>
              );
            }}
          </For>
        </div>

      </div>
    </Show>
  );
}
