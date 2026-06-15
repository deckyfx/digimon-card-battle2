import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import type { PlayerProfile } from "@src/store/profile-store";

/**
 * Styled searchable dropdown for selecting a profile in debug tabs.
 * Consistent look across CardsTab, PartnersTab, and KeyItemsTab.
 */
export function DebugProfilePicker(props: {
  profiles: PlayerProfile[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Optional extra info line shown under each profile name in the list. */
  extra?: (p: PlayerProfile) => string;
}) {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  let containerRef: HTMLDivElement | undefined;
  let searchRef: HTMLInputElement | undefined;

  const selected = () =>
    props.profiles.find((p) => p.id === props.selectedId) ?? null;

  const filtered = () => {
    const q = query().toLowerCase().trim();
    if (!q) return props.profiles;
    return props.profiles.filter((p) => p.name.toLowerCase().includes(q));
  };

  const choose = (id: string) => {
    props.onSelect(id);
    setOpen(false);
    setQuery("");
  };

  const toggle = () => {
    const next = !open();
    setOpen(next);
    if (next) setQuery("");
  };

  // Close on outside click
  onMount(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef && !containerRef.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    onCleanup(() => document.removeEventListener("mousedown", handler));
  });

  // Focus search input when dropdown opens
  const afterOpen = () => {
    if (open()) setTimeout(() => searchRef?.focus(), 0);
  };

  return (
    <div
      class="dpp-root"
      ref={containerRef}
    >
      {/* Trigger */}
      <button
        class="dpp-trigger"
        classList={{ "dpp-trigger--open": open() }}
        onClick={() => { toggle(); afterOpen(); }}
        type="button"
      >
        <Show when={selected()} fallback={<span class="dpp-placeholder">— select profile —</span>}>
          {(p) => (
            <>
              <span class="dpp-selected-avatar">◈</span>
              <span class="dpp-selected-name">{p().name}</span>
              <span class="dpp-selected-meta">
                {p().partners.length} partner{p().partners.length !== 1 ? "s" : ""} · ⭐{p().exp}
              </span>
            </>
          )}
        </Show>
        <span class="dpp-chevron">{open() ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown panel */}
      <Show when={open()}>
        <div class="dpp-panel">
          {/* Search */}
          <div class="dpp-search-row">
            <input
              ref={searchRef}
              class="dpp-search"
              type="text"
              placeholder="Search profiles…"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setOpen(false); setQuery(""); }
                if (e.key === "Enter") {
                  const first = filtered()[0];
                  if (first) choose(first.id);
                }
              }}
            />
          </div>

          {/* Profile list */}
          <div class="dpp-list">
            <Show when={filtered().length === 0}>
              <div class="dpp-empty">No profiles match "{query()}"</div>
            </Show>
            <For each={filtered()}>
              {(p) => (
                <button
                  class="dpp-item"
                  classList={{ "dpp-item--selected": props.selectedId === p.id }}
                  onClick={() => choose(p.id)}
                  type="button"
                >
                  <span class="dpp-item-dot" />
                  <span class="dpp-item-name">{p.name}</span>
                  <span class="dpp-item-meta">
                    {props.extra ? props.extra(p) : `${p.partners.length}p · ⭐${p.exp}`}
                  </span>
                  <Show when={props.selectedId === p.id}>
                    <span class="dpp-item-check">✓</span>
                  </Show>
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
