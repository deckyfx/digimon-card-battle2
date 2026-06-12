import { For, createSignal } from "solid-js";
import { OPPONENT_ACTORS, PLAYER_ACTORS, getActorById } from "@src/data/actors";

/** Opponent picker: search actors, click a portrait to choose. */
export function ActorPicker(props: { selectedId: number; onPick: (id: number) => void }) {
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
