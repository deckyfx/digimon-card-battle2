import { Show, type JSX } from "solid-js";
import { CardLevel, type MasterCard } from "@src/types";
import { DigiCard, getLevelBadge, getSpecialtyIcon, getOptionIcon } from "@src/ui/DigiCard";
import "./card-detail.css";

// ─── Inline button text helper ────────────────────────────────────────────────

const BTN_ICON: Record<string, string> = {
  "○": "/assets/icons/button-circle.png",
  "△": "/assets/icons/button-triangle.png",
  "✕": "/assets/icons/button-cross.png",
};

export function ButtonText(props: { text: string }): JSX.Element {
  const parts = () => props.text.split(/(○|△|✕)/);
  return (
    <>
      {parts().map((part) => {
        const icon = BTN_ICON[part];
        return icon ? <img src={icon} class="cd-inline-btn" alt={part} /> : (part as JSX.Element);
      })}
    </>
  );
}

// ─── Card detail panel ────────────────────────────────────────────────────────

export type CardDetailProps = {
  card: MasterCard;
  /** Show support/x-effect scripts. Off by default — only enable in debug tools. */
  showScripts?: boolean;
};

export function CardDetail(props: CardDetailProps) {
  const c = () => props.card;
  const isDigimon = () => c().level !== CardLevel.None;

  return (
    <div class="card-detail">
      <div class="cd-card-number">CARD #{c().number}</div>

      <div class="cd-card-view">
        <DigiCard card={c()} />
      </div>

      <div class="cd-header">
        <h3 class="cd-name">{c().name}</h3>
      </div>

      {/* Level + Specialty icons */}
      <div class="cd-row">
        <div class="cd-stat-box cd-center">
          <img
            src={isDigimon() ? getLevelBadge(c()) : getOptionIcon(c())}
            class="cd-badge-lg"
            alt={c().level}
          />
        </div>
        <div class="cd-stat-box cd-center">
          <img
            src={isDigimon() ? getSpecialtyIcon(c()) : getOptionIcon(c())}
            class="cd-badge-md"
            alt={c().specialty}
          />
        </div>
      </div>

      {/* HP + DP (Digimon only) */}
      <Show when={isDigimon()}>
        <div class="cd-row">
          <div class="cd-stat-box">
            <div class="cd-stat-label">HP</div>
            <div class="cd-stat-val">{c().hp ?? "-"}</div>
          </div>
          <div class="cd-stat-box">
            <div class="cd-stat-label">DP+</div>
            <div class="cd-stat-val cd-val-green">{c().dp_point ?? "-"}</div>
          </div>
          <div class="cd-stat-box">
            <div class="cd-stat-label">DP↑</div>
            <div class="cd-stat-val cd-val-gold">{c().dp_required ?? "-"}</div>
          </div>
        </div>

        {/* Attacks */}
        <div class="cd-section">
          <h4 class="cd-section-label">Attacks</h4>
          <div class="cd-attacks">
            <div class="cd-attack-row">
              <img src="/assets/icons/button-circle.png" class="cd-btn-icon" alt="○" />
              <span class="cd-attack-name">{c().c_attack ?? "—"}</span>
              <span class="cd-attack-pow">{c().c_pow}</span>
            </div>
            <div class="cd-attack-row">
              <img src="/assets/icons/button-triangle.png" class="cd-btn-icon" alt="△" />
              <span class="cd-attack-name">{c().t_attack ?? "—"}</span>
              <span class="cd-attack-pow">{c().t_pow}</span>
            </div>
            <div class="cd-attack-row">
              <img src="/assets/icons/button-cross.png" class="cd-btn-icon" alt="✕" />
              <span class="cd-attack-name">{c().x_attack ?? "—"}</span>
              <span class="cd-attack-pow">{c().x_pow}</span>
            </div>
          </div>
        </div>

        {/* X Effect */}
        <Show when={c().x_effect?.trim()}>
          <div class="cd-section">
            <h4 class="cd-section-label cd-x-label">
              <img src="/assets/icons/button-cross.png" class="cd-btn-icon-sm" alt="✕" />
              Effect
            </h4>
            <div class="cd-text-block">
              <ButtonText text={c().x_effect!} />
            </div>
          </div>
        </Show>
      </Show>

      {/* Support */}
      <Show when={c().support?.trim()}>
        <div class="cd-section">
          <h4 class="cd-section-label">Support Effect</h4>
          <div class="cd-text-block">
            <ButtonText text={c().support!} />
          </div>
        </div>
      </Show>

      {/* Scripts — debug only */}
      <Show when={props.showScripts}>
        <div class="cd-section">
          <h4 class="cd-section-label">Support Script</h4>
          <div class="cd-script cd-script-support">
            {c().support_script?.trim() || "None"}
          </div>
          <h4 class="cd-section-label cd-x-label">
            <img src="/assets/icons/button-cross.png" class="cd-btn-icon-sm" alt="✕" />
            Effect Script
          </h4>
          <div class="cd-script cd-script-x">
            {c().x_effect_script?.trim() || "None"}
          </div>
        </div>
      </Show>
    </div>
  );
}
