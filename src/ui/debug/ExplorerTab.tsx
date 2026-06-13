import { createSignal, For, Show } from "solid-js";
import { MASTER_CARDS } from "@src/data/master-cards";
import { CardLevel } from "@src/types";
import { getLevelBadge, getSpecialtyIcon, getOptionIcon } from "@src/ui/DigiCard";
import { CardDetail } from "@src/ui/CardDetail";


export function ExplorerTab() {
  const [searchQuery, setSearchQuery] = createSignal("");
  const [filterLevel, setFilterLevel] = createSignal("ALL");
  const [filterSpec, setFilterSpec] = createSignal("ALL");
  const [selectedCardIdx, setSelectedCardIdx] = createSignal(0);

  const filteredCards = () =>
    MASTER_CARDS.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery().toLowerCase()) ||
        c.number.includes(searchQuery());
      const matchLevel = filterLevel() === "ALL" || c.level === filterLevel();
      const matchSpec = filterSpec() === "ALL" || c.specialty === filterSpec();
      return matchSearch && matchLevel && matchSpec;
    });

  // Read directly — never through <Show>'s memoized accessor (SolidJS pitfall)
  const selectedCard = () => {
    const list = filteredCards();
    return list[selectedCardIdx()] ?? list[0] ?? MASTER_CARDS[0]!;
  };


  return (
    <div class="debug-panel">
      <h2>📂 CARD DATABASE EXPLORER</h2>
      <p style={{ margin: "0 0 20px 0", color: "rgba(226, 232, 240, 0.6)" }}>
        Browse all 301 cards, filter by level / specialty, and inspect scripts.
      </p>


      {/* Filters */}
      <div class="explorer-filters">
        <input
          type="text"
          class="sim-input"
          style={{ flex: 2 }}
          placeholder="Search by name or number…"
          value={searchQuery()}
          onInput={(e) => { setSearchQuery(e.currentTarget.value); setSelectedCardIdx(0); }}
        />
        <select class="sim-select" style={{ flex: 1 }} value={filterLevel()}
          onChange={(e) => { setFilterLevel(e.currentTarget.value); setSelectedCardIdx(0); }}>
          <option value="ALL">All Levels</option>
          <option value="R">Rookie (R)</option>
          <option value="C">Champion (C)</option>
          <option value="U">Ultimate (U)</option>
          <option value="A">Armor (A)</option>
          <option value="None">Option</option>
        </select>
        <select class="sim-select" style={{ flex: 1 }} value={filterSpec()}
          onChange={(e) => { setFilterSpec(e.currentTarget.value); setSelectedCardIdx(0); }}>
          <option value="ALL">All Specialties</option>
          <option value="Fire">Fire</option>
          <option value="Ice">Ice</option>
          <option value="Nature">Nature</option>
          <option value="Darkness">Darkness</option>
          <option value="Rare">Rare</option>
        </select>
      </div>

      <div class="explorer-grid">
        {/* TABLE */}
        <div class="explorer-table-container">
          <table class="explorer-table">
            <thead>
              <tr>
                <th style={{ width: "52px" }}>No.</th>
                <th>Name</th>
                <th style={{ width: "52px" }}>Lvl</th>
                <th style={{ width: "52px" }}>Spec</th>
                <th style={{ width: "52px" }}>HP</th>
              </tr>
            </thead>
            <tbody>
              <For each={filteredCards()}>
                {(card, idx) => (
                  <tr
                    classList={{ selected: selectedCardIdx() === idx() }}
                    onClick={() => setSelectedCardIdx(idx())}
                    style={{ cursor: "pointer" }}
                  >
                    <td>#{card.number}</td>
                    <td style={{ "font-weight": "bold", color: "#fff", "text-transform": "uppercase", "letter-spacing": "0.04em" }}>{card.name}</td>
                    <td style={{ "text-align": "center" }}>
                      <Show when={card.level !== CardLevel.None}
                        fallback={<img src={getOptionIcon(card)} style={{ width: "20px", height: "20px" }} alt="opt" />}>
                        <img src={getLevelBadge(card)} style={{ width: "22px", height: "22px" }} alt={card.level} />
                      </Show>
                    </td>
                    <td style={{ "text-align": "center" }}>
                      <Show when={card.level !== CardLevel.None}
                        fallback={<img src={getOptionIcon(card)} style={{ width: "18px", height: "18px" }} alt="opt" />}>
                        <img src={getSpecialtyIcon(card)} style={{ width: "18px", height: "18px" }} alt={card.specialty} />
                      </Show>
                    </td>
                    <td>{card.hp || "-"}</td>
                  </tr>
                )}
              </For>
              <Show when={filteredCards().length === 0}>
                <tr>
                  <td colspan={5} style={{ "text-align": "center", padding: "40px", color: "rgba(226, 232, 240, 0.3)" }}>
                    No cards match the filters.
                  </td>
                </tr>
              </Show>
            </tbody>
          </table>
        </div>

        {/* DETAIL PANEL */}
        <div class="explorer-detail-panel">
          <CardDetail card={selectedCard()} showScripts />
        </div>
      </div>
    </div>
  );
}
