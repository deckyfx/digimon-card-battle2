import { onCleanup, onMount } from "solid-js";
import { getActorById } from "@src/data/actors";
import type { PlayerProfile } from "@src/store/profile-store";
import "./screen-welcome.css";

const MIN_DISPLAY_MS = 2000;

export function ScreenWelcome(props: {
  profile: PlayerProfile;
  onContinue: () => void;
}) {
  const avatar = () => getActorById(props.profile.avatarActorId);

  onMount(() => {
    const t = setTimeout(props.onContinue, MIN_DISPLAY_MS);
    onCleanup(() => clearTimeout(t));
  });

  return (
    <div class="sw-root">
      <div class="sw-content">
        <div class="sw-eyebrow">Welcome, Tamer</div>

        <div class="sw-avatar-ring">
          {avatar()?.portrait
            ? <img class="sw-avatar-img" src={avatar()!.portrait} alt={avatar()!.name} />
            : <div class="sw-avatar-placeholder">?</div>
          }
        </div>

        <h1 class="sw-name">{props.profile.name}</h1>
        <p class="sw-tagline">Your journey begins now.</p>

        <div class="sw-bar-track">
          <div class="sw-bar-fill" style={{ "animation-duration": `${MIN_DISPLAY_MS}ms` }} />
        </div>
      </div>
    </div>
  );
}
