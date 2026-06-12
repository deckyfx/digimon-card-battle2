import { For, Show } from "solid-js";
import { CITIES, isCityCleared, isCityUnlocked, type City } from "@src/data/cities";
import type { PlayerProfile } from "@src/store/profile-store";

/**
 * The scenario hub: every city as a banner card — locked until the
 * previous city's cafe residents are all defeated. Free Battle keeps the
 * unrestricted opponent picker available.
 */
export function WorldMapScreen(props: {
  profile: PlayerProfile;
  onEnterCity: (city: City) => void;
  onFreeBattle: () => void;
  onChangeProfile: () => void;
  onOpenBuilder: () => void;
}) {
  const defeated = () => props.profile.defeated;
  return (
    <div class="setup">
      <h1 class="game-title">DIGITAL CARD BATTLE</h1>
      <p class="subtitle">
        {props.profile.name} · ⭐ {props.profile.exp} EXP
      </p>

      <div class="world-map">
        <For each={CITIES}>
          {(city) => {
            const unlocked = () => isCityUnlocked(city, defeated());
            const cleared = () => isCityCleared(city, defeated());
            const beaten = () => city.cafeActorIds.filter((id) => (defeated()[id] ?? 0) > 0).length;
            return (
              <div
                class="city-card"
                classList={{ locked: !unlocked(), cleared: cleared() }}
                onClick={() => unlocked() && props.onEnterCity(city)}
              >
                <img src={city.overview} alt={city.name} />
                <div class="city-name">
                  {!unlocked() ? "🔒 " : cleared() ? "✅ " : ""}
                  {city.name}
                </div>
                <Show when={unlocked()}>
                  <div class="tag">
                    {beaten()}/{city.cafeActorIds.length} defeated
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
      </div>

      <div class="setup-actions">
        <button onClick={props.onChangeProfile}>⇄ Change Profile</button>
        <button onClick={props.onOpenBuilder}>🛠 Deck Builder</button>
        <button onClick={props.onFreeBattle}>⚔ Free Battle</button>
      </div>
    </div>
  );
}
