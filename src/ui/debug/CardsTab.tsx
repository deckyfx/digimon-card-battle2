import { createSignal, For, Show } from "solid-js";
import { MASTER_CARDS } from "@src/data/master-cards";
import type { MasterCard } from "@src/types";
import { profileStore } from "@src/ui/deck-select";
import type { PlayerProfile } from "@src/store/profile-store";
import { MAX_BAG_COPIES } from "@src/store/profile-store";
import { DebugProfilePicker } from "./DebugProfilePicker";

export function CardsTab() {
  const [profiles, setProfiles] = createSignal(profileStore.list());
  const [selectedProfileId, setSelectedProfileId] = createSignal<string | null>(null);
  const [search, setSearch] = createSignal("");
  const [grantAmount, setGrantAmount] = createSignal(1);
  const [lastMessage, setLastMessage] = createSignal<{ text: string; ok: boolean } | null>(null);

  const activeProfile = () => profiles().find((p) => p.id === selectedProfileId()) ?? null;

  const refresh = () => setProfiles(profileStore.list());

  const filtered = () => {
    const q = search().toLowerCase().trim();
    if (!q) return MASTER_CARDS;
    return MASTER_CARDS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.number.includes(q) ||
        c.specialty?.toLowerCase().includes(q),
    );
  };

  const owned = (cardNumber: string): number => {
    const p = activeProfile();
    return p ? (p.bag[cardNumber] ?? 0) : 0;
  };

  const grantCard = (card: MasterCard) => {
    const p = activeProfile();
    if (!p) {
      setLastMessage({ text: "Select a profile first.", ok: false });
      return;
    }
    if (owned(card.number) >= MAX_BAG_COPIES) {
      setLastMessage({ text: `${card.name} already at max copies (${MAX_BAG_COPIES}).`, ok: false });
      return;
    }
    const amount = Math.max(1, Math.min(grantAmount(), MAX_BAG_COPIES - owned(card.number)));
    const cards = Array.from({ length: amount }, () => card.number);
    profileStore.grantCards(p.id, cards);
    refresh();
    setLastMessage({ text: `Granted ${amount}× ${card.name} to ${p.name}.`, ok: true });
  };

  const setAllCards = (p: PlayerProfile) => {
    // Grant 6 copies of every card.
    const allNumbers = MASTER_CARDS.flatMap((c) => {
      const have = p.bag[c.number] ?? 0;
      const need = MAX_BAG_COPIES - have;
      return Array.from({ length: need }, () => c.number);
    });
    if (allNumbers.length === 0) {
      setLastMessage({ text: "All cards already at max.", ok: false });
      return;
    }
    profileStore.grantCards(p.id, allNumbers);
    refresh();
    setLastMessage({ text: `Granted all cards (max copies) to ${p.name}.`, ok: true });
  };

  return (
    <div class="debug-cards-tab">
      {/* Profile selector */}
      <div class="debug-section">
        <h3 class="debug-section-title">Profile</h3>
        <DebugProfilePicker
          profiles={profiles()}
          selectedId={selectedProfileId()}
          onSelect={setSelectedProfileId}
          extra={(p) => `${Object.values(p.bag).reduce((a, b) => a + b, 0)} cards`}
        />
        <Show when={activeProfile()}>
          {(p) => (
            <div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              <span style="color:#aaa;font-size:0.9rem">
                Bag: <strong style="color:#00f3ff">{Object.values(p().bag).reduce((a, b) => a + b, 0)}</strong> cards total
              </span>
              <button class="debug-btn" style="padding:4px 10px;font-size:0.8rem" onClick={() => setAllCards(p())}>
                Grant ALL cards (max)
              </button>
            </div>
          )}
        </Show>
      </div>

      <Show when={lastMessage()}>
        {(msg) => (
          <div
            style={`padding:8px 12px;border-radius:4px;margin-bottom:12px;background:${msg().ok ? "rgba(40,160,80,0.2)" : "rgba(160,40,40,0.2)"};border:1px solid ${msg().ok ? "rgba(40,200,80,0.4)" : "rgba(200,40,40,0.4)"};color:${msg().ok ? "#5f5" : "#f55"}`}
          >
            {msg().text}
          </div>
        )}
      </Show>

      {/* Card browser */}
      <div class="debug-section">
        <h3 class="debug-section-title">Card Browser</h3>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
          <input
            class="debug-input"
            type="text"
            placeholder="Search by name, number, or specialty…"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            style="flex:1;min-width:200px"
          />
          <label style="color:#aaa;font-size:0.9rem;white-space:nowrap">
            Grant ×{" "}
            <input
              class="debug-input"
              type="number"
              min={1}
              max={MAX_BAG_COPIES}
              value={grantAmount()}
              onInput={(e) => setGrantAmount(Math.max(1, parseInt(e.currentTarget.value) || 1))}
              style="width:50px;display:inline-block"
            />
          </label>
        </div>
        <div class="debug-card-list">
          <For each={filtered()}>
            {(card) => {
              const count = () => owned(card.number);
              return (
                <div class="debug-card-row" classList={{ "at-max": count() >= MAX_BAG_COPIES }}>
                  <span class="debug-card-num">#{card.number}</span>
                  <span class="debug-card-name">{card.name}</span>
                  <span class="debug-card-spe">{card.specialty}</span>
                  <span class="debug-card-owned">
                    {count()}/{MAX_BAG_COPIES}
                  </span>
                  <button
                    class="debug-btn"
                    style="padding:2px 10px;font-size:0.8rem"
                    disabled={!activeProfile() || count() >= MAX_BAG_COPIES}
                    onClick={() => grantCard(card)}
                  >
                    +
                  </button>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
}
