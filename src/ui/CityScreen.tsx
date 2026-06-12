import { For } from "solid-js";
import type { City } from "@src/data/cities";
import { getActorById } from "@src/data/actors";
import { getPackById } from "@src/data/prize-packs";
import type { PlayerProfile } from "@src/store/profile-store";

/**
 * Inside a city: the Battle Cafe roster — residents to duel, with their
 * exp/prize rewards and defeat badges. The Battle Arena (3-fight
 * gauntlets) is a future phase.
 */
export function CityScreen(props: {
  city: City;
  profile: PlayerProfile;
  onFight: (actorId: number) => void;
  onBack: () => void;
}) {
  const wins = (id: number) => props.profile.defeated[id] ?? 0;
  return (
    <div class="setup">
      <div class="city-header">
        <img class="city-banner" src={props.city.overview} alt={props.city.name} />
        <h1 class="game-title">{props.city.name}</h1>
      </div>

      <div class="setup-grid">
        <div class="setup-side">
          <h3>☕ Battle Cafe</h3>
          <img class="city-place" src={props.city.cafe} alt="Battle Cafe" />
          <div class="resident-list">
            <For each={props.city.cafeActorIds}>
              {(actorId) => {
                const actor = getActorById(actorId);
                if (!actor) return null;
                const pack = actor.prizePack ? getPackById(actor.prizePack) : null;
                return (
                  <div class="resident-row" classList={{ beaten: wins(actorId) > 0 }}>
                    <img class="portrait small" src={actor.portrait} alt={actor.name} />
                    <span class="resident-name">
                      {wins(actorId) > 0 ? "✅ " : ""}
                      {actor.name}
                    </span>
                    <span class="tag">
                      ⭐ {actor.exp} · 📦 {pack?.name ?? "—"}
                      {wins(actorId) > 1 ? ` · ${wins(actorId)} wins` : ""}
                    </span>
                    <button class="primary" onClick={() => props.onFight(actorId)}>
                      ⚔ Duel
                    </button>
                  </div>
                );
              }}
            </For>
          </div>
        </div>

        <div class="setup-side">
          <h3>🏟 Battle Arena</h3>
          <img class="city-place" src={props.city.arena} alt="Battle Arena" />
          <div class="tag">Arena gauntlets are coming soon.</div>
        </div>
      </div>

      <div class="setup-actions">
        <button onClick={props.onBack}>← World Map</button>
      </div>
    </div>
  );
}
