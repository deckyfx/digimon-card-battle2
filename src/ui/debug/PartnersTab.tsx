import { createSignal, For, Show, createMemo } from "solid-js";
import { DebugProfilePicker } from "./DebugProfilePicker";
import { PARTNERS, PARTNER_PROGRESSIONS, partnerLevelFromExp, partnerExpForLevel, partnerExpToNextLevel, PARTNER_MAX_LEVEL, PARTNER_MAX_EXP } from "@src/data/partners";
import type { PartnerId } from "@src/data/partners";
import { DIGIPARTS } from "@src/data/digiparts";
import { profileStore } from "@src/ui/deck-select";
import type { PartnerState } from "@src/store/profile-store";

export function PartnersTab() {
  const [profiles, setProfiles] = createSignal(profileStore.list());
  const [selectedProfileId, setSelectedProfileId] = createSignal<string | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = createSignal<PartnerId | null>(null);
  const [expInput, setExpInput] = createSignal("");
  const [lastMessage, setLastMessage] = createSignal<{ text: string; ok: boolean } | null>(null);

  const refresh = () => setProfiles(profileStore.list());
  const msg = (text: string, ok = true) => setLastMessage({ text, ok });

  const activeProfile = () => profiles().find((p) => p.id === selectedProfileId()) ?? null;

  const partnerState = (): PartnerState | null => {
    const pid = selectedPartnerId();
    const prof = activeProfile();
    if (!pid || !prof) return null;
    return prof.partners.find((p) => p.id === pid) ?? null;
  };

  const isUnlocked = (id: PartnerId): boolean =>
    activeProfile()?.partners.some((p) => p.id === id) ?? false;

  const unlockPartner = (id: PartnerId) => {
    const p = activeProfile();
    if (!p) { msg("Select a profile first.", false); return; }
    try {
      profileStore.unlockPartner(p.id, id);
      refresh();
      msg(`${id} unlocked!`);
    } catch (e) {
      msg(e instanceof Error ? e.message : String(e), false);
    }
  };

  const applyExp = () => {
    const p = activeProfile();
    const pid = selectedPartnerId();
    if (!p || !pid) { msg("Select a profile and partner first.", false); return; }
    const val = parseInt(expInput(), 10);
    if (isNaN(val) || val < 0) { msg("Enter a valid EXP value (0–9999).", false); return; }
    profileStore.setPartnerExp(p.id, pid, val);
    refresh();
    const newState = profileStore.list().find((x) => x.id === p.id)?.partners.find((x) => x.id === pid);
    const lv = newState ? partnerLevelFromExp(newState.totalExp) : "?";
    msg(`Set ${pid} EXP to ${val} (Level ${lv}).`);
  };

  const grantArmorUnlock = (armorNumber: string) => {
    const p = activeProfile();
    const pid = selectedPartnerId();
    if (!p || !pid) { msg("Select a profile and partner first.", false); return; }
    profileStore.grantCards(p.id, [armorNumber]);
    refresh();
    msg(`Armor card #${armorNumber} added to ${p.name}'s bag.`);
  };

  const setArmor = (armorNumber: string | null) => {
    const p = activeProfile();
    const pid = selectedPartnerId();
    if (!p || !pid) return;
    profileStore.setPartnerArmor(p.id, pid, armorNumber);
    refresh();
    msg(armorNumber ? `Armor #${armorNumber} equipped.` : "Armor cleared.");
  };

  const levelProgress = createMemo(() => {
    const s = partnerState();
    if (!s) return null;
    const exp = s.totalExp;
    const lv = partnerLevelFromExp(exp);
    const forThisLevel = partnerExpForLevel(lv);
    const toNext = partnerExpToNextLevel(exp);
    const inLevel = exp - forThisLevel;
    const needed = toNext + inLevel;
    return { lv, exp, inLevel, toNext, needed };
  });

  const levelRewardList = createMemo(() => {
    const pid = selectedPartnerId();
    if (!pid) return [];
    const prog = PARTNER_PROGRESSIONS[pid];
    return Array.from(prog).map((r, k) => ({ level: k + 2, reward: r }));
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
          extra={(p) => `${p.partners.length}/3 partners`}
        />
      </div>

      <Show when={lastMessage()}>
        {(m) => (
          <div style={`padding:8px 12px;border-radius:4px;margin-bottom:12px;background:${m().ok ? "rgba(40,160,80,0.2)" : "rgba(160,40,40,0.2)"};border:1px solid ${m().ok ? "rgba(40,200,80,0.4)" : "rgba(200,40,40,0.4)"};color:${m().ok ? "#5f5" : "#f55"}`}>
            {m().text}
          </div>
        )}
      </Show>

      {/* Partner selector + unlock */}
      <Show when={activeProfile()}>
        <div class="debug-section">
          <h3 class="debug-section-title">Partners ({activeProfile()!.partners.length}/3)</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <For each={PARTNERS}>
              {(pdef) => {
                const unlocked = () => isUnlocked(pdef.id);
                return (
                  <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
                    <button
                      class="debug-btn"
                      classList={{ active: selectedPartnerId() === pdef.id }}
                      style={!unlocked() ? "opacity:0.4" : ""}
                      onClick={() => unlocked() && setSelectedPartnerId(pdef.id)}
                      disabled={!unlocked()}
                    >
                      {pdef.name}
                    </button>
                    <Show when={!unlocked()}>
                      <button
                        class="debug-btn"
                        style="padding:2px 8px;font-size:0.75rem"
                        onClick={() => unlockPartner(pdef.id)}
                      >
                        Unlock
                      </button>
                    </Show>
                    <Show when={unlocked()}>
                      <span style="color:#00f3ff;font-size:0.8rem">
                        Lv {(() => {
                          const s = activeProfile()?.partners.find((x) => x.id === pdef.id);
                          return s ? partnerLevelFromExp(s.totalExp) : 1;
                        })()}
                      </span>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </Show>

      {/* Partner detail panel */}
      <Show when={partnerState()}>
        {(ps) => {
          const pdef = PARTNERS.find((p) => p.id === ps().id)!;
          const prog = levelProgress();
          return (
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
              {/* EXP / Stats panel */}
              <div class="debug-section">
                <h3 class="debug-section-title">{pdef.name} — Stats</h3>

                {/* Level progress */}
                <Show when={prog}>
                  {(lp) => (
                    <div style="margin-bottom:12px">
                      <div style="font-size:1.1rem;color:#00f3ff;font-weight:700">Level {lp().lv} / {PARTNER_MAX_LEVEL}</div>
                      <div style="color:#aaa;font-size:0.85rem">
                        EXP: {lp().exp} / {PARTNER_MAX_EXP}
                        {lp().lv < PARTNER_MAX_LEVEL && ` — ${lp().inLevel} / ${lp().needed} to next level`}
                      </div>
                      <div style="width:100%;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;margin-top:6px;overflow:hidden">
                        <div
                          style={`height:100%;background:linear-gradient(90deg,#00f3ff,#9d4edd);width:${lp().lv >= PARTNER_MAX_LEVEL ? 100 : Math.round((lp().inLevel / lp().needed) * 100)}%`}
                        />
                      </div>
                    </div>
                  )}
                </Show>

                {/* Stat bonuses */}
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px">
                  {(["bonusHp", "bonusCircle", "bonusTriangle", "bonusCross"] as const).map((key) => {
                    const labels: Record<string, string> = { bonusHp: "HP+", bonusCircle: "Circle+", bonusTriangle: "Triangle+", bonusCross: "Cross+" };
                    return (
                      <div style="background:rgba(0,243,255,0.05);padding:6px 10px;border-radius:4px;border:1px solid rgba(0,243,255,0.15)">
                        <span style="color:#aaa;font-size:0.8rem">{labels[key]}</span>
                        <span style="color:#00f3ff;font-weight:700;float:right">{ps()[key]}</span>
                      </div>
                    );
                  })}
                </div>

                {/* EXP setter */}
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                  <input
                    class="debug-input"
                    type="number"
                    min={0}
                    max={PARTNER_MAX_EXP}
                    placeholder="Set total EXP…"
                    value={expInput()}
                    onInput={(e) => setExpInput(e.currentTarget.value)}
                    style="width:140px"
                  />
                  <button class="debug-btn" onClick={applyExp}>Set EXP</button>
                  <button class="debug-btn" onClick={() => { setExpInput(String(PARTNER_MAX_EXP)); applyExp(); }}>Max EXP</button>
                </div>
              </div>

              {/* Armor panel */}
              <div class="debug-section">
                <h3 class="debug-section-title">Armor Side Deck</h3>
                <div style="display:flex;flex-direction:column;gap:8px">
                  <For each={pdef.armorNumbers}>
                    {(armorNum) => {
                      const inBag = () => (activeProfile()?.bag[armorNum] ?? 0) > 0;
                      const equipped = () => ps().armor === armorNum;
                      return (
                        <div style="display:flex;gap:8px;align-items:center;background:rgba(255,255,255,0.03);padding:8px;border-radius:4px">
                          <span style="color:#aaa;font-size:0.85rem;flex:1">#{armorNum}</span>
                          <Show when={!inBag()}>
                            <button class="debug-btn" style="font-size:0.8rem;padding:3px 8px" onClick={() => grantArmorUnlock(armorNum)}>
                              Grant to Bag
                            </button>
                          </Show>
                          <Show when={inBag() && !equipped()}>
                            <button class="debug-btn" style="font-size:0.8rem;padding:3px 8px" onClick={() => setArmor(armorNum)}>
                              Equip
                            </button>
                          </Show>
                          <Show when={equipped()}>
                            <span style="color:#0f5;font-size:0.8rem;margin-right:4px">✓ Equipped</span>
                            <button class="debug-btn" style="font-size:0.8rem;padding:3px 8px" onClick={() => setArmor(null)}>
                              Remove
                            </button>
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>

              {/* Level progression preview */}
              <div class="debug-section" style="grid-column:1/-1">
                <h3 class="debug-section-title">Level Progression Preview</h3>
                <div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:1px">
                  <For each={levelRewardList()}>
                    {(entry) => {
                      const lv = partnerLevelFromExp(activeProfile()?.partners.find((x) => x.id === selectedPartnerId())?.totalExp ?? 0);
                      const reached = entry.level <= lv;
                      const isNext = entry.level === lv + 1;
                      return (
                        <div style={`display:flex;gap:10px;align-items:center;padding:2px 8px;border-radius:3px;background:${reached ? "rgba(0,243,255,0.05)" : isNext ? "rgba(157,78,221,0.1)" : "transparent"};opacity:${reached || isNext ? 1 : 0.5}`}>
                          <span style={`font-size:0.8rem;width:52px;color:${reached ? "#00f3ff" : isNext ? "#c77dff" : "#666"}`}>Lv {entry.level}</span>
                          <Show when={entry.reward.type === "stat"}>
                            <span style="color:#ffcc44;font-size:0.82rem">
                              +10 {(entry.reward as { type: "stat"; stat: string }).stat.toUpperCase()}
                            </span>
                          </Show>
                          <Show when={entry.reward.type === "digipart"}>
                            <span style="color:#c77dff;font-size:0.82rem">
                              DigiPart #{(entry.reward as { type: "digipart"; id: number }).id} —{" "}
                              {DIGIPARTS[(entry.reward as { type: "digipart"; id: number }).id]?.name ?? "?"}
                            </span>
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>
            </div>
          );
        }}
      </Show>
    </div>
  );
}
