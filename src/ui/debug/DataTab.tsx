import { createSignal, For, Show } from "solid-js";
import { profileStore } from "@src/ui/deck-select";
import type { PlayerProfile } from "@src/store/profile-store";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
}

export function DataTab() {
  const [profiles, setProfiles] = createSignal<PlayerProfile[]>(profileStore.list());
  const [message, setMessage] = createSignal<{ text: string; ok: boolean } | null>(null);

  const refresh = () => setProfiles(profileStore.list());
  const msg = (text: string, ok = true) => setMessage({ text, ok });

  const exportProfile = (p: PlayerProfile) => {
    downloadJson(`profile-${sanitizeName(p.name)}.json`, p);
    msg(`Exported "${p.name}".`);
  };

  const exportAll = () => {
    downloadJson("profiles-all.json", profiles());
    msg(`Exported ${profiles().length} profile(s).`);
  };

  const handleImport = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw: unknown = JSON.parse(reader.result as string);
        const list: PlayerProfile[] = Array.isArray(raw) ? raw : [raw as PlayerProfile];

        if (list.length === 0) { msg("File contained no profiles.", false); return; }

        let count = 0;
        for (const p of list) {
          if (typeof p !== "object" || p === null || typeof (p as PlayerProfile).id !== "string") {
            msg("Invalid profile format — missing required fields.", false);
            return;
          }
          profileStore.importProfile(p as PlayerProfile);
          count++;
        }

        refresh();
        msg(`Imported ${count} profile(s). ${count > 1 ? "Existing profiles with the same id were replaced." : ""}`);
      } catch {
        msg("Failed to parse JSON file.", false);
      }
      input.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div class="debug-partners-tab">
      <div class="debug-section">
        <h3 class="debug-section-title">Profile Export / Import</h3>
        <p style="color:#888;font-size:0.85rem;margin-bottom:12px">
          Export profiles to JSON files and import them back. Useful for sharing
          test data or restoring state across browsers / devices.
        </p>
      </div>

      <Show when={message()}>
        {(m) => (
          <div style={`padding:8px 12px;border-radius:4px;margin-bottom:12px;background:${m().ok ? "rgba(40,160,80,0.2)" : "rgba(160,40,40,0.2)"};border:1px solid ${m().ok ? "rgba(40,200,80,0.4)" : "rgba(200,40,40,0.4)"};color:${m().ok ? "#5f5" : "#f55"}`}>
            {m().text}
          </div>
        )}
      </Show>

      {/* Export */}
      <div class="debug-section">
        <h3 class="debug-section-title">Export</h3>
        <Show when={profiles().length === 0}>
          <p style="color:#555;font-size:0.85rem">No profiles saved.</p>
        </Show>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
          <For each={profiles()}>
            {(p) => (
              <div style="display:flex;gap:10px;align-items:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:10px 14px">
                <div style="flex:1">
                  <div style="color:#00f3ff;font-weight:600;font-size:0.9rem">{p.name}</div>
                  <div style="color:#666;font-size:0.78rem;margin-top:2px">
                    {p.exp} EXP · {Object.keys(p.bag).length} cards · {p.decks.length} deck(s) · {p.partners.length} partner(s)
                  </div>
                </div>
                <button
                  class="debug-btn"
                  style="background:rgba(0,243,255,0.1);border-color:rgba(0,243,255,0.3);color:#00f3ff"
                  onClick={() => exportProfile(p)}
                >
                  ⬇ Export
                </button>
              </div>
            )}
          </For>
        </div>
        <Show when={profiles().length > 1}>
          <button
            class="debug-btn"
            style="background:rgba(0,243,255,0.1);border-color:rgba(0,243,255,0.3);color:#00f3ff"
            onClick={exportAll}
          >
            ⬇ Export All ({profiles().length})
          </button>
        </Show>
      </div>

      {/* Import */}
      <div class="debug-section">
        <h3 class="debug-section-title">Import</h3>
        <p style="color:#888;font-size:0.82rem;margin-bottom:10px">
          Accepts a single profile object or an array of profiles. If a profile
          with the same id already exists it will be replaced.
        </p>
        <label
          style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;background:rgba(157,78,221,0.15);border:1px solid rgba(157,78,221,0.4);color:#c77dff;padding:8px 16px;border-radius:5px;font-size:0.88rem;transition:background 0.15s"
          onMouseOver={(e) => (e.currentTarget.style.background = "rgba(157,78,221,0.25)")}
          onMouseOut={(e) => (e.currentTarget.style.background = "rgba(157,78,221,0.15)")}
        >
          ⬆ Choose JSON file…
          <input
            type="file"
            accept=".json,application/json"
            style="display:none"
            onChange={handleImport}
          />
        </label>
      </div>
    </div>
  );
}
