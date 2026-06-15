import { For, Show, createMemo, createSignal } from "solid-js";
import { MASTER_CARDS } from "@src/data/master-cards";
import { DIGIPARTS, type DigiPart } from "@src/data/digiparts";
import {
  PARTNER_ORDER,
  PARTNERS,
  partnerLevelFromExp,
  type PartnerId,
} from "@src/data/partners";
import type { PartnerState, PlayerProfile, ProfileStore } from "@src/store/profile-store";
import { DigiCardFront } from "./DigiCard";

const CARD_BY_NUMBER = new Map(MASTER_CARDS.map((c) => [c.number, c]));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** EXP needed to reach the next level from the given total (0 at max level). */
function expToNext(totalExp: number): number {
  // level-up thresholds from partners.ts: k=0→8, k=1→7, k=2→9, k≥3→5+2k
  let cumExp = 0;
  for (let k = 0; k < 98; k++) {
    const needed = k === 0 ? 8 : k === 1 ? 7 : k === 2 ? 9 : 5 + 2 * k;
    if (cumExp + needed > totalExp) return cumExp + needed - totalExp;
    cumExp += needed;
  }
  return 0; // max level
}

/** EXP at the start of the current level (for the bar calculation). */
function expAtLevelStart(totalExp: number): number {
  const level = partnerLevelFromExp(totalExp);
  if (level >= 99) return 9999;
  let cumExp = 0;
  for (let k = 0; k < level - 1; k++) {
    cumExp += k === 0 ? 8 : k === 1 ? 7 : k === 2 ? 9 : 5 + 2 * k;
  }
  return cumExp;
}

const PARTNER_SPECIALTY: Record<PartnerId, string> = {
  veemon: "Fire",
  hawkmon: "Nature",
  armadillomon: "Rare",
  patamon: "Holy",
  gatomon: "Holy",
  wormmon: "Nature",
};

const PARTNER_COLOR: Record<PartnerId, string> = {
  veemon: "#e85050",
  hawkmon: "#4ade80",
  armadillomon: "#ffd700",
  patamon: "#87ceeb",
  gatomon: "#ffffff",
  wormmon: "#9d4edd",
};

// ---------------------------------------------------------------------------
// Sub-component: EXP bar
// ---------------------------------------------------------------------------

function ExpBar(props: { totalExp: number }) {
  const level = () => partnerLevelFromExp(props.totalExp);
  const start = () => expAtLevelStart(props.totalExp);
  const toNext = () => expToNext(props.totalExp);
  const needed = () => {
    if (level() >= 99) return 1;
    const k = level() - 1;
    return k === 0 ? 8 : k === 1 ? 7 : k === 2 ? 9 : 5 + 2 * k;
  };
  const progress = () => {
    if (level() >= 99) return 100;
    const inLevel = props.totalExp - start();
    return Math.round((inLevel / needed()) * 100);
  };

  return (
    <div class="pm-exp-row">
      <div class="pm-exp-labels">
        <span class="pm-level">Lv {level()}</span>
        <Show when={level() < 99}>
          <span class="pm-exp-num">{props.totalExp} EXP · {toNext()} to next</span>
        </Show>
        <Show when={level() >= 99}>
          <span class="pm-exp-num">MAX</span>
        </Show>
      </div>
      <div class="pm-exp-bar-bg">
        <div class="pm-exp-bar-fill" style={{ width: `${progress()}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Armor section
// ---------------------------------------------------------------------------

function ArmorSection(props: {
  partner: PartnerState;
  profile: PlayerProfile;
  store: ProfileStore;
  onProfileChange: () => void;
}) {
  const [picking, setPicking] = createSignal(false);

  const def = () => PARTNERS.find((p) => p.id === props.partner.id)!;

  const availableArmors = createMemo(() =>
    def().armorNumbers.filter((n) => (props.profile.bag[n] ?? 0) > 0),
  );

  const equippedCard = createMemo(() =>
    props.partner.armor ? CARD_BY_NUMBER.get(props.partner.armor) : null,
  );

  const selectArmor = (num: string | null) => {
    props.store.setPartnerArmor(props.profile.id, props.partner.id, num);
    setPicking(false);
    props.onProfileChange();
  };

  return (
    <div class="pm-section">
      <div class="pm-section-title">Armor Digivolve</div>
      <div class="pm-armor-row">
        <Show when={equippedCard()}>
          <div class="pm-armor-card">
            <DigiCardFront card={equippedCard()!} />
          </div>
        </Show>
        <Show when={!equippedCard()}>
          <div class="pm-armor-empty">—</div>
        </Show>
        <div class="pm-armor-actions">
          <div class="pm-armor-name">
            {equippedCard()?.name ?? "None"}
          </div>
          <Show when={availableArmors().length > 0 || props.partner.armor}>
            <button class="pm-btn" onClick={() => setPicking(true)}>Change</button>
          </Show>
          <Show when={availableArmors().length === 0 && !props.partner.armor}>
            <span class="pm-muted">No armors owned</span>
          </Show>
        </div>
      </div>

      <Show when={picking()}>
        <div class="pm-picker">
          <button
            class="pm-pick-item pm-pick-none"
            classList={{ "pm-pick-selected": !props.partner.armor }}
            onClick={() => selectArmor(null)}
          >
            None
          </button>
          <For each={availableArmors()}>
            {(num) => {
              const card = CARD_BY_NUMBER.get(num);
              return (
                <button
                  class="pm-pick-item"
                  classList={{ "pm-pick-selected": props.partner.armor === num }}
                  onClick={() => selectArmor(num)}
                >
                  <Show when={card}>
                    <div class="pm-pick-mini">
                      <DigiCardFront card={card!} />
                    </div>
                  </Show>
                  <span>{card?.name ?? num}</span>
                </button>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: DigiParts section
// ---------------------------------------------------------------------------

function DigiPartsSection(props: {
  partner: PartnerState;
  profile: PlayerProfile;
  store: ProfileStore;
  onProfileChange: () => void;
}) {
  const [addingPart, setAddingPart] = createSignal(false);

  const equippedParts = createMemo<DigiPart[]>(() =>
    props.partner.equippedDigiparts.map((id) => DIGIPARTS[id]).filter((p): p is DigiPart => p !== undefined),
  );

  const unequippedOwned = createMemo<DigiPart[]>(() => {
    const allEquipped = new Set(props.profile.partners.flatMap((p) => p.equippedDigiparts));
    return props.profile.ownedDigiparts
      .filter((id) => !allEquipped.has(id))
      .map((id) => DIGIPARTS[id])
      .filter((p): p is DigiPart => p !== undefined);
  });

  const unequip = (id: number) => {
    props.store.unequipDigipart(props.profile.id, props.partner.id, id);
    props.onProfileChange();
  };

  const equip = (id: number) => {
    const err = props.store.equipDigipart(props.profile.id, props.partner.id, id);
    if (!err) {
      setAddingPart(false);
      props.onProfileChange();
    }
  };

  return (
    <div class="pm-section">
      <div class="pm-section-title">DigiParts <span class="pm-muted">({props.partner.equippedDigiparts.length}/3 equipped)</span></div>

      <div class="pm-parts-slots">
        <For each={[0, 1, 2]}>
          {(slot) => {
            const part = () => equippedParts()[slot];
            return (
              <div class="pm-part-slot" classList={{ "pm-part-slot--empty": !part() }}>
                <Show when={part()}>
                  <span class="pm-part-name">{part()!.name}</span>
                  <span class="pm-part-group">{part()!.group}</span>
                  <button class="pm-part-unequip" onClick={() => unequip(part()!.id)}>✕</button>
                </Show>
                <Show when={!part()}>
                  <span class="pm-muted">— Empty —</span>
                </Show>
              </div>
            );
          }}
        </For>
      </div>

      <Show when={props.partner.equippedDigiparts.length < 3 && unequippedOwned().length > 0}>
        <button class="pm-btn pm-btn--small" onClick={() => setAddingPart(!addingPart())}>
          {addingPart() ? "Cancel" : "+ Equip Part"}
        </button>
      </Show>

      <Show when={props.profile.ownedDigiparts.length === 0}>
        <p class="pm-muted pm-muted--center">No DigiParts earned yet.</p>
      </Show>

      <Show when={addingPart()}>
        <div class="pm-picker pm-picker--parts">
          <For each={unequippedOwned()}>
            {(part) => (
              <button class="pm-pick-item" onClick={() => equip(part.id)}>
                <span class="pm-part-name">{part.name}</span>
                <span class="pm-part-group">{part.group}</span>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Partner detail (full-page view for a single selected partner)
// ---------------------------------------------------------------------------

function PartnerDetail(props: {
  partnerId: PartnerId;
  profile: PlayerProfile;
  store: ProfileStore;
  onBack: () => void;
  onProfileChange: () => void;
}) {
  const partner = createMemo<PartnerState | null>(
    () => props.profile.partners.find((p) => p.id === props.partnerId) ?? null,
  );
  const def = createMemo(() => PARTNERS.find((p) => p.id === props.partnerId)!);
  const card = createMemo(() => CARD_BY_NUMBER.get(def().cardNumber));

  return (
    <div class="setup">
      <div class="pm-detail-header">
        <button class="pm-back-btn" onClick={props.onBack}>← Partners</button>
        <h1 class="pm-detail-title" style={{ color: PARTNER_COLOR[props.partnerId] }}>
          {def().name}
        </h1>
      </div>

      <Show when={partner()} fallback={<p class="pm-muted pm-muted--center">Partner not found.</p>}>
        {(state) => (
          <div class="pm-detail">
            {/* Identity row */}
            <div class="pm-identity">
              <Show when={card()}>
                <div class="pm-card-wrap">
                  <DigiCardFront card={card()!} />
                </div>
              </Show>
              <div class="pm-identity-info">
                <div class="pm-partner-name" style={{ color: PARTNER_COLOR[props.partnerId] }}>
                  {def().name}
                </div>
                <div class="pm-partner-spec">
                  {PARTNER_SPECIALTY[props.partnerId]} · Rookie
                </div>
                <ExpBar totalExp={state().totalExp} />
                <div class="pm-stat-bonuses">
                  <span title="HP bonus">HP +{state().bonusHp}</span>
                  <span title="Circle bonus">○ +{state().bonusCircle}</span>
                  <span title="Triangle bonus">△ +{state().bonusTriangle}</span>
                  <span title="Cross bonus">× +{state().bonusCross}</span>
                </div>
              </div>
            </div>

            {/* Armor */}
            <ArmorSection
              partner={state()}
              profile={props.profile}
              store={props.store}
              onProfileChange={props.onProfileChange}
            />

            {/* DigiParts */}
            <DigiPartsSection
              partner={state()}
              profile={props.profile}
              store={props.store}
              onProfileChange={props.onProfileChange}
            />
          </div>
        )}
      </Show>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

/**
 * Full-page Partners screen — first pick a partner, then manage it.
 * Step 1: selection grid of all unlocked partners.
 * Step 2: full-page detail for the chosen partner.
 */
export function ScreenPartners(props: {
  profile: PlayerProfile;
  store: ProfileStore;
  onClose: () => void;
  onProfileChange: () => void;
}) {
  const [selected, setSelected] = createSignal<PartnerId | null>(null);

  return (
    <>
      <Show when={selected() === null}>
        <div class="setup">
          <h1 class="game-title">Partners</h1>

          <Show
            when={props.profile.partners.length > 0}
            fallback={<p class="pm-muted pm-muted--center">No partners yet.</p>}
          >
            <div class="sp-grid">
              <For each={props.profile.partners}>
                {(p) => {
                  const pDef = PARTNERS.find((d) => d.id === p.id)!;
                  const pCard = CARD_BY_NUMBER.get(pDef.cardNumber);
                  const level = () => partnerLevelFromExp(p.totalExp);
                  return (
                    <button
                      class="sp-partner-btn"
                      style={{ "--partner-color": PARTNER_COLOR[p.id] }}
                      onClick={() => setSelected(p.id)}
                    >
                      <Show when={pCard}>
                        <div class="sp-card-wrap">
                          <DigiCardFront card={pCard!} />
                        </div>
                      </Show>
                      <div class="sp-partner-name" style={{ color: PARTNER_COLOR[p.id] }}>
                        {pDef.name}
                      </div>
                      <div class="sp-partner-level">Lv {level()}</div>
                    </button>
                  );
                }}
              </For>
            </div>
          </Show>

          <div class="setup-actions">
            <button onClick={props.onClose}>← Back</button>
          </div>
        </div>
      </Show>

      <Show when={selected() !== null}>
        <PartnerDetail
          partnerId={selected()!}
          profile={props.profile}
          store={props.store}
          onBack={() => setSelected(null)}
          onProfileChange={props.onProfileChange}
        />
      </Show>
    </>
  );
}
