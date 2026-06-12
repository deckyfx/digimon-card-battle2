import { For, Show, createSignal } from "solid-js";
import { getActorById } from "@src/data/actors";
import { MASTER_CARDS } from "@src/data/master-cards";
import { type PlayerProfile, type ProfileStore, starterDecks } from "@src/store/profile-store";
import { DeckColorBar } from "./DeckColorBar";
import { ActorPicker } from "./ActorPicker";
import { CardInspector } from "./CardInspector";
import { setInspectedCard } from "./CardView";

const CARD_BY_NUMBER = new Map(MASTER_CARDS.map((c) => [c.number, c]));

/**
 * App entry screen: pick an existing player profile or create a new one
 * (name + avatar + starter deck). Creating grants the starter deck's cards
 * to the profile's bag and builds its first deck.
 */
export function ProfilesScreen(props: { store: ProfileStore; onSelect: (profile: PlayerProfile) => void }) {
  const [profiles, setProfiles] = createSignal(props.store.list());
  const [creating, setCreating] = createSignal(props.store.list().length === 0);
  const [confirmDeleteId, setConfirmDeleteId] = createSignal<string | null>(null);

  // New-profile wizard state.
  const [name, setName] = createSignal("");
  const [avatarActorId, setAvatarActorId] = createSignal(0);
  const [starterId, setStarterId] = createSignal<number | null>(null);
  const [error, setError] = createSignal("");

  const bagTotal = (p: PlayerProfile) => Object.values(p.bag).reduce((a, b) => a + b, 0);

  const createProfile = () => {
    setError("");
    if (starterId() === null) {
      setError("Pick a starter deck.");
      return;
    }
    try {
      const profile = props.store.create({
        name: name(),
        avatarActorId: avatarActorId(),
        starterDeckId: starterId() as number,
      });
      setProfiles(props.store.list());
      props.onSelect(profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const deleteProfile = (id: string) => {
    if (confirmDeleteId() !== id) {
      setConfirmDeleteId(id);
      return;
    }
    props.store.delete(id);
    setConfirmDeleteId(null);
    setProfiles(props.store.list());
    if (props.store.list().length === 0) setCreating(true);
  };

  return (
    <div class="setup">
      <h1 class="game-title">DIGITAL CARD BATTLE</h1>
      <p class="subtitle">Player Profiles</p>

      <Show when={!creating()}>
        <div class="profile-list">
          <For each={profiles()} fallback={<div class="tag">No profiles yet — create your first tamer!</div>}>
            {(p) => (
              <div class="profile-card" onClick={() => props.onSelect(p)}>
                <img class="portrait" src={getActorById(p.avatarActorId)?.portrait} alt={p.name} />
                <div class="profile-info">
                  <div class="profile-name">{p.name}</div>
                  <div class="tag">
                    🎴 {bagTotal(p)} cards · 🃏 {p.decks.length} deck{p.decks.length === 1 ? "" : "s"}
                  </div>
                </div>
                <button
                  class="mini"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProfile(p.id);
                  }}
                >
                  {confirmDeleteId() === p.id ? "Sure?" : "🗑"}
                </button>
              </div>
            )}
          </For>
        </div>
        <div class="setup-actions">
          <button class="primary" onClick={() => setCreating(true)}>
            ＋ New Profile
          </button>
        </div>
      </Show>

      <Show when={creating()}>
        <div class="setup-grid">
          <div class="setup-side">
            <h3>New Tamer</h3>
            <label>Name</label>
            <input
              type="text"
              value={name()}
              maxLength={20}
              placeholder="Tamer name (max 20)"
              onInput={(e) => setName(e.currentTarget.value)}
            />
            <label>Avatar</label>
            <ActorPicker selectedId={avatarActorId()} onPick={setAvatarActorId} />
          </div>

          <div class="setup-side">
            <h3>Starter Deck</h3>
            <div class="tag">
              Its 30 cards become your card bag (plus 5 semi-random reserve cards) — your first deck is built
              from them.
            </div>
            <For each={starterDecks()}>
              {(d) => (
                <div
                  class="starter-deck"
                  classList={{ selected: starterId() === d.id }}
                  onClick={() => setStarterId(d.id)}
                >
                  <div class="pool-row">
                    <span class="pool-name">{d.name}</span>
                    <span class="pool-meta">Partner: {d.owner}</span>
                  </div>
                  <DeckColorBar cardNumbers={d.cardNumbers} />
                </div>
              )}
            </For>
            <Show when={starterId() !== null}>
              <div class="tag">Hover a card to inspect it below.</div>
              <div class="starter-cards">
                <For each={[...new Set(starterDecks().find((d) => d.id === starterId())?.cardNumbers ?? [])]}>
                  {(n) => {
                    const card = CARD_BY_NUMBER.get(n);
                    const count = starterDecks()
                      .find((d) => d.id === starterId())
                      ?.cardNumbers.filter((x) => x === n).length;
                    return (
                      <span class="tag starter-card" onMouseEnter={() => card && setInspectedCard(card)}>
                        {count}× {card?.name ?? n}
                      </span>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div>
        </div>

        <Show when={starterId() !== null}>
          <div style={{ "text-align": "left", "max-width": "420px", margin: "0 auto" }}>
            <CardInspector />
          </div>
        </Show>

        <Show when={error()}>
          <div class="warn" style={{ "margin-bottom": "8px" }}>
            ⚠ {error()}
          </div>
        </Show>
        <div class="setup-actions">
          <Show when={profiles().length > 0}>
            <button onClick={() => setCreating(false)}>← Back</button>
          </Show>
          <button class="primary" onClick={createProfile}>
            ✔ Create Profile
          </button>
        </div>
      </Show>
    </div>
  );
}
