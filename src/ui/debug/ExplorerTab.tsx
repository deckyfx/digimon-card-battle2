import { createSignal, For, Show } from "solid-js";
import { MASTER_CARDS } from "@src/data/master-cards";
import { CardLevel, CardSpecialty } from "@src/types";

export function ExplorerTab() {
  const [searchQuery, setSearchQuery] = createSignal("");
  const [filterLevel, setFilterLevel] = createSignal("ALL");
  const [filterSpec, setFilterSpec] = createSignal("ALL");
  const [selectedCardIdx, setSelectedCardIdx] = createSignal(0);

  const filteredCards = () => {
    return MASTER_CARDS.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery().toLowerCase()) ||
        c.number.includes(searchQuery());
      const matchLevel = filterLevel() === "ALL" || c.level === filterLevel();
      const matchSpec = filterSpec() === "ALL" || c.specialty === filterSpec();
      return matchSearch && matchLevel && matchSpec;
    });
  };

  // Card Pool Summary statistics
  const cardPoolStats = () => {
    const total = MASTER_CARDS.length;
    let rookies = 0, champions = 0, ultimates = 0, armors = 0, options = 0;
    let totalHp = 0, hpCount = 0;
    const specialties: Record<string, number> = { Fire: 0, Ice: 0, Nature: 0, Darkness: 0, Rare: 0, None: 0 };

    for (const c of MASTER_CARDS) {
      if (c.level === CardLevel.R) rookies++;
      else if (c.level === CardLevel.C) champions++;
      else if (c.level === CardLevel.U) ultimates++;
      else if (c.level === CardLevel.A) armors++;
      else if (c.level === CardLevel.None) options++;

      if (c.hp) {
        totalHp += c.hp;
        hpCount++;
      }

      const specKey = c.specialty as string;
      if (specialties[specKey] !== undefined) {
        specialties[specKey]++;
      }
    }

    return {
      total,
      rookies,
      champions,
      ultimates,
      armors,
      options,
      avgHp: hpCount > 0 ? Math.round(totalHp / hpCount) : 0,
      specialties,
    };
  };

  const selectedCard = () => {
    const list = filteredCards();
    return list[selectedCardIdx()] ?? list[0] ?? MASTER_CARDS[0];
  };

  return (
    <div class="debug-panel">
      <h2>📂 CARD DATABASE EXPLORER & STATS</h2>
      <p style={{ margin: "0 0 20px 0", color: "rgba(226, 232, 240, 0.6)" }}>
        Browse all 301 cards in the database, filter by properties, check overall stats distributions, and view underlying JS support scripts.
      </p>

      {/* Quick pool stats */}
      <div class="sim-stats-grid" style={{ "margin-bottom": "20px" }}>
        <div class="sim-stat-card" style={{ padding: "10px" }}>
          <div class="sim-stat-val" style={{ "font-size": "1.4rem" }}>{cardPoolStats().total}</div>
          <div class="sim-stat-label" style={{ "font-size": "0.75rem" }}>Total Cards</div>
        </div>
        <div class="sim-stat-card" style={{ padding: "10px" }}>
          <div class="sim-stat-val" style={{ "font-size": "1.4rem", color: "#00ffaa" }}>{cardPoolStats().rookies} / {cardPoolStats().champions} / {cardPoolStats().ultimates}</div>
          <div class="sim-stat-label" style={{ "font-size": "0.75rem" }}>R / C / U Count</div>
        </div>
        <div class="sim-stat-card" style={{ padding: "10px" }}>
          <div class="sim-stat-val" style={{ "font-size": "1.4rem", color: "#9d4edd" }}>{cardPoolStats().armors} / {cardPoolStats().options}</div>
          <div class="sim-stat-label" style={{ "font-size": "0.75rem" }}>Armor / Options</div>
        </div>
        <div class="sim-stat-card" style={{ padding: "10px" }}>
          <div class="sim-stat-val" style={{ "font-size": "1.4rem", color: "#ffb703" }}>{cardPoolStats().avgHp} HP</div>
          <div class="sim-stat-label" style={{ "font-size": "0.75rem" }}>Average HP</div>
        </div>
      </div>

      {/* Specialty counts */}
      <div style={{ display: "flex", gap: "10px", "justify-content": "center", "margin-bottom": "20px", "font-size": "0.85rem" }}>
        <span class="tag">Fire: {cardPoolStats().specialties.Fire}</span>
        <span class="tag">Ice: {cardPoolStats().specialties.Ice}</span>
        <span class="tag">Nature: {cardPoolStats().specialties.Nature}</span>
        <span class="tag">Darkness: {cardPoolStats().specialties.Darkness}</span>
        <span class="tag">Rare: {cardPoolStats().specialties.Rare}</span>
      </div>

      {/* Filter controls */}
      <div class="explorer-filters">
        <input
          type="text"
          class="sim-input"
          style={{ flex: 2 }}
          placeholder="Search card by name or number..."
          value={searchQuery()}
          onInput={(e) => {
            setSearchQuery(e.currentTarget.value);
            setSelectedCardIdx(0);
          }}
        />
        <select
          class="sim-select"
          style={{ flex: 1 }}
          value={filterLevel()}
          onChange={(e) => {
            setFilterLevel(e.currentTarget.value);
            setSelectedCardIdx(0);
          }}
        >
          <option value="ALL">All Levels</option>
          <option value="R">Rookie (R)</option>
          <option value="C">Champion (C)</option>
          <option value="U">Ultimate (U)</option>
          <option value="A">Armor (A)</option>
          <option value="None">Option (O)</option>
        </select>
        <select
          class="sim-select"
          style={{ flex: 1 }}
          value={filterSpec()}
          onChange={(e) => {
            setFilterSpec(e.currentTarget.value);
            setSelectedCardIdx(0);
          }}
        >
          <option value="ALL">All Specialties</option>
          <option value="Fire">Fire</option>
          <option value="Ice">Ice</option>
          <option value="Nature">Nature</option>
          <option value="Darkness">Darkness</option>
          <option value="Rare">Rare</option>
        </select>
      </div>

      <div class="explorer-grid">
        {/* TABLE LIST */}
        <div class="explorer-table-container">
          <table class="explorer-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>No.</th>
                <th>Name</th>
                <th style={{ width: "80px" }}>Level</th>
                <th style={{ width: "100px" }}>Specialty</th>
                <th style={{ width: "60px" }}>HP</th>
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
                    <td style={{ "font-weight": "bold", color: "#fff" }}>{card.name}</td>
                    <td>
                      <span class={`badge badge-${card.level === "R" ? "rookie" : card.level === "C" ? "champion" : card.level === "U" ? "ultimate" : card.level === "A" ? "armor" : "option"}`}>
                        {card.level}
                      </span>
                    </td>
                    <td>
                      <Show when={card.specialty}>
                        <span class={`badge badge-${card.specialty?.toLowerCase()}`}>
                          {card.specialty}
                        </span>
                      </Show>
                    </td>
                    <td>{card.hp ?? "-"}</td>
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

        {/* CARD DETAILS */}
        <div class="explorer-detail-panel">
          <Show when={selectedCard()}>
            {(cardAccessor) => {
              const c = cardAccessor();
              return (
                <div>
                  <div class="explorer-detail-header">
                    <div class="tag" style={{ "margin-bottom": "4px" }}>CARD #{c.number}</div>
                    <h3 class="explorer-detail-name">{c.name}</h3>
                  </div>

                  <div class="stat-grid-detail">
                    <div class="sim-stat-card" style={{ padding: "6px" }}>
                      <div style={{ "font-size": "0.75rem", color: "rgba(226, 232, 240, 0.4)" }}>Level</div>
                      <div style={{ "font-size": "1rem", "font-weight": "bold", color: "#00f3ff" }}>{c.level}</div>
                    </div>
                    <div class="sim-stat-card" style={{ padding: "6px" }}>
                      <div style={{ "font-size": "0.75rem", color: "rgba(226, 232, 240, 0.4)" }}>Specialty</div>
                      <div style={{ "font-size": "1rem", "font-weight": "bold", color: "#00ffaa" }}>{c.specialty ?? "-"}</div>
                    </div>
                    <div class="sim-stat-card" style={{ padding: "6px" }}>
                      <div style={{ "font-size": "0.75rem", color: "rgba(226, 232, 240, 0.4)" }}>HP</div>
                      <div style={{ "font-size": "1rem", "font-weight": "bold" }}>{c.hp ?? "-"}</div>
                    </div>
                    <div class="sim-stat-card" style={{ padding: "6px" }}>
                      <div style={{ "font-size": "0.75rem", color: "rgba(226, 232, 240, 0.4)" }}>DP Reward / Cost</div>
                      <div style={{ "font-size": "1rem", "font-weight": "bold" }}>
                        {c.dp_point ?? "-"} / {c.dp_required ?? "-"}
                      </div>
                    </div>
                  </div>

                  {/* Attacks */}
                  <Show when={c.level !== CardLevel.None}>
                    <div style={{ "margin-bottom": "14px" }}>
                      <h4 style={{ margin: "0 0 6px 0", "font-size": "0.85rem", "text-transform": "uppercase", color: "rgba(226, 232, 240, 0.6)" }}>Attacks</h4>
                      <div style={{ display: "flex", "flex-direction": "column", gap: "4px" }}>
                        <div class="tag" style={{ display: "flex", "justify-content": "space-between" }}>
                          <span>🔴 Circle (C):</span> <span>{c.c_pow} ({c.c_attack ?? "None"})</span>
                        </div>
                        <div class="tag" style={{ display: "flex", "justify-content": "space-between" }}>
                          <span>🟢 Triangle (T):</span> <span>{c.t_pow} ({c.t_attack ?? "None"})</span>
                        </div>
                        <div class="tag" style={{ display: "flex", "justify-content": "space-between" }}>
                          <span>❌ Cross (X):</span> <span>{c.x_pow} ({c.x_attack ?? "None"} / Effect: {c.x_effect ?? "None"})</span>
                        </div>
                      </div>
                    </div>
                  </Show>

                  {/* Support */}
                  <Show when={c.support && c.support.trim() !== ""}>
                    <div style={{ "margin-bottom": "14px" }}>
                      <h4 style={{ margin: "0 0 4px 0", "font-size": "0.85rem", "text-transform": "uppercase", color: "rgba(226, 232, 240, 0.6)" }}>Support Effect Description</h4>
                      <div class="tag" style={{ "white-space": "pre-wrap", padding: "8px", "font-size": "0.85rem" }}>
                        {c.support}
                      </div>
                    </div>
                  </Show>

                  {/* Scripts */}
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", "font-size": "0.85rem", "text-transform": "uppercase", color: "rgba(226, 232, 240, 0.6)" }}>Support Script</h4>
                    <div class="sandbox-commands" style={{ "min-height": "auto", "max-height": "120px", "overflow-y": "auto", margin: "0 0 12px 0", padding: "6px", "font-size": "0.8rem", color: "#00ffaa" }}>
                      {c.support_script && c.support_script.trim() !== "" ? c.support_script : "None"}
                    </div>

                    <h4 style={{ margin: "0 0 4px 0", "font-size": "0.85rem", "text-transform": "uppercase", color: "rgba(226, 232, 240, 0.6)" }}>Cross Effect Script</h4>
                    <div class="sandbox-commands" style={{ "min-height": "auto", "max-height": "120px", "overflow-y": "auto", padding: "6px", "font-size": "0.8rem", color: "#d946ef" }}>
                      {c.x_effect_script && c.x_effect_script.trim() !== "" ? c.x_effect_script : "None"}
                    </div>
                  </div>
                </div>
              );
            }}
          </Show>
        </div>
      </div>
    </div>
  );
}
