import { createSignal, For, Show, createMemo } from "solid-js";
import { DebugProfilePicker } from "./DebugProfilePicker";
import { PARTNERS, partnerLevelFromExp, PARTNER_ORDER } from "@src/data/partners";
import type { PartnerId } from "@src/data/partners";
import { DIGIPARTS } from "@src/data/digiparts";
import { profileStore } from "@src/ui/deck-select";

export function DigipartsTab() {
  const [profiles, setProfiles] = createSignal(profileStore.list());
  const [selectedProfileId, setSelectedProfileId] = createSignal<string | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = createSignal<PartnerId | null>(null);
  const [search, setSearch] = createSignal("");
  const [lastMessage, setLastMessage] = createSignal<{ text: string; ok: boolean } | null>(null);

  const refresh = () => setProfiles(profileStore.list());
  const msg = (text: string, ok = true) => setLastMessage({ text, ok });

  const activeProfile = () => profiles().find((p) => p.id === selectedProfileId()) ?? null;
  const activePartner = () => {
    const pid = selectedPartnerId();
    const prof = activeProfile();
    if (!pid || !prof) return null;
    return prof.partners.find((p) => p.id === pid) ?? null;
  };

  const grantDigipart = (dpId: number) => {
    const p = activeProfile();
    if (!p) { msg("Select a profile first.", false); return; }
    profileStore.grantDigipart(p.id, dpId);
    refresh();
    msg(`DigiPart #${dpId} (${DIGIPARTS[dpId]?.name ?? "?"}) granted to ${p.name}.`);
  };

  const grantAll = () => {
    const p = activeProfile();
    if (!p) { msg("Select a profile first.", false); return; }
    for (let i = 0; i < DIGIPARTS.length; i++) {
      profileStore.grantDigipart(p.id, i);
    }
    refresh();
    msg(`All ${DIGIPARTS.length} DigiParts granted to ${p.name}.`);
  };

  const equipDigipart = (dpId: number) => {
    const p = activeProfile();
    const pid = selectedPartnerId();
    if (!p || !pid) { msg("Select a partner to equip on.", false); return; }
    const err = profileStore.equipDigipart(p.id, pid, dpId);
    if (err) { msg(err, false); return; }
    refresh();
    msg(`DigiPart #${dpId} equipped on ${pid}.`);
  };

  const unequipDigipart = (partnerId: PartnerId, dpId: number) => {
    const p = activeProfile();
    if (!p) return;
    profileStore.unequipDigipart(p.id, partnerId, dpId);
    refresh();
    msg(`DigiPart #${dpId} unequipped from ${partnerId}.`);
  };

  const filteredDigiparts = createMemo(() => {
    const q = search().toLowerCase().trim();
    if (!q) return DIGIPARTS;
    return DIGIPARTS.filter(
      (dp) => dp.name.toLowerCase().includes(q) || String(dp.id).includes(q) || dp.group.includes(q),
    );
  });

  // All parts currently equipped on any partner for the active profile
  const allEquipped = createMemo(() => {
    const prof = activeProfile();
    if (!prof) return new Set<number>();
    return new Set(prof.partners.flatMap((p) => p.equippedDigiparts));
  });

  return (
    <div class="debug-partners-tab">
      {/* Profile selector */}
      <div class="debug-section">
        <h3 class="debug-section-title">Profile</h3>
        <DebugProfilePicker
          profiles={profiles()}
          selectedId={selectedProfileId()}
          onSelect={(id) => { setSelectedProfileId(id); setSelectedPartnerId(null); }}
          extra={(p) => `${p.ownedDigiparts.length} DigiParts owned`}
        />
      </div>

      <Show when={lastMessage()}>
        {(m) => (
          <div style={`padding:8px 12px;border-radius:4px;margin-bottom:12px;background:${m().ok ? "rgba(40,160,80,0.2)" : "rgba(160,40,40,0.2)"};border:1px solid ${m().ok ? "rgba(40,200,80,0.4)" : "rgba(200,40,40,0.4)"};color:${m().ok ? "#5f5" : "#f55"}`}>
            {m().text}
          </div>
        )}
      </Show>

      <Show when={activeProfile()}>
        {(prof) => (
          <div style="display:flex;flex-direction:column;gap:16px">

            {/* Owned pool */}
            <div class="debug-section">
              <h3 class="debug-section-title">
                Owned DigiParts — {prof().ownedDigiparts.length} / {DIGIPARTS.length}
              </h3>
              <div style="max-height:100px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">
                <For each={prof().ownedDigiparts}>
                  {(dpId) => {
                    const dp = DIGIPARTS[dpId];
                    const equippedOn = () => {
                      const p = prof().partners.find((pt) => pt.equippedDigiparts.includes(dpId));
                      return p ? (PARTNERS.find((d) => d.id === p.id)?.name ?? p.id) : null;
                    };
                    return (
                      <div
                        style="background:rgba(0,243,255,0.07);border:1px solid rgba(0,243,255,0.2);border-radius:3px;padding:3px 8px;font-size:0.78rem;display:flex;gap:6px;align-items:center"
                        title={dp?.group ?? ""}
                      >
                        <span style="color:#00f3ff">#{dpId}</span>
                        <span style="color:#ccc">{dp?.name ?? "?"}</span>
                        <Show when={equippedOn()}>
                          <span style="color:#0f5;font-size:0.72rem">✓ {equippedOn()}</span>
                        </Show>
                      </div>
                    );
                  }}
                </For>
                <Show when={prof().ownedDigiparts.length === 0}>
                  <span style="color:#555;font-size:0.85rem">None yet.</span>
                </Show>
              </div>
              <button
                class="debug-btn"
                style="background:rgba(157,78,221,0.2);border-color:rgba(157,78,221,0.5);color:#c77dff"
                onClick={grantAll}
              >
                ⚡ Grant All {DIGIPARTS.length} DigiParts
              </button>
            </div>

            {/* Equipped per partner */}
            <div class="debug-section">
              <h3 class="debug-section-title">Equipped per Partner</h3>
              <div style="display:flex;gap:12px;flex-wrap:wrap">
                <For each={prof().partners}>
                  {(pt) => {
                    const pdef = PARTNERS.find((d) => d.id === pt.id)!;
                    const isSelected = () => selectedPartnerId() === pt.id;
                    return (
                      <div
                        style={`background:rgba(255,255,255,0.03);border:1px solid ${isSelected() ? "rgba(0,243,255,0.5)" : "rgba(255,255,255,0.08)"};border-radius:6px;padding:10px 14px;min-width:160px;cursor:pointer`}
                        onClick={() => setSelectedPartnerId(pt.id)}
                      >
                        <div style="font-size:0.9rem;color:#00f3ff;font-weight:600;margin-bottom:6px">
                          {pdef.name} · Lv {partnerLevelFromExp(pt.totalExp)}
                        </div>
                        <div style="display:flex;flex-direction:column;gap:3px">
                          <For each={[0, 1, 2]}>
                            {(slot) => {
                              const dpId = pt.equippedDigiparts[slot];
                              const dp = dpId != null ? DIGIPARTS[dpId] : null;
                              return (
                                <div style="display:flex;gap:6px;align-items:center;font-size:0.78rem">
                                  <span style="color:#444;width:14px">{slot + 1}.</span>
                                  <Show when={dp} fallback={<span style="color:#333">— empty —</span>}>
                                    <span style="color:#ccc;flex:1">{dp!.name}</span>
                                    <button
                                      class="debug-btn"
                                      style="padding:1px 5px;font-size:0.7rem"
                                      onClick={(e) => { e.stopPropagation(); unequipDigipart(pt.id, dpId!); }}
                                    >
                                      ✕
                                    </button>
                                  </Show>
                                </div>
                              );
                            }}
                          </For>
                        </div>
                        <Show when={isSelected()}>
                          <div style="font-size:0.72rem;color:#9d4edd;margin-top:6px">← equip target</div>
                        </Show>
                      </div>
                    );
                  }}
                </For>
                <Show when={prof().partners.length === 0}>
                  <span style="color:#555;font-size:0.85rem">No partners unlocked.</span>
                </Show>
              </div>
            </div>

            {/* Grant / equip browser */}
            <div class="debug-section">
              <h3 class="debug-section-title">Grant &amp; Equip DigiParts</h3>
              <Show when={selectedPartnerId()}>
                <div style="margin-bottom:8px;font-size:0.85rem;color:#9d4edd">
                  Equip target: <strong style="color:#c77dff">{PARTNERS.find((d) => d.id === selectedPartnerId())?.name ?? selectedPartnerId()}</strong>
                  {" "}(slot {activePartner()?.equippedDigiparts.length ?? 0}/3 used)
                  <button
                    class="debug-btn"
                    style="padding:1px 6px;font-size:0.75rem;margin-left:8px"
                    onClick={() => setSelectedPartnerId(null)}
                  >
                    Clear
                  </button>
                </div>
              </Show>
              <input
                class="debug-input"
                type="text"
                placeholder="Search by name, id, or group…"
                value={search()}
                onInput={(e) => setSearch(e.currentTarget.value)}
                style="width:100%;margin-bottom:8px"
              />
              <div style="max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:2px">
                <For each={filteredDigiparts()}>
                  {(dp) => {
                    const owned = () => prof().ownedDigiparts.includes(dp.id);
                    const equippedOn = () => prof().partners.find((pt) => pt.equippedDigiparts.includes(dp.id));
                    const canEquip = () => {
                      if (!selectedPartnerId()) return false;
                      const partner = activePartner();
                      if (!partner) return false;
                      if (!owned()) return false;
                      if (equippedOn()) return false;
                      if (partner.equippedDigiparts.length >= 3) return false;
                      // Check group conflict
                      return !partner.equippedDigiparts.some((id) => DIGIPARTS[id]?.group === dp.group);
                    };
                    return (
                      <div style="display:flex;gap:8px;align-items:center;padding:4px 8px;border-radius:3px;background:rgba(255,255,255,0.02)">
                        <span style="color:#888;font-size:0.8rem;width:28px">#{dp.id}</span>
                        <span style="color:#ddd;font-size:0.85rem;flex:1">{dp.name}</span>
                        <span style="color:#666;font-size:0.75rem;width:80px">{dp.group}</span>
                        <Show when={equippedOn()}>
                          {(pt) => (
                            <span style="color:#0c8;font-size:0.75rem;width:60px">
                              ✓ {PARTNERS.find((d) => d.id === pt().id)?.name ?? pt().id}
                            </span>
                          )}
                        </Show>
                        <Show when={owned() && !equippedOn()}>
                          <span style="color:#0c8;font-size:0.75rem;width:60px">owned</span>
                        </Show>
                        <Show when={!owned()}>
                          <span style="color:#555;font-size:0.75rem;width:60px" />
                        </Show>
                        <Show when={!owned()}>
                          <button
                            class="debug-btn"
                            style="padding:2px 8px;font-size:0.78rem"
                            onClick={() => grantDigipart(dp.id)}
                          >
                            Grant
                          </button>
                        </Show>
                        <Show when={owned() && !equippedOn() && selectedPartnerId()}>
                          <button
                            class="debug-btn"
                            style="padding:2px 8px;font-size:0.78rem"
                            disabled={!canEquip()}
                            onClick={() => equipDigipart(dp.id)}
                          >
                            Equip
                          </button>
                        </Show>
                        <Show when={owned() && !equippedOn() && !selectedPartnerId()}>
                          <button
                            class="debug-btn"
                            style="padding:2px 8px;font-size:0.78rem;opacity:0.4"
                            disabled
                          >
                            Equip
                          </button>
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>

          </div>
        )}
      </Show>
    </div>
  );
}
