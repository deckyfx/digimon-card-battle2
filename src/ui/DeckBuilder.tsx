import { For, Show, createMemo, createSignal } from "solid-js";
import { CardLevel, CardSpecialty, CardType, type MasterCard } from "@src/types";
import { MASTER_CARDS } from "@src/data/master-cards";
import { DECK_SIZE, MAX_COPIES, MAX_NAME_LENGTH, type CustomDeck, type CustomDeckStore } from "@src/store/custom-deck-store";
import { DECK_LISTS } from "@src/data/deck-lists";
import { CardInspector } from "./App";
import { DeckColorBar } from "./DeckColorBar";
import { setInspectedCard } from "./CardView";

const ALL = "All";

/**
 * Custom deck builder: browse the 301-card pool, assemble exactly 30 cards
 * (max 4 copies per card), persist via the CustomDeckStore.
 */
export function DeckBuilder(props: { store: CustomDeckStore; onBack: () => void }) {
  const [decks, setDecks] = createSignal<CustomDeck[]>(props.store.list());

  // Editor state
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [deckName, setDeckName] = createSignal("My Deck");
  const [numbers, setNumbers] = createSignal<string[]>([]);
  const [message, setMessage] = createSignal("");

  // Pool filters
  const [search, setSearch] = createSignal("");
  const [templateSearch, setTemplateSearch] = createSignal("");

  const templateMatches = () =>
    DECK_LISTS.filter(
      (d) =>
        d.name.toLowerCase().includes(templateSearch().toLowerCase()) ||
        d.owner.toLowerCase().includes(templateSearch().toLowerCase()),
    );
  const [typeFilter, setTypeFilter] = createSignal(ALL);
  const [specFilter, setSpecFilter] = createSignal(ALL);
  const [levelFilter, setLevelFilter] = createSignal(ALL);

  const copiesOf = (n: string) => numbers().filter((x) => x === n).length;

  const pool = createMemo(() => {
    const q = search().toLowerCase();
    return MASTER_CARDS.filter((c) => {
      if (typeFilter() !== ALL && c.type !== typeFilter()) return false;
      if (specFilter() !== ALL && c.specialty !== specFilter()) return false;
      if (levelFilter() !== ALL && c.level !== levelFilter()) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  /** Deck contents grouped by card for display. */
  const grouped = createMemo(() => {
    const counts = new Map<string, number>();
    for (const n of numbers()) counts.set(n, (counts.get(n) ?? 0) + 1);
    return [...counts.entries()]
      .map(([n, count]) => ({ card: MASTER_CARDS.find((c) => c.number === n) as MasterCard, count }))
      .sort((a, b) => a.card.number.localeCompare(b.card.number));
  });

  const addCard = (c: MasterCard): void => {
    if (numbers().length >= DECK_SIZE) {
      setMessage(`Deck is full (${DECK_SIZE} cards).`);
      return;
    }
    if (copiesOf(c.number) >= MAX_COPIES) {
      setMessage(`Max ${MAX_COPIES} copies of ${c.name}.`);
      return;
    }
    setNumbers([...numbers(), c.number]);
    setMessage("");
  };

  const removeCard = (n: string) => {
    const next = [...numbers()];
    const idx = next.indexOf(n);
    if (idx >= 0) next.splice(idx, 1);
    setNumbers(next);
    setMessage("");
  };

  const startNew = () => {
    setEditingId(null);
    setDeckName("My Deck");
    setNumbers([]);
    setMessage("");
  };

  const edit = (d: CustomDeck) => {
    setEditingId(d.id);
    setDeckName(d.name);
    setNumbers([...d.cardNumbers]);
    setMessage("");
  };

  const saveDeck = (): void => {
    const errors = props.store.validate(numbers());
    if (!deckName().trim()) errors.unshift("Deck name is required.");
    if (errors.length > 0) {
      setMessage(errors.join(" "));
      return;
    }
    try {
      const saved = props.store.save({ id: editingId() ?? undefined, name: deckName(), cardNumbers: numbers() });
      setEditingId(saved.id);
      setDecks(props.store.list());
      setMessage(`Saved "${saved.name}" ✅`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  /** Copy a prebuilt template into the editor as a new (unsaved) deck. */
  const copyTemplate = (templateId: number) => {
    const tpl = DECK_LISTS.find((d) => d.id === templateId);
    if (!tpl) return;
    setEditingId(null); // saving creates a NEW deck, never overwrites
    setDeckName(tpl.name.replace(/\s*Deck$/i, "").slice(0, MAX_NAME_LENGTH));
    setNumbers([...tpl.cardNumbers]);
    setMessage(`Copied template "${tpl.name}" (${tpl.owner}) — rename and save as your own.`);
  };

  /** Copy a saved custom deck into the editor as a new (unsaved) deck. */
  const copyCustom = (d: CustomDeck) => {
    setEditingId(null); // saving creates a NEW deck
    setDeckName(`${d.name} copy`.slice(0, MAX_NAME_LENGTH));
    setNumbers([...d.cardNumbers]);
    setMessage(`Copied "${d.name}" — rename and save as a new deck.`);
  };

  const deleteDeck = (d: CustomDeck) => {
    props.store.delete(d.id);
    setDecks(props.store.list());
    if (editingId() === d.id) startNew();
  };

  return (
    <div class="builder-columns">
      {/* ── Card pool ───────────────────────────────────────────── */}
      <div class="area">
        <h2>Card Pool ({pool().length})</h2>
        <div class="builder-filters">
          <input type="text" placeholder="Search name…" value={search()} onInput={(e) => setSearch(e.currentTarget.value)} />
          <select onChange={(e) => setTypeFilter(e.currentTarget.value)}>
            <For each={[ALL, CardType.Digimon, CardType.Option]}>{(t) => <option value={t}>{t}</option>}</For>
          </select>
          <select onChange={(e) => setSpecFilter(e.currentTarget.value)}>
            <For each={[ALL, ...Object.values(CardSpecialty)]}>{(sp) => <option value={sp}>{sp}</option>}</For>
          </select>
          <select onChange={(e) => setLevelFilter(e.currentTarget.value)}>
            <For each={[ALL, CardLevel.R, CardLevel.C, CardLevel.U, CardLevel.A]}>
              {(l) => <option value={l}>{l}</option>}
            </For>
          </select>
        </div>
        <div class="pool-list">
          <For each={pool()}>
            {(c) => (
              <div class="pool-row" onMouseEnter={() => setInspectedCard(c)}>
                <span class="pool-name">
                  #{c.number} {c.name}
                </span>
                <span class="pool-meta">
                  {c.type === CardType.Digimon ? `${c.level}/${c.specialty} HP${c.hp}` : "Option"}
                </span>
                <span class="pool-copies">{copiesOf(c.number) || ""}</span>
                <button
                  disabled={copiesOf(c.number) >= MAX_COPIES || numbers().length >= DECK_SIZE}
                  onClick={() => addCard(c)}
                >
                  +
                </button>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* ── Current deck ────────────────────────────────────────── */}
      <div class="area">
        <h2>
          Deck — {numbers().length}/{DECK_SIZE}
        </h2>
        <DeckColorBar cardNumbers={numbers()} />
        <div class="builder-filters">
          <input
            type="text"
            placeholder="🔍 Search templates (name or owner)…"
            value={templateSearch()}
            onInput={(e) => setTemplateSearch(e.currentTarget.value)}
          />
          <select
            onChange={(e) => {
              if (e.currentTarget.value) copyTemplate(parseInt(e.currentTarget.value, 10));
              e.currentTarget.value = "";
            }}
          >
            <option value="">📋 Copy from template… ({templateMatches().length})</option>
            <For each={templateMatches()}>
              {(d) => (
                <option value={d.id}>
                  {d.name} — {d.owner}
                </option>
              )}
            </For>
          </select>
        </div>
        <div class="builder-filters">
          <input
            type="text"
            value={deckName()}
            onInput={(e) => setDeckName(e.currentTarget.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder={`Deck name (max ${MAX_NAME_LENGTH})`}
          />
          <button class="primary" onClick={saveDeck}>
            Save
          </button>
          <button onClick={startNew}>New</button>
          <button onClick={props.onBack}>← Back</button>
        </div>
        <Show when={message()}>
          <div class="warn">{message()}</div>
        </Show>
        <div class="pool-list">
          <For each={grouped()} fallback={<div class="tag">Add cards from the pool.</div>}>
            {(e) => (
              <div class="pool-row" onMouseEnter={() => setInspectedCard(e.card)}>
                <span class="pool-name">
                  {e.count}× {e.card.name}
                </span>
                <span class="pool-meta">
                  {e.card.type === CardType.Digimon ? `${e.card.level}/${e.card.specialty}` : "Option"}
                </span>
                <button onClick={() => removeCard(e.card.number)}>−</button>
                <button disabled={e.count >= MAX_COPIES || numbers().length >= DECK_SIZE} onClick={() => addCard(e.card)}>
                  +
                </button>
              </div>
            )}
          </For>
        </div>

        <h2 style={{ "margin-top": "12px" }}>Saved Decks</h2>
        <For each={decks()} fallback={<div class="tag">No custom decks yet.</div>}>
          {(d) => (
            <div class="pool-row">
              <span class="pool-name">{d.name}</span>
              <DeckColorBar cardNumbers={d.cardNumbers} />
              <button onClick={() => edit(d)}>Edit</button>
              <button onClick={() => copyCustom(d)}>Copy</button>
              <button onClick={() => deleteDeck(d)}>🗑</button>
            </div>
          )}
        </For>
      </div>

      {/* ── Inspector ───────────────────────────────────────────── */}
      <div>
        <CardInspector />
      </div>
    </div>
  );
}
