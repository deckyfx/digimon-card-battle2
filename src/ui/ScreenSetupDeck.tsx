import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import { CardLevel, CardSpecialty, CardType, type MasterCard } from "@src/types";
import { MASTER_CARDS } from "@src/data/master-cards";
import { ARMOR_PARTNER, PARTNER_ARMORS, partnersIn } from "@src/data/armor";
import { DECK_SIZE, MAX_COPIES, MAX_NAME_LENGTH, type CustomDeck } from "@src/store/custom-deck-store";
import { MAX_DECKS, type PlayerProfile, type ProfileStore } from "@src/store/profile-store";
import { DigiCardFront } from "./DigiCard";
import { getLevelBadge, getSpecialtyIcon, getOptionIcon } from "./DigiCard";
import { DeckColorBar } from "./DeckColorBar";
import { CardDetail } from "./CardDetail";
import "./screen-setup-deck.css";

const CARD_BY_NUMBER = new Map(MASTER_CARDS.map((c) => [c.number, c]));
const cardName = (n: string) => CARD_BY_NUMBER.get(n)?.name ?? n;
const ALL = "All";

type EditorMode = "list" | "edit";

function deckStats(numbers: string[]): string {
  const counts: Record<string, number> = {};
  for (const n of numbers) {
    const c = CARD_BY_NUMBER.get(n);
    if (!c) continue;
    const key = c.level === CardLevel.None ? "Option" : c.specialty;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([k, v]) => `${k} ×${v}`)
    .join("  ·  ");
}

export function ScreenSetupDeck(props: { store: ProfileStore; profileId: string; onBack: () => void }) {
  const [profile, setProfile] = createSignal<PlayerProfile>(
    props.store.get(props.profileId) as PlayerProfile,
  );
  const [mode, setMode] = createSignal<EditorMode>("list");

  // ── Hovered card for detail panel ──────────────────────────────────────────
  const [hoveredCard, setHoveredCard] = createSignal<MasterCard | null>(null);

  // ── Editor state ──────────────────────────────────────────────────────────
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [deckName, setDeckName] = createSignal("My Deck");
  const [numbers, setNumbers] = createSignal<string[]>([]);
  const [armors, setArmors] = createSignal<string[]>([]);
  const [message, setMessage] = createSignal("");

  // ── Add Cards dialog ──────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  const [typeFilter, setTypeFilter] = createSignal(ALL);
  const [specFilter, setSpecFilter] = createSignal(ALL);
  const [levelFilter, setLevelFilter] = createSignal(ALL);

  const owned = (n: string) => profile().bag[n] ?? 0;
  const copiesOf = (n: string) => numbers().filter((x) => x === n).length;
  const maxCopiesOf = (n: string) => Math.min(MAX_COPIES, owned(n));

  const partners = createMemo(() => partnersIn(numbers()));
  const ownedArmorsOf = (partner: string) =>
    (PARTNER_ARMORS[partner] ?? []).filter((a) => owned(a) > 0);

  createEffect(() => {
    const eligible = new Set(partners());
    const pruned = armors().filter((a) => eligible.has(ARMOR_PARTNER[a] as string));
    if (pruned.length !== armors().length) setArmors(pruned);
  });

  const armorOf = (partner: string): string | null =>
    armors().find((a) => ARMOR_PARTNER[a] === partner) ?? null;
  const setArmorOf = (partner: string, armor: string | null): void => {
    const rest = armors().filter((a) => ARMOR_PARTNER[a] !== partner);
    setArmors(armor ? [...rest, armor] : rest);
  };

  const pool = createMemo(() => {
    const q = search().toLowerCase();
    return MASTER_CARDS.filter((c) => {
      if (owned(c.number) === 0) return false;
      if (typeFilter() !== ALL && c.type !== typeFilter()) return false;
      if (specFilter() !== ALL && c.specialty !== specFilter()) return false;
      if (levelFilter() !== ALL && c.level !== levelFilter()) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.number.includes(q)) return false;
      return true;
    });
  });

  /** Deck as individual cards sorted by card number. */
  const deckCards = createMemo<MasterCard[]>(() =>
    [...numbers()]
      .sort()
      .map((n) => CARD_BY_NUMBER.get(n))
      .filter((c): c is MasterCard => c !== undefined),
  );

  const emptySlots = createMemo(() =>
    Array.from({ length: Math.max(0, DECK_SIZE - numbers().length) }, (_, i) => i),
  );

  // ── Card operations ───────────────────────────────────────────────────────
  const addCard = (c: MasterCard) => {
    if (c.level === CardLevel.A) {
      setMessage(`${c.name} is Armor — select it in the side deck section.`);
      return;
    }
    if (numbers().length >= DECK_SIZE) { setMessage(`Deck is full (${DECK_SIZE}).`); return; }
    if (copiesOf(c.number) >= maxCopiesOf(c.number)) {
      setMessage(
        copiesOf(c.number) >= MAX_COPIES
          ? `Max ${MAX_COPIES} copies of ${c.name}.`
          : `You only own ${owned(c.number)}× ${c.name}.`,
      );
      return;
    }
    setNumbers([...numbers(), c.number]);
    setMessage("");
  };

  const removeCard = (n: string) => {
    const next = [...numbers()];
    const idx = next.lastIndexOf(n);
    if (idx >= 0) next.splice(idx, 1);
    setNumbers(next);
    setMessage("");
  };

  // ── List operations ───────────────────────────────────────────────────────
  const startNew = () => {
    setEditingId(null); setDeckName("My Deck");
    setNumbers([]); setArmors([]); setMessage("");
    setHoveredCard(null);
    setMode("edit");
  };

  const editDeck = (d: CustomDeck) => {
    setEditingId(d.id); setDeckName(d.name);
    setNumbers([...d.cardNumbers]); setArmors([...(d.armors ?? [])]);
    setMessage(""); setHoveredCard(null); setMode("edit");
  };

  const copyDeck = (d: CustomDeck) => {
    const existing = profile().decks.map((x) => x.name);
    // Find the first "Copy N" name that doesn't clash
    let copyName = `${d.name} Copy`.slice(0, MAX_NAME_LENGTH);
    if (existing.some((n) => n.toLowerCase() === copyName.toLowerCase())) {
      for (let i = 2; i <= 9; i++) {
        const candidate = `${d.name} Copy ${i}`.slice(0, MAX_NAME_LENGTH);
        if (!existing.some((n) => n.toLowerCase() === candidate.toLowerCase())) {
          copyName = candidate;
          break;
        }
      }
    }
    try {
      const updated = props.store.saveDeck(props.profileId, {
        name: copyName,
        cardNumbers: [...d.cardNumbers],
        armors: d.armors ? [...d.armors] : undefined,
      });
      setProfile(updated);
    } catch (e) {
      // saveDeck already guards MAX_DECKS; surface the error in the list
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  const saveDeck = () => {
    try {
      const updated = props.store.saveDeck(props.profileId, {
        id: editingId() ?? undefined,
        name: deckName(),
        cardNumbers: numbers(),
        armors: armors(),
      });
      setProfile(updated);
      const saved = updated.decks.find(
        (d) => d.name.toLowerCase() === deckName().trim().toLowerCase(),
      );
      if (saved) setEditingId(saved.id);
      setMessage(`Saved "${deckName().trim()}" ✓`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  const deleteDeck = (d: CustomDeck) => {
    try {
      setProfile(props.store.deleteDeck(props.profileId, d.id));
      if (editingId() === d.id) { setMode("list"); setMessage(""); }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  const setDefault = (d: CustomDeck) =>
    setProfile(props.store.setDefaultDeck(props.profileId, d.id));

  const backToList = () => { setMode("list"); setMessage(""); setHoveredCard(null); };

  return (
    <div class="ssd-root">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div class="ssd-hero">
        <h1 class="ssd-title">Setup Deck</h1>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/*  LIST VIEW                                                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Show when={mode() === "list"}>
        <div class="ssd-list-root">
          <div class="ssd-list-toolbar">
            <Show when={profile().decks.length < MAX_DECKS}>
              <button class="ssd-btn-create" onClick={startNew}>＋ Create New Deck</button>
            </Show>
            <button class="ssd-btn-ghost ssd-btn-back-list" onClick={props.onBack}>← Back</button>
          </div>

          <div class="ssd-deck-list">
            <For each={profile().decks} fallback={
              <div class="ssd-empty">No decks yet — create your first deck!</div>
            }>
              {(d, idx) => (
                <div class="ssd-deck-card">
                  <div class="ssd-deck-card-body">
                    <div class="ssd-deck-name">
                      {d.name}
                      <Show when={idx() === 0}>
                        <span class="ssd-default-badge">DEFAULT</span>
                      </Show>
                    </div>
                    <div class="ssd-deck-bar"><DeckColorBar cardNumbers={d.cardNumbers} /></div>
                    <div class="ssd-deck-stats">{deckStats(d.cardNumbers)}</div>
                    <Show when={d.armors && d.armors.length > 0}>
                      <div class="ssd-deck-armor">🛡 {(d.armors ?? []).map(cardName).join(", ")}</div>
                    </Show>
                  </div>
                  <div class="ssd-deck-card-actions">
                    <button
                      class="ssd-btn-action"
                      disabled={idx() === 0}
                      onClick={() => setDefault(d)}
                    >
                      ★ Default
                    </button>
                    <button class="ssd-btn-action" onClick={() => editDeck(d)}>Edit</button>
                    <Show when={profile().decks.length < MAX_DECKS}>
                      <button class="ssd-btn-action" onClick={() => copyDeck(d)}>Copy</button>
                    </Show>
                    <button
                      class="ssd-btn-action ssd-btn-danger"
                      disabled={profile().decks.length <= 1}
                      onClick={() => deleteDeck(d)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/*  EDIT VIEW                                                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Show when={mode() === "edit"}>
        <div class="ssd-edit-root">

          <div class="ssd-edit-bar">
            <button class="ssd-btn-ghost" onClick={backToList}>← Decks</button>
            <input
              class="ssd-name-input"
              type="text"
              value={deckName()}
              maxLength={MAX_NAME_LENGTH}
              placeholder="Deck name…"
              onInput={(e) => setDeckName(e.currentTarget.value)}
            />
            <div class="ssd-edit-bar-right">
              <span class="ssd-count-badge">{numbers().length} / {DECK_SIZE}</span>
              <button class="ssd-btn-add" onClick={() => setAddOpen(true)}>＋ Add Cards</button>
              <button class="ssd-btn-save" onClick={saveDeck}>✔ Save</button>
            </div>
          </div>

          <Show when={message()}>
            <div class="ssd-message" classList={{ "ssd-message--ok": message().endsWith("✓") }}>{message()}</div>
          </Show>

          {/* Main two-column layout: grid left | detail right */}
          <div class="ssd-edit-main">
            <div class="ssd-edit-left">
              <div class="ssd-colorbar-wrap"><DeckColorBar cardNumbers={numbers()} /></div>

              {/* 10 × 3 card grid */}
              <div class="ssd-card-grid">
                <For each={deckCards()}>
                  {(card) => (
                    <div
                      class="ssd-slot"
                      onMouseEnter={() => setHoveredCard(card)}
                    >
                      <div class="ssd-card-inner">
                        <DigiCardFront card={card} />
                      </div>
                      <button class="ssd-remove" onClick={() => removeCard(card.number)}>×</button>
                    </div>
                  )}
                </For>
                <For each={emptySlots()}>
                  {() => <div class="ssd-slot ssd-slot--empty" />}
                </For>
              </div>

              {/* Armor side deck */}
              <Show when={partners().length > 0}>
                <div class="ssd-armor-section">
                  <div class="ssd-armor-label">🛡 Armor Side Deck</div>
                  <div class="ssd-armor-row">
                    <For each={partners()}>
                      {(partner) => (
                        <Show
                          when={ownedArmorsOf(partner).length > 0}
                          fallback={<span class="ssd-armor-none">{cardName(partner)}: no armor owned</span>}
                        >
                          <select
                            class="ssd-armor-select"
                            onChange={(e) => setArmorOf(partner, e.currentTarget.value || null)}
                          >
                            <option value="" selected={armorOf(partner) === null}>
                              {cardName(partner)}: none
                            </option>
                            <For each={ownedArmorsOf(partner)}>
                              {(n) => (
                                <option value={n} selected={armorOf(partner) === n}>
                                  → {cardName(n)}
                                </option>
                              )}
                            </For>
                          </select>
                        </Show>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>

            {/* Right: card detail panel */}
            <div class="ssd-detail-panel">
              <Show
                when={hoveredCard()}
                fallback={<div class="ssd-detail-empty">Hover a card to inspect</div>}
              >
                <CardDetail card={hoveredCard()!} />
              </Show>
            </div>
          </div>

        </div>
      </Show>

      {/* ── Add Cards dialog ─────────────────────────────────────────────── */}
      <Show when={addOpen()}>
        <Portal mount={document.body}>
          <div class="ssd-overlay" onClick={() => setAddOpen(false)}>
            <div class="ssd-dialog" onClick={(e) => e.stopPropagation()}>

              <div class="ssd-dialog-header">
                <span class="ssd-dialog-title">Add Cards</span>
                <span class="ssd-dialog-count">{numbers().length} / {DECK_SIZE}</span>
                <button class="ssd-dialog-close" onClick={() => setAddOpen(false)}>✕</button>
              </div>

              <div class="ssd-dialog-filters">
                <input
                  class="ssd-filter-input"
                  type="text"
                  placeholder="🔍 Search name or #…"
                  value={search()}
                  onInput={(e) => setSearch(e.currentTarget.value)}
                />
                <select class="ssd-filter-select" onChange={(e) => setTypeFilter(e.currentTarget.value)}>
                  <option value={ALL}>All Types</option>
                  <For each={[CardType.Digimon, CardType.Option]}>
                    {(t) => <option value={t}>{t}</option>}
                  </For>
                </select>
                <select class="ssd-filter-select" onChange={(e) => setSpecFilter(e.currentTarget.value)}>
                  <option value={ALL}>All Specialties</option>
                  <For each={Object.values(CardSpecialty)}>
                    {(sp) => <option value={sp}>{sp}</option>}
                  </For>
                </select>
                <select class="ssd-filter-select" onChange={(e) => setLevelFilter(e.currentTarget.value)}>
                  <option value={ALL}>All Levels</option>
                  <For each={[CardLevel.R, CardLevel.C, CardLevel.U, CardLevel.A, CardLevel.None]}>
                    {(l) => <option value={l}>{l === CardLevel.None ? "Option" : l}</option>}
                  </For>
                </select>
              </div>

              {/* Two-column body: table left | detail right */}
              <div class="ssd-dialog-body">
                <div class="ssd-pool-table-wrap">
                  <table class="ssd-pool-table">
                    <thead>
                      <tr>
                        <th class="ssd-th-num">#</th>
                        <th class="ssd-th-name">Name</th>
                        <th class="ssd-th-icon">Lvl</th>
                        <th class="ssd-th-icon">Spec</th>
                        <th class="ssd-th-hp">HP</th>
                        <th class="ssd-th-own">Own</th>
                        <th class="ssd-th-deck">Deck</th>
                        <th class="ssd-th-add"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <Show
                        when={pool().length > 0}
                        fallback={
                          <tr>
                            <td colspan={8} class="ssd-pool-empty-td">No owned cards match the filters.</td>
                          </tr>
                        }
                      >
                        <For each={pool()}>
                          {(c) => {
                            const atMax = () =>
                              c.level === CardLevel.A ||
                              copiesOf(c.number) >= maxCopiesOf(c.number) ||
                              numbers().length >= DECK_SIZE;
                            const isOpt = c.level === CardLevel.None;
                            return (
                              <tr
                                class="ssd-pool-row"
                                classList={{ "ssd-pool-row--full": atMax() }}
                                onMouseEnter={() => setHoveredCard(c)}
                              >
                                <td class="ssd-td-num">#{c.number}</td>
                                <td class="ssd-td-name">{c.name}</td>
                                <td class="ssd-td-icon">
                                  <img
                                    src={isOpt ? getOptionIcon(c) : getLevelBadge(c)}
                                    class="ssd-row-icon"
                                    alt={c.level}
                                  />
                                </td>
                                <td class="ssd-td-icon">
                                  <img
                                    src={isOpt ? getOptionIcon(c) : getSpecialtyIcon(c)}
                                    class="ssd-row-icon"
                                    alt={c.specialty}
                                  />
                                </td>
                                <td class="ssd-td-hp">{c.hp || "—"}</td>
                                <td class="ssd-td-own">{owned(c.number)}</td>
                                <td class="ssd-td-deck">
                                  {copiesOf(c.number) > 0 ? `×${copiesOf(c.number)}` : ""}
                                </td>
                                <td class="ssd-td-add">
                                  <button
                                    class="ssd-pool-add"
                                    disabled={atMax()}
                                    onClick={() => addCard(c)}
                                  >
                                    ＋
                                  </button>
                                </td>
                              </tr>
                            );
                          }}
                        </For>
                      </Show>
                    </tbody>
                  </table>
                </div>

                {/* Right: card detail */}
                <div class="ssd-dialog-detail">
                  <Show
                    when={hoveredCard()}
                    fallback={<div class="ssd-detail-empty">Hover a card to inspect</div>}
                  >
                    <CardDetail card={hoveredCard()!} />
                  </Show>
                </div>
              </div>

            </div>
          </div>
        </Portal>
      </Show>

    </div>
  );
}
