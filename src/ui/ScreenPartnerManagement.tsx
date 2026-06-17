import { For, Show, createMemo, createSignal } from "solid-js";
import { MASTER_CARDS } from "@src/data/master-cards";
import { DIGIPARTS, correctXEffect, type DigiPart, type DigiPartGroup } from "@src/data/digiparts";
import {
  PARTNERS,
  partnerLevelFromExp,
  type PartnerId,
} from "@src/data/partners";
import type { PartnerState, PlayerProfile, ProfileStore } from "@src/store/profile-store";
import type { MasterCard } from "@src/types";
import { DigiCardFront, EffectText } from "./DigiCard";

const CARD_BY_NUMBER = new Map(MASTER_CARDS.map((c) => [c.number, c]));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expToNext(totalExp: number): number {
  let cumExp = 0;
  for (let k = 0; k < 98; k++) {
    const needed = k === 0 ? 8 : k === 1 ? 7 : k === 2 ? 9 : 5 + 2 * k;
    if (cumExp + needed > totalExp) return cumExp + needed - totalExp;
    cumExp += needed;
  }
  return 0;
}

function expAtLevelStart(totalExp: number): number {
  const level = partnerLevelFromExp(totalExp);
  if (level >= 99) return 9999;
  let cumExp = 0;
  for (let k = 0; k < level - 1; k++) {
    cumExp += k === 0 ? 8 : k === 1 ? 7 : k === 2 ? 9 : 5 + 2 * k;
  }
  return cumExp;
}

const PARTNER_COLOR: Record<PartnerId, string> = {
  veemon: "#e85050",
  hawkmon: "#4ade80",
  armadillomon: "#ffd700",
  patamon: "#87ceeb",
  gatomon: "#ffffff",
  wormmon: "#9d4edd",
};

/** Groups that modify the X attack effect */
const X_EFFECT_GROUPS = new Set<DigiPartGroup>(["cross_eff"]);

/** Groups that modify the support effect */
const SUP_EFFECT_GROUPS = new Set<DigiPartGroup>(["support_eff"]);

/** Groups that are purely passive stat bonuses (not effect modifiers) */
const STAT_GROUPS = new Set<DigiPartGroup>([
  "hp", "all_atk", "circle", "triangle", "cross", "dp", "s_exp", "s_rare",
]);

function classifyParts(equippedIds: number[]): {
  xMods: DigiPart[];
  supMods: DigiPart[];
  statParts: DigiPart[];
} {
  const xMods: DigiPart[] = [];
  const supMods: DigiPart[] = [];
  const statParts: DigiPart[] = [];
  for (const id of equippedIds) {
    const p = DIGIPARTS[id];
    if (!p) continue;
    if (X_EFFECT_GROUPS.has(p.group)) xMods.push(p);
    else if (SUP_EFFECT_GROUPS.has(p.group)) supMods.push(p);
    else if (STAT_GROUPS.has(p.group)) statParts.push(p);
  }
  return { xMods, supMods, statParts };
}

function parseStatValue(name: string): number {
  const m = /\+(\d+)/.exec(name);
  return m ? parseInt(m[1]!, 10) : 0;
}

interface DigipartStatBonus { hp: number; circle: number; triangle: number; cross: number; dp: number; }

const DP_CAP = 90;

function computeDigipartStatBonuses(equippedIds: number[]): DigipartStatBonus {
  let hp = 0, circle = 0, triangle = 0, cross = 0, dp = 0;
  for (const id of equippedIds) {
    const p = DIGIPARTS[id];
    if (!p) continue;
    const v = parseStatValue(p.name);
    switch (p.group) {
      case "hp": hp += v; break;
      case "all_atk": circle += v; triangle += v; cross += v; break;
      case "circle": circle += v; break;
      case "triangle": triangle += v; break;
      case "cross": cross += v; break;
      case "dp": dp += v; break;
    }
  }
  return { hp, circle, triangle, cross, dp };
}

// ---------------------------------------------------------------------------
// EXP bar
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
    return Math.round(((props.totalExp - start()) / needed()) * 100);
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
// Armor section
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
  const selectArmor = (num: string | null) => {
    props.store.setPartnerArmor(props.profile.id, props.partner.id, num);
    setPicking(false);
    props.onProfileChange();
  };

  return (
    <div class="pm-section">
      <div class="pm-armor-head">
        <div class="pm-section-title">Armor Digivolve</div>
        <Show when={availableArmors().length > 0 || props.partner.armor}>
          <button class="pm-btn pm-btn--small" onClick={() => setPicking((v) => !v)}>
            {picking() ? "Cancel" : "Change"}
          </button>
        </Show>
        <Show when={availableArmors().length === 0 && !props.partner.armor}>
          <span class="pm-muted">No armors owned</span>
        </Show>
      </div>
      <Show when={picking()}>
        <div class="pm-armor-picker">
          <button
            class="pm-armor-pick pm-armor-pick--none"
            classList={{ "pm-armor-pick--selected": !props.partner.armor }}
            onClick={() => selectArmor(null)}
          >
            <div class="pm-armor-pick-none">None</div>
            <span class="pm-armor-pick-name">No Armor</span>
          </button>
          <For each={availableArmors()}>
            {(num) => {
              const card = CARD_BY_NUMBER.get(num);
              return (
                <button
                  class="pm-armor-pick"
                  classList={{ "pm-armor-pick--selected": props.partner.armor === num }}
                  onClick={() => selectArmor(num)}
                >
                  <div class="pm-armor-pick-card">
                    <Show when={card}>
                      <DigiCardFront card={card!} />
                    </Show>
                  </div>
                  <span class="pm-armor-pick-name">{card?.name ?? num}</span>
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
// DigiParts section
// ---------------------------------------------------------------------------

function DigiPartsSection(props: {
  partner: PartnerState;
  profile: PlayerProfile;
  store: ProfileStore;
  onProfileChange: () => void;
}) {
  // Which slot (0–2) is currently being edited; null = dialog closed.
  const [editingSlot, setEditingSlot] = createSignal<number | null>(null);
  const [search, setSearch] = createSignal("");

  const openSlot = (slot: number) => {
    setSearch("");
    setEditingSlot(editingSlot() === slot ? null : slot);
  };
  const closeDialog = () => {
    setEditingSlot(null);
    setSearch("");
  };

  // Equipped parts addressed by slot index (undefined = empty slot).
  const slotPart = (slot: number): DigiPart | undefined => {
    const id = props.partner.equippedDigiparts[slot];
    return id === undefined ? undefined : DIGIPARTS[id];
  };

  const unequippedOwned = createMemo<DigiPart[]>(() => {
    // Parts equipped on any partner are unavailable (physical item constraint).
    const allEquipped = new Set(
      props.profile.partners.flatMap((p) => p.equippedDigiparts),
    );
    return props.profile.ownedDigiparts
      .filter((id) => !allEquipped.has(id))
      .map((id) => DIGIPARTS[id])
      .filter((p): p is DigiPart => p !== undefined);
  });

  // Groups occupied by the OTHER two slots — a slot can't take a conflicting group.
  const blockedGroups = (slot: number): Set<DigiPartGroup> =>
    new Set(
      props.partner.equippedDigiparts
        .filter((_, i) => i !== slot)
        .map((id) => DIGIPARTS[id]?.group)
        .filter((g): g is DigiPartGroup => g !== undefined),
    );

  const availableForSlot = (slot: number): DigiPart[] => {
    const blocked = blockedGroups(slot);
    return unequippedOwned().filter((p) => !blocked.has(p.group));
  };

  // Parts shown in the dialog for the active slot, filtered by the search box.
  const filteredParts = createMemo<DigiPart[]>(() => {
    const slot = editingSlot();
    if (slot === null) return [];
    const q = search().trim().toLowerCase();
    return availableForSlot(slot).filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.group.toLowerCase().includes(q),
    );
  });

  // Replace whatever is in `slot` with `newId` (null = just remove).
  const chooseForSlot = (slot: number, newId: number | null) => {
    const old = props.partner.equippedDigiparts[slot];
    if (old !== undefined) {
      props.store.unequipDigipart(props.profile.id, props.partner.id, old);
    }
    if (newId !== null) {
      props.store.equipDigipart(props.profile.id, props.partner.id, newId);
    }
    closeDialog();
    props.onProfileChange();
  };

  return (
    <div class="pm-section">
      <div class="pm-section-title">DigiParts <span class="pm-muted">({props.partner.equippedDigiparts.length}/3 equipped)</span></div>
      <div class="pm-parts-slots">
        <For each={[0, 1, 2]}>
          {(slot) => (
            <button
              class="pm-part-slot pm-part-slot--btn"
              classList={{
                "pm-part-slot--empty": !slotPart(slot),
                "pm-part-slot--active": editingSlot() === slot,
              }}
              onClick={() => openSlot(slot)}
            >
              <Show
                when={slotPart(slot)}
                fallback={<span class="pm-muted">— Empty · tap to equip —</span>}
              >
                <span class="pm-part-name"><EffectText text={slotPart(slot)!.name} /></span>
                <span class="pm-part-group">{slotPart(slot)!.group}</span>
              </Show>
            </button>
          )}
        </For>
      </div>

      <Show when={props.profile.ownedDigiparts.length === 0}>
        <p class="pm-muted pm-muted--center">No DigiParts earned yet.</p>
      </Show>

      {/* Floating DigiPart stock dialog */}
      <Show when={editingSlot() !== null}>
        <div class="modal-overlay" onClick={closeDialog}>
          <div class="pm-dp-dialog" onClick={(e) => e.stopPropagation()}>
            <div class="pm-dp-dialog-head">
              <span class="pm-dp-dialog-title">Equip DigiPart — Slot {editingSlot()! + 1}</span>
              <button class="pm-dp-dialog-close" onClick={closeDialog}>✕</button>
            </div>
            <input
              class="pm-dp-search"
              type="text"
              placeholder="Search DigiParts…"
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
            <div class="pm-dp-list">
              <Show when={slotPart(editingSlot()!)}>
                <button
                  class="pm-dp-item pm-dp-item--remove"
                  onClick={() => chooseForSlot(editingSlot()!, null)}
                >
                  Remove current part
                </button>
              </Show>
              <For each={filteredParts()}>
                {(part) => (
                  <button
                    class="pm-dp-item"
                    classList={{ "pm-pick-selected": props.partner.equippedDigiparts[editingSlot()!] === part.id }}
                    onClick={() => chooseForSlot(editingSlot()!, part.id)}
                  >
                    <span class="pm-part-name"><EffectText text={part.name} /></span>
                    <span class="pm-part-group">{part.group}</span>
                  </button>
                )}
              </For>
              <Show when={filteredParts().length === 0}>
                <p class="pm-muted pm-muted--center">
                  {search().trim() ? "No matching DigiParts." : "No parts available to equip."}
                </p>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form panel — reusable stat/effect card (base partner OR armor form)
// ---------------------------------------------------------------------------

interface FormStatBonus { hp: number; circle: number; triangle: number; cross: number; dp: number; }

/**
 * One stat/effect panel for a single Digimon form. Renders the card with a
 * label, optional EXP bar, corrected stats (cyan when DigiParts contribute),
 * and corrected battle effects. Used for both the base partner and its armor.
 */
function FormPanel(props: {
  card: MasterCard;
  label: string;
  levelBonus: FormStatBonus;
  dpBonus: FormStatBonus;
  xMods: DigiPart[];
  supMods: DigiPart[];
}) {
  const c = () => props.card;
  // The single equipped cross_eff part (groups allow at most one), if any.
  const xPart = () => props.xMods[0];
  const supPart = () => props.supMods[0];
  // A support_eff part REPLACES the card's support effect (mirrors the engine's
  // correctSupportEffect), so show the part's support text when one is equipped.
  const supCorrected = () => (supPart()?.support ?? c().support)?.trim() || "None";
  // Card X effect + cross power after the equipped cross_eff correction.
  const xCorrection = () =>
    correctXEffect(
      {
        x_effect: c().x_effect ?? "",
        x_effect_speed: c().x_effect_speed ?? 0,
        x_effect_script: c().x_effect_script ?? "",
        x_effect_is_jamming: c().x_effect_is_jamming ?? 0,
        x_effect_changes_attack: c().x_effect_changes_attack ?? 0,
      },
      (c().x_pow ?? 0) + props.levelBonus.cross + props.dpBonus.cross,
      xPart(),
    );
  const xPowerCorrectedByPart = () => xPart()?.x_power_delta !== undefined;

  type Row = { icon?: string; label: string; base: number; lvl: number; dp: number; cap?: number; value?: number; corrected?: boolean };
  const rows = (): Row[] => {
    const dpBase = c().dp_point ?? 0;
    const dpTotal = Math.min(dpBase + props.dpBonus.dp, DP_CAP);
    return [
      { label: "HP", base: c().hp ?? 0, lvl: props.levelBonus.hp, dp: props.dpBonus.hp },
      { icon: "/assets/icons/button-circle.png", label: c().c_attack ?? "", base: c().c_pow ?? 0, lvl: props.levelBonus.circle, dp: props.dpBonus.circle },
      { icon: "/assets/icons/button-triangle.png", label: c().t_attack ?? "", base: c().t_pow ?? 0, lvl: props.levelBonus.triangle, dp: props.dpBonus.triangle },
      {
        icon: "/assets/icons/button-cross.png",
        label: c().x_attack ?? "",
        base: c().x_pow ?? 0,
        lvl: props.levelBonus.cross,
        dp: props.dpBonus.cross,
        value: xCorrection().x_power,
        corrected: props.dpBonus.cross > 0 || xPowerCorrectedByPart(),
      },
      { label: "DP+", base: dpBase, lvl: 0, dp: dpTotal - dpBase, cap: DP_CAP },
    ];
  };

  return (
    <div class="pm-form">
      <div class="pm-card-section">
        <span class="pm-card-base-label">{props.label}</span>
        <div class="pm-card-wrap--large">
          <DigiCardFront card={c()} />
        </div>
      </div>

      {/* Attack stats — final corrected values only (cyan = boosted by DigiParts) */}
      <div class="pm-stats-grid">
        <For each={rows()}>
          {(row) => (
            <div class="pm-stat-row">
              <span class="pm-stat-label">
                <Show when={row.icon}>
                  <img src={row.icon} class="pm-stat-icon" alt="" />
                </Show>
                {row.label}
              </span>
              <span
                class="pm-stat-final"
                classList={{ "pm-stat-final--dp": row.corrected ?? row.dp > 0 }}
                title={(row.corrected ?? row.dp > 0) ? "Corrected by DigiParts" : undefined}
              >
                {row.value ?? row.base + row.lvl + row.dp}
              </span>
            </div>
          )}
        </For>
      </div>

      {/* Corrected battle effects — cyan when modified by DigiParts */}
      <div class="pm-eff-block">
        <div class="pm-eff">
          <div class="pm-eff-head">
            <img src="/assets/icons/button-cross.png" class="pm-stat-icon" alt="✕" />
            Attack Effect
          </div>
          <p class="pm-eff-text" classList={{ "pm-eff-text--corrected": !!xPart() }}>
            <EffectText text={xCorrection().x_effect.trim() || "None"} />
          </p>
        </div>
        <div class="pm-eff">
          <div class="pm-eff-head">Support Effect</div>
          <p class="pm-eff-text" classList={{ "pm-eff-text--corrected": !!supPart() }}>
            <EffectText text={supCorrected()} />
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Partner detail — full viewport layout
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
  const armorCard = createMemo<MasterCard | null>(() => {
    const a = partner()?.armor;
    return a ? CARD_BY_NUMBER.get(a) ?? null : null;
  });
  const dpBonus = createMemo(() =>
    computeDigipartStatBonuses(partner()?.equippedDigiparts ?? []),
  );
  const classified = createMemo(() =>
    classifyParts(partner()?.equippedDigiparts ?? []),
  );
  const levelBonus = (state: PartnerState): FormStatBonus => ({
    hp: state.bonusHp,
    circle: state.bonusCircle,
    triangle: state.bonusTriangle,
    cross: state.bonusCross,
    dp: 0,
  });

  return (
    <div class="pm-screen">
      {/* Header bar */}
      <div class="pm-screen-header">
        <button class="pm-back-btn" onClick={props.onBack}>← Partners</button>
        <h1 class="pm-detail-title" style={{ color: PARTNER_COLOR[props.partnerId] }}>
          {def().name}
        </h1>
      </div>

      <Show when={partner()} fallback={<p class="pm-muted pm-muted--center">Partner not found.</p>}>
        {(state) => (
          <div class="pm-screen-body">
            {/* ── Left: base partner form ── */}
            <div class="pm-form-col">
              <Show when={card()}>
                <FormPanel
                  card={card()!}
                  label="Base"
                  levelBonus={levelBonus(state())}
                  dpBonus={dpBonus()}
                  xMods={classified().xMods}
                  supMods={classified().supMods}
                />
              </Show>
            </div>

            {/* ── Middle: progression + equipment controls ── */}
            <div class="pm-mid-col">
              <ExpBar totalExp={state().totalExp} />

              <ArmorSection
                partner={state()}
                profile={props.profile}
                store={props.store}
                onProfileChange={props.onProfileChange}
              />

              <DigiPartsSection
                partner={state()}
                profile={props.profile}
                store={props.store}
                onProfileChange={props.onProfileChange}
              />
            </div>

            {/* ── Right: selected armor form (mirror, no EXP bar) ── */}
            <div class="pm-form-col">
              <Show
                when={armorCard()}
                fallback={
                  <div class="pm-form pm-form--empty">
                    <span class="pm-card-base-label">Armor</span>
                    <div class="pm-armor-none">No armor selected</div>
                  </div>
                }
              >
                <FormPanel
                  card={armorCard()!}
                  label={armorCard()!.name}
                  levelBonus={levelBonus(state())}
                  dpBonus={dpBonus()}
                  xMods={classified().xMods}
                  supMods={classified().supMods}
                />
              </Show>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen — partner selector grid
// ---------------------------------------------------------------------------

export function ScreenPartnerManagement(props: {
  profile: PlayerProfile;
  store: ProfileStore;
  onClose: () => void;
  onProfileChange: () => void;
}) {
  const [selected, setSelected] = createSignal<PartnerId | null>(null);

  return (
    <>
      <Show when={selected() === null}>
        <div class="pm-select">
          <div class="pm-select-head">
            <button class="pm-back-btn" onClick={props.onClose}>← Back</button>
            <div class="pm-select-titles">
              <h1 class="game-title">Partners</h1>
              <p class="pm-select-sub">Select a partner to manage</p>
            </div>
            <span class="pm-select-count">
              {props.profile.partners.length} partner{props.profile.partners.length === 1 ? "" : "s"}
            </span>
          </div>

          <Show
            when={props.profile.partners.length > 0}
            fallback={<p class="pm-muted pm-muted--center">No partners yet.</p>}
          >
            <div class="sp-grid">
              <For each={props.profile.partners}>
                {(p) => {
                  const pDef = PARTNERS.find((d) => d.id === p.id)!;
                  const pCard = CARD_BY_NUMBER.get(pDef.cardNumber);
                  return (
                    <button
                      class="sp-tile"
                      style={{ "--partner-color": PARTNER_COLOR[p.id] }}
                      onClick={() => setSelected(p.id)}
                    >
                      <div class="sp-tile-card">
                        <Show when={pCard}>
                          <DigiCardFront card={pCard!} />
                        </Show>
                      </div>
                      <span class="sp-tile-name" style={{ color: PARTNER_COLOR[p.id] }}>
                        {pDef.name}
                      </span>
                    </button>
                  );
                }}
              </For>
            </div>
          </Show>
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
