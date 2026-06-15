import { For, Show, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import { KEY_ITEMS, resolvePool, type KeyItemDef } from "@src/data/key-items";
import type { PartnerId } from "@src/data/partners";
import type { PlayerProfile, ProfileStore } from "@src/store/profile-store";
import { DigiviceDialog } from "./DigiviceDialog";

/** Returns true if this Digivice hasn't been spent yet (no pool partner unlocked). */
function isUsable(def: KeyItemDef, profile: PlayerProfile): boolean {
  if (profile.partners.length >= 3) return false;
  const unlockedIds = profile.partners.map((p) => p.id as PartnerId);
  const unlockedSet = new Set(unlockedIds);
  // Spent as soon as ANY partner from this Digivice's pool is already unlocked.
  const pool = resolvePool(def, unlockedIds);
  return !pool.some((id) => unlockedSet.has(id));
}

/** Computes the usable pool for a Digivice (filters already-unlocked partners). */
function getUsablePool(def: KeyItemDef, profile: PlayerProfile): PartnerId[] {
  const unlockedIds = profile.partners.map((p) => p.id as PartnerId);
  const fullPool = resolvePool(def, unlockedIds);
  const unlockedSet = new Set(unlockedIds);
  return fullPool.filter((id) => !unlockedSet.has(id));
}

/**
 * Player inventory modal — shows all owned key items as trophies.
 * Digivice items show a "Use" button while they still have an available
 * partner; the button is disabled after the pool is exhausted.
 */
export function InventoryModal(props: {
  profile: PlayerProfile;
  store: ProfileStore;
  onClose: () => void;
  /** Called after a partner is unlocked so the parent can refresh state. */
  onProfileChange: () => void;
}) {
  const [activePool, setActivePool] = createSignal<PartnerId[] | null>(null);

  const ownedItems = () =>
    KEY_ITEMS.filter((def) => (props.profile.keyItems[def.key] ?? 0) > 0);

  return (
    <Portal mount={document.body}>
      <div class="modal-overlay inv-overlay" onClick={props.onClose}>
        <div class="modal inv-modal" onClick={(e) => e.stopPropagation()}>
          <div class="inv-header">
            <h2 class="inv-title">Key Items</h2>
            <button class="scp-dialog-close" onClick={props.onClose}>✕</button>
          </div>

          <Show when={ownedItems().length === 0}>
            <div class="inv-empty">No key items yet.</div>
          </Show>

          <div class="inv-list">
            <For each={ownedItems()}>
              {(def) => {
                const usable = () => isUsable(def, props.profile);
                return (
                  <div class="inv-row">
                    <div class="inv-item-icon">📟</div>
                    <div class="inv-item-body">
                      <div class="inv-item-name">{def.name}</div>
                      <div class="inv-item-desc">{def.description}</div>
                    </div>
                    <div class="inv-item-action">
                      <button
                        class="inv-use-btn"
                        classList={{ "inv-use-btn--used": !usable() }}
                        disabled={!usable()}
                        onClick={() => {
                          if (usable()) setActivePool(getUsablePool(def, props.profile));
                        }}
                      >
                        {usable() ? "Use" : "Used"}
                      </button>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </div>

      <Show when={activePool() !== null}>
        <DigiviceDialog
          pool={activePool()!}
          store={props.store}
          profileId={props.profile.id}
          onDone={() => {
            setActivePool(null);
            props.onProfileChange();
            props.onClose();
          }}
          onCancel={() => setActivePool(null)}
        />
      </Show>
    </Portal>
  );
}
