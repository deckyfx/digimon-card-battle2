import { For, Show, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import { getActorById } from "@src/data/actors";
import { MASTER_CARDS } from "@src/data/master-cards";
import { PARTNERS as ALL_PARTNERS, type PartnerId } from "@src/data/partners";
import { type PlayerProfile, type ProfileStore } from "@src/store/profile-store";
import { DigiCardFront } from "./DigiCard";
import { ActorPicker } from "./ActorPicker";
import "./screen-create-profile.css";

const CARD_BY_NUMBER = new Map(MASTER_CARDS.map((c) => [c.number, c]));

/** Starter partners available at profile creation (DIGIVICE_A pool). */
const STARTER_PARTNERS: { partnerId: PartnerId; deckId: number; specialty: string; color: string }[] = [
  { partnerId: "veemon",       deckId: 121, specialty: "Fire",   color: "#e85050" },
  { partnerId: "hawkmon",      deckId: 122, specialty: "Nature", color: "#4ade80" },
  { partnerId: "armadillomon", deckId: 123, specialty: "Rare",   color: "#ffd700" },
];

type Step = 1 | 2 | 3;

export function ScreenCreateProfile(props: {
  store: ProfileStore;
  onDone: (profile: PlayerProfile) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = createSignal<Step>(1);
  const [name, setName] = createSignal("");
  const [avatarActorId, setAvatarActorId] = createSignal(0);
  const [avatarOpen, setAvatarOpen] = createSignal(false);
  const [pendingAvatarId, setPendingAvatarId] = createSignal(0);
  const [partnerId, setPartnerId] = createSignal<PartnerId | null>(null);
  const [error, setError] = createSignal("");

  const avatar = () => getActorById(avatarActorId());

  const create = () => {
    setError("");
    const chosen = STARTER_PARTNERS.find((p) => p.partnerId === partnerId());
    if (!chosen) { setError("Select a partner to continue."); return; }
    try {
      const profile = props.store.create({
        name: name().trim(),
        avatarActorId: avatarActorId(),
        starterDeckId: chosen.deckId,
        starterPartnerId: chosen.partnerId,
      });
      props.onDone(profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div class="scp-root">

      {/* ── Step breadcrumb ───────────────────────────────────────────────── */}
      <div class="scp-steps">
        {([1, 2, 3] as const).map((n) => (
          <>
            <div
              class="scp-step"
              classList={{ "scp-step--active": step() === n, "scp-step--done": step() > n }}
            >
              <div class="scp-step-dot">{step() > n ? "✓" : n}</div>
              <div class="scp-step-label">
                {n === 1 ? "Name" : n === 2 ? "Avatar" : "Partner"}
              </div>
            </div>
            {n < 3 && <div class="scp-step-line" classList={{ "scp-step-line--done": step() > n }} />}
          </>
        ))}
      </div>

      {/* ── Step 1: Name ─────────────────────────────────────────────────── */}
      <Show when={step() === 1}>
        <div class="scp-panel">
          <h2 class="scp-panel-title">Who are you, Tamer?</h2>
          <p class="scp-panel-desc">Enter your name to begin your journey.</p>
          <input
            class="scp-name-input"
            type="text"
            placeholder="Your name…"
            maxLength={20}
            value={name()}
            autofocus
            onInput={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && name().trim() && setStep(2)}
          />
          <div class="scp-actions">
            <button class="scp-btn-ghost" onClick={props.onCancel}>Cancel</button>
            <button class="scp-btn-primary" disabled={!name().trim()} onClick={() => setStep(2)}>
              Next →
            </button>
          </div>
        </div>
      </Show>

      {/* ── Step 2: Avatar ───────────────────────────────────────────────── */}
      <Show when={step() === 2}>
        <div class="scp-panel">
          <h2 class="scp-panel-title">Choose your avatar</h2>
          <p class="scp-panel-desc">Optional — pick a face for your profile.</p>

          <div class="scp-avatar-row">
            <div class="scp-avatar-frame">
              <Show when={avatar()?.portrait} fallback={<div class="scp-avatar-empty">?</div>}>
                <img class="scp-avatar-img" src={avatar()!.portrait} alt={avatar()!.name} />
              </Show>
            </div>
            <div class="scp-avatar-info">
              <div class="scp-avatar-name">{avatar()?.name ?? "No avatar selected"}</div>
              <button class="scp-btn-choose" onClick={() => { setPendingAvatarId(avatarActorId()); setAvatarOpen(true); }}>
                {avatar() ? "Change Avatar" : "Choose Avatar"}
              </button>
            </div>
          </div>

          <div class="scp-actions">
            <button class="scp-btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button class="scp-btn-primary" onClick={() => setStep(3)}>
              {avatar() ? "Next →" : "Skip →"}
            </button>
          </div>
        </div>
      </Show>

      {/* ── Step 3: Partner ──────────────────────────────────────────────── */}
      <Show when={step() === 3}>
        <div class="scp-panel scp-panel--wide">
          <h2 class="scp-panel-title">Choose your Partner</h2>
          <p class="scp-panel-desc">Your partner determines your starting deck and specialty.</p>

          <div class="scp-partners">
            <For each={STARTER_PARTNERS}>
              {(p) => {
                const def = ALL_PARTNERS.find((d) => d.id === p.partnerId)!;
                const card = CARD_BY_NUMBER.get(def.cardNumber);
                const selected = () => partnerId() === p.partnerId;
                return (
                  <button
                    class="scp-partner"
                    classList={{ "scp-partner--selected": selected() }}
                    style={{ "--partner-color": p.color }}
                    onClick={() => setPartnerId(p.partnerId)}
                  >
                    <div class="scp-partner-card-outer">
                      <div class="scp-partner-card-inner">
                        <Show when={card}>
                          <DigiCardFront card={card!} />
                        </Show>
                      </div>
                    </div>
                    <div class="scp-partner-label">
                      <span class="scp-partner-name">{def.name}</span>
                      <span class="scp-partner-spec">{p.specialty} · Rookie</span>
                    </div>
                    <Show when={selected()}>
                      <div class="scp-partner-check">✓</div>
                    </Show>
                  </button>
                );
              }}
            </For>
          </div>

          <Show when={error()}>
            <div class="scp-error">⚠ {error()}</div>
          </Show>

          <div class="scp-actions">
            <button class="scp-btn-ghost" onClick={() => setStep(2)}>← Back</button>
            <button class="scp-btn-primary" disabled={partnerId() === null} onClick={create}>
              ✔ Create Tamer
            </button>
          </div>
        </div>
      </Show>

      {/* ── Avatar dialog ─────────────────────────────────────────────────── */}
      <Show when={avatarOpen()}>
        <Portal mount={document.body}>
          <div class="scp-overlay" onClick={() => setAvatarOpen(false)}>
            <div class="scp-dialog" onClick={(e) => e.stopPropagation()}>
              <div class="scp-dialog-header">
                <span class="scp-dialog-title">Choose Avatar</span>
                <button class="scp-dialog-close" onClick={() => setAvatarOpen(false)}>✕</button>
              </div>
              <div class="scp-dialog-body">
                <ActorPicker
                  selectedId={pendingAvatarId()}
                  onPick={setPendingAvatarId}
                />
              </div>
              <div class="scp-dialog-footer">
                <button class="scp-btn-ghost" onClick={() => setAvatarOpen(false)}>Cancel</button>
                <button
                  class="scp-btn-primary"
                  onClick={() => { setAvatarActorId(pendingAvatarId()); setAvatarOpen(false); }}
                >
                  ✔ Confirm
                </button>
              </div>
            </div>
          </div>
        </Portal>
      </Show>

    </div>
  );
}
