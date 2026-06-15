import { For, createSignal } from "solid-js";
import { KEY_ITEMS } from "@src/data/key-items";
import { profileStore } from "@src/ui/deck-select";
import { DebugProfilePicker } from "./DebugProfilePicker";

/** Debug tab: grant key items to any profile. */
export function KeyItemsTab() {
  const [profiles, setProfiles] = createSignal(profileStore.list());
  const [selectedProfileId, setSelectedProfileId] = createSignal<string | null>(null);
  const [msg, setMsg] = createSignal<{ text: string; ok: boolean } | null>(null);

  const refresh = () => setProfiles(profileStore.list());
  const notice = (text: string, ok = true) => setMsg({ text, ok });

  const activeProfile = () => profiles().find((p) => p.id === selectedProfileId()) ?? null;

  const qty = (key: string) => activeProfile()?.keyItems[key as keyof typeof activeProfile] ?? 0;

  const grant = (key: string) => {
    const p = activeProfile();
    if (!p) { notice("Select a profile first.", false); return; }
    profileStore.giveKeyItem(p.id, key as never, 1);
    refresh();
    const def = KEY_ITEMS.find((d) => d.key === key);
    notice(`Granted ${def?.name ?? key} to ${p.name}.`);
  };

  return (
    <div class="debug-section">
      <h2 class="debug-section-title">🎒 Grant Key Items</h2>

      {/* Profile selector */}
      <div class="debug-row" style={{ "margin-bottom": "16px" }}>
        <DebugProfilePicker
          profiles={profiles()}
          selectedId={selectedProfileId()}
          onSelect={(id) => { setSelectedProfileId(id); setMsg(null); }}
          extra={(p) => `${Object.keys(p.keyItems ?? {}).length} item types`}
        />
      </div>

      {/* Key item table */}
      <table class="debug-table" style={{ "margin-top": "12px" }}>
        <thead>
          <tr>
            <th>Item</th>
            <th>Description</th>
            <th style={{ "text-align": "center" }}>Owned</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <For each={KEY_ITEMS}>
            {(def) => (
              <tr>
                <td style={{ "white-space": "nowrap" }}>{def.name}</td>
                <td style={{ color: "#888", "font-size": "0.82rem" }}>{def.description}</td>
                <td style={{ "text-align": "center" }}>{qty(def.key)}</td>
                <td>
                  <button
                    class="debug-btn"
                    disabled={!selectedProfileId()}
                    onClick={() => grant(def.key)}
                  >
                    + Grant
                  </button>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      {msg() && (
        <div class={`debug-msg ${msg()!.ok ? "debug-msg--ok" : "debug-msg--err"}`}>
          {msg()!.text}
        </div>
      )}
    </div>
  );
}
