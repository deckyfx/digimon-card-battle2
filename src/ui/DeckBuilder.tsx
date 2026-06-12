import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { CardLevel, CardSpecialty, CardType, type MasterCard } from "@src/types";
import { MASTER_CARDS } from "@src/data/master-cards";
import { ARMOR_PARTNER, PARTNER_ARMORS, partnersIn } from "@src/data/armor";
import { DECK_SIZE, MAX_COPIES, MAX_NAME_LENGTH, type CustomDeck } from "@src/store/custom-deck-store";
import { MAX_DECKS, type PlayerProfile, type ProfileStore } from "@src/store/profile-store";
import { CardInspector } from "./CardInspector";
import { DeckColorBar } from "./DeckColorBar";
import { setInspectedCard } from "./CardView";

const ALL = "All";

/**
 * Profile deck builder: assemble up to {@link MAX_DECKS} decks of exactly
 * 30 cards from the profile's OWNED card bag. Bag copies are shadow-cloned
 * into decks — a deck may not use more copies of a card than the bag owns
 * (and never more than 4), but the same copy may appear in every deck.
 */
export function DeckBuilder(props: { store: ProfileStore; profileId: string; onBack: () => void }) {
  const [profile, setProfile] = createSignal<PlayerProfile>(props.store.get(props.profileId) as PlayerProfile);

  // Editor state
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [deckName, setDeckName] = createSignal("My Deck");
  const [numbers, setNumbers] = createSignal<string[]>([]);
  /** Hidden armor side deck: at most one armor number per partner in the 30. */
  const [armors, setArmors] = createSignal<string[]>([]);
  const [message, setMessage] = createSignal("");

  // Pool filters
  const [search, setSearch] = createSignal("");
  const [typeFilter, setTypeFilter] = createSignal(ALL);
  const [specFilter, setSpecFilter] = createSignal(ALL);
  const [levelFilter, setLevelFilter] = createSignal(ALL);

  const owned = (n: string) => profile().bag[n] ?? 0;
  const copiesOf = (n: string) => numbers().filter((x) => x === n).length;
  /** Per-deck ceiling for a card: 4-copy rule AND owned count. */
  const maxCopiesOf = (n: string) => Math.min(MAX_COPIES, owned(n));

  /** Distinct partner Rookies currently in the deck list. */
  const partners = createMemo(() => partnersIn(numbers()));
  /** Owned armors selectable for `partner`. */
  const ownedArmorsOf = (partner: string) => (PARTNER_ARMORS[partner] ?? []).filter((a) => owned(a) > 0);

  // Removing a partner invalidates its selected armor — prune it.
  createEffect(() => {
    const eligible = new Set(partners());
    const pruned = armors().filter((a) => eligible.has(ARMOR_PARTNER[a] as string));
    if (pruned.length !== armors().length) setArmors(pruned);
  });

  /** The armor currently selected for `partner` (null = none). */
  const armorOf = (partner: string): string | null =>
    armors().find((a) => ARMOR_PARTNER[a] === partner) ?? null;

  /** Sets/clears the single armor slot bound to `partner`. */
  const setArmorOf = (partner: string, armor: string | null): void => {
    const rest = armors().filter((a) => ARMOR_PARTNER[a] !== partner);
    setArmors(armor ? [...rest, armor] : rest);
  };

  const cardName = (n: string) => MASTER_CARDS.find((c) => c.number === n)?.name ?? n;
  const bagTotal = () => Object.values(profile().bag).reduce((a, b) => a + b, 0);

  /** The pool shows ONLY owned cards (the bag), with filters applied. */
  const pool = createMemo(() => {
    const q = search().toLowerCase();
    return MASTER_CARDS.filter((c) => {
      if (owned(c.number) === 0) return false;
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
    if (c.level === CardLevel.A) {
      setMessage(`${c.name} is an Armor card — pick it as the side deck below (needs its partner in the 30).`);
      return;
    }
    if (numbers().length >= DECK_SIZE) {
      setMessage(`Deck is full (${DECK_SIZE} cards).`);
      return;
    }
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
    const idx = next.indexOf(n);
    if (idx >= 0) next.splice(idx, 1);
    setNumbers(next);
    setMessage("");
  };

  const startNew = () => {
    setEditingId(null);
    setDeckName("My Deck");
    setNumbers([]);
    setArmors([]);
    setMessage("");
  };

  const edit = (d: CustomDeck) => {
    setEditingId(d.id);
    setDeckName(d.name);
    setNumbers([...d.cardNumbers]);
    setArmors([...(d.armors ?? [])]);
    setMessage("");
  };

  /** Copy a saved deck into the editor as a new (unsaved) deck. */
  const copyDeck = (d: CustomDeck) => {
    setEditingId(null); // saving creates a NEW deck
    setDeckName(`${d.name} copy`.slice(0, MAX_NAME_LENGTH));
    setNumbers([...d.cardNumbers]);
    setArmors([...(d.armors ?? [])]);
    setMessage(`Copied "${d.name}" — rename and save as a new deck.`);
  };

  const saveDeck = (): void => {
    try {
      const updated = props.store.saveDeck(props.profileId, {
        id: editingId() ?? undefined,
        name: deckName(),
        cardNumbers: numbers(),
        armors: armors(),
      });
      setProfile(updated);
      const saved = updated.decks.find((d) => d.name.toLowerCase() === deckName().trim().toLowerCase());
      if (saved) setEditingId(saved.id);
      setMessage(`Saved "${deckName().trim()}" ✅`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const deleteDeck = (d: CustomDeck) => {
    setProfile(props.store.deleteDeck(props.profileId, d.id));
    if (editingId() === d.id) startNew();
  };

  return (
    <div class="builder-columns">
      {/* ── Card bag (owned pool) ───────────────────────────────── */}
      <div class="area">
        <h2>
          Card Bag ({pool().length} kinds · {bagTotal()} cards)
        </h2>
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
          <For each={pool()} fallback={<div class="tag">No owned cards match the filters.</div>}>
            {(c) => (
              <div class="pool-row" onMouseEnter={() => setInspectedCard(c)}>
                <span class="pool-name">
                  #{c.number} {c.name}
                </span>
                <span class="pool-meta">
                  {c.type === CardType.Digimon ? `${c.level}/${c.specialty}` : "Option"} · own {owned(c.number)}
                </span>
                <span class="pool-copies">{copiesOf(c.number) || ""}</span>
                <button
                  disabled={
                    c.level === CardLevel.A ||
                    copiesOf(c.number) >= maxCopiesOf(c.number) ||
                    numbers().length >= DECK_SIZE
                  }
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
          <button disabled={profile().decks.length >= MAX_DECKS && editingId() === null} onClick={startNew}>
            New
          </button>
          <button onClick={props.onBack}>← Back</button>
        </div>
        <DeckColorBar cardNumbers={numbers()} />
        {/* Armor side deck: one optional OWNED armor per partner in the 30. */}
        <Show
          when={partners().length > 0}
          fallback={<div class="tag">🛡 Armor side deck — add a partner Rookie to unlock.</div>}
        >
          <div class="builder-stack">
            <For each={partners()}>
              {(partner) => (
                <Show
                  when={ownedArmorsOf(partner).length > 0}
                  fallback={<div class="tag">🛡 {cardName(partner)}: no armor owned yet.</div>}
                >
                  <select
                    onChange={(e) => setArmorOf(partner, e.currentTarget.value || null)}
                    onMouseOver={(e) => {
                      const card = MASTER_CARDS.find((c) => c.number === (e.target as HTMLOptionElement).value);
                      if (card) setInspectedCard(card);
                    }}
                  >
                    <option value="" selected={armorOf(partner) === null}>
                      🛡 {cardName(partner)} armor: none
                    </option>
                    <For each={ownedArmorsOf(partner)}>
                      {(n) => (
                        <option value={n} selected={armorOf(partner) === n}>
                          🛡 {cardName(partner)} → {cardName(n)}
                        </option>
                      )}
                    </For>
                  </select>
                </Show>
              )}
            </For>
          </div>
        </Show>
        <Show when={message()}>
          <div class="warn">{message()}</div>
        </Show>
        <div class="pool-list">
          <For each={grouped()} fallback={<div class="tag">Add cards from your bag.</div>}>
            {(e) => (
              <div class="pool-row" onMouseEnter={() => setInspectedCard(e.card)}>
                <span class="pool-name">
                  {e.count}× {e.card.name}
                </span>
                <span class="pool-meta">
                  {e.card.type === CardType.Digimon ? `${e.card.level}/${e.card.specialty}` : "Option"} · own{" "}
                  {owned(e.card.number)}
                </span>
                <button onClick={() => removeCard(e.card.number)}>−</button>
                <button
                  disabled={e.count >= maxCopiesOf(e.card.number) || numbers().length >= DECK_SIZE}
                  onClick={() => addCard(e.card)}
                >
                  +
                </button>
              </div>
            )}
          </For>
        </div>

        <h2 style={{ "margin-top": "12px" }}>
          Saved Decks ({profile().decks.length}/{MAX_DECKS})
        </h2>
        <For each={profile().decks} fallback={<div class="tag">No decks yet.</div>}>
          {(d) => (
            <div class="saved-deck">
              <div class="pool-row">
                <span class="pool-name">
                  {d.name}
                  <Show when={d.armors && d.armors.length > 0}>
                    <span class="tag"> 🛡 {(d.armors ?? []).map(cardName).join(", ")}</span>
                  </Show>
                </span>
                <button onClick={() => edit(d)}>Edit</button>
                <button disabled={profile().decks.length >= MAX_DECKS} onClick={() => copyDeck(d)}>
                  Copy
                </button>
                <button onClick={() => deleteDeck(d)}>🗑</button>
              </div>
              <DeckColorBar cardNumbers={d.cardNumbers} />
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
