import { For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { MASTER_CARDS } from "@src/data/master-cards";
import { PARTNERS, type PartnerId } from "@src/data/partners";
import type { ProfileStore } from "@src/store/profile-store";
import { DigiCardFront } from "./DigiCard";

const CARD_BY_NUMBER = new Map(MASTER_CARDS.map((c) => [c.number, c]));

/** Visual accent color per partner, keyed by PartnerId. */
const PARTNER_COLOR: Record<PartnerId, string> = {
  veemon:       "#e85050",
  hawkmon:      "#4ade80",
  armadillomon: "#ffd700",
  patamon:      "#87ceeb",
  gatomon:      "#ffffff",
  wormmon:      "#9d4edd",
};

/** Specialty label per partner. */
const PARTNER_SPECIALTY: Record<PartnerId, string> = {
  veemon:       "Fire",
  hawkmon:      "Nature",
  armadillomon: "Rare",
  patamon:      "Holy",
  gatomon:      "Holy",
  wormmon:      "Nature",
};

/**
 * Modal that presents a list of partner choices from a resolved pool.
 * Used both when a Digivice key item is "used" from inventory and,
 * conceptually, at profile creation (where the store handles it directly).
 */
export function DigiviceDialog(props: {
  /** Resolved pool of partner ids available for selection. */
  pool: PartnerId[];
  store: ProfileStore;
  profileId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const choices = () => PARTNERS.filter((p) => props.pool.includes(p.id));

  const choose = (id: PartnerId) => {
    props.store.unlockPartner(props.profileId, id);
    props.onDone();
  };

  return (
    <Portal mount={document.body}>
      <div class="scp-overlay dvd-overlay" onClick={props.onCancel}>
        <div class="scp-dialog dvd-dialog" onClick={(e) => e.stopPropagation()}>
          <div class="scp-dialog-header">
            <span class="scp-dialog-title">Choose a Partner</span>
            <button class="scp-dialog-close" onClick={props.onCancel}>✕</button>
          </div>
          <div class="dvd-dialog-body">
            <div class="scp-partners dvd-partners">
              <For each={choices()}>
                {(p) => {
                  const card = CARD_BY_NUMBER.get(p.cardNumber);
                  return (
                    <button
                      class="scp-partner"
                      style={{ "--partner-color": PARTNER_COLOR[p.id] }}
                      onClick={() => choose(p.id)}
                    >
                      <div class="scp-partner-card-outer">
                        <div class="scp-partner-card-inner">
                          <Show when={card}>
                            <DigiCardFront card={card!} />
                          </Show>
                        </div>
                      </div>
                      <div class="scp-partner-label">
                        <span class="scp-partner-name">{p.name}</span>
                        <span class="scp-partner-spec">
                          {PARTNER_SPECIALTY[p.id]} · Rookie
                        </span>
                      </div>
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
