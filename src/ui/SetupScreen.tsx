import { For, Show } from "solid-js";
import type { PlayerId } from "@src/engine/game-engine";
import { getActorById } from "@src/data/actors";
import { getDeckById } from "@src/data/prebuilt-decks";
import { armorCardsByNumbers } from "@src/data/armor";
import type { PlayerProfile } from "@src/store/profile-store";
import { DeckColorBar } from "./DeckColorBar";
import { ActorPicker } from "./ActorPicker";
import { CUSTOM_PREFIX, RANDOM_DECK, selectedNumbers } from "./deck-select";

/** Match setup screen: the active profile's decks vs a chosen opponent. */
export function SetupScreen(props: {
  profile: PlayerProfile;
  playerDeck: string;
  setPlayerDeck: (value: string) => void;
  cpuActorId: number;
  setCpuActorId: (id: number) => void;
  cpuDeck: string;
  setCpuDeck: (value: string) => void;
  firstPlayer: PlayerId | "random";
  setFirstPlayer: (value: PlayerId | "random") => void;
  revealOpponentHand: boolean;
  setRevealOpponentHand: (value: boolean) => void;
  setupError: string;
  onOpenBuilder: () => void;
  onChangeProfile: () => void;
  onStart: () => void;
}) {
  const cpuActor = () => getActorById(props.cpuActorId);
  const avatar = () => getActorById(props.profile.avatarActorId)?.portrait;

  /** Armor side-deck names of the currently selected profile deck. */
  const playerArmorNames = (): string | null => {
    const deck = props.profile.decks.find((d) => `${CUSTOM_PREFIX}${d.id}` === props.playerDeck);
    const names = armorCardsByNumbers(deck?.armors).map((c) => c.name);
    return names.length > 0 ? names.join(", ") : null;
  };

  return (
    <div class="setup">
      <h1 class="game-title">DIGITAL CARD BATTLE</h1>
      <p class="subtitle">Battle Setup</p>

      <div class="setup-grid">
        <div class="setup-side">
          <h3>You</h3>
          <div class="actor-selected">
            <img class="portrait selected" src={avatar()} alt={props.profile.name} />
            <span class="actor-name">{props.profile.name}</span>
            <button class="mini" onClick={props.onChangeProfile}>
              ⇄ Change Profile
            </button>
          </div>
          <div class="label-row">
            <label>Deck ({props.profile.decks.length}/3)</label>
            <button class="mini" onClick={props.onOpenBuilder}>🛠 Deck Builder</button>
          </div>
          <Show
            when={props.profile.decks.length > 0}
            fallback={<div class="tag">No decks — open the builder to assemble one from your bag.</div>}
          >
            <select
              size={Math.min(6, Math.max(3, props.profile.decks.length))}
              onChange={(e) => props.setPlayerDeck(e.currentTarget.value)}
            >
              <For each={props.profile.decks}>
                {(d) => (
                  <option value={`${CUSTOM_PREFIX}${d.id}`} selected={`${CUSTOM_PREFIX}${d.id}` === props.playerDeck}>
                    {d.name}
                  </option>
                )}
              </For>
            </select>
            <DeckColorBar cardNumbers={selectedNumbers(props.playerDeck, props.profile)} />
            <Show when={playerArmorNames()}>
              <div class="tag">🛡 Armor side deck: {playerArmorNames()}</div>
            </Show>
          </Show>
        </div>

        <div class="setup-side">
          <h3>Opponent</h3>
          <ActorPicker
            selectedId={props.cpuActorId}
            onPick={(id) => {
              props.setCpuActorId(id);
              props.setCpuDeck(RANDOM_DECK);
            }}
          />
          <label>Their deck</label>
          <Show
            when={!cpuActor()?.isPlayer}
            fallback={
              <Show
                when={props.profile.decks.length > 0}
                fallback={<div class="tag">Mirror match needs one of your decks — build one first.</div>}
              >
                <select onChange={(e) => props.setCpuDeck(e.currentTarget.value)}>
                  <option value={RANDOM_DECK} selected={props.cpuDeck === RANDOM_DECK}>
                    🎲 Random ({props.profile.decks.length} of your deck{props.profile.decks.length > 1 ? "s" : ""})
                  </option>
                  <For each={props.profile.decks}>
                    {(d) => (
                      <option value={`${CUSTOM_PREFIX}${d.id}`} selected={`${CUSTOM_PREFIX}${d.id}` === props.cpuDeck}>
                        {d.name}
                      </option>
                    )}
                  </For>
                </select>
              </Show>
            }
          >
            <select onChange={(e) => props.setCpuDeck(e.currentTarget.value)}>
              <option value={RANDOM_DECK} selected={props.cpuDeck === RANDOM_DECK}>
                🎲 Random ({cpuActor()?.deckIds.length} deck{(cpuActor()?.deckIds.length ?? 0) > 1 ? "s" : ""})
              </option>
              <For each={cpuActor()?.deckIds ?? []}>
                {(id) => {
                  const deck = getDeckById(id);
                  return (
                    <option value={`deck:${id}`} selected={`deck:${id}` === props.cpuDeck}>
                      {deck?.name}
                      {deck?.note ? ` (${deck.note})` : ""}
                    </option>
                  );
                }}
              </For>
            </select>
          </Show>
          <Show when={props.cpuDeck !== RANDOM_DECK}>
            <DeckColorBar cardNumbers={selectedNumbers(props.cpuDeck, props.profile)} />
          </Show>
        </div>
      </div>

      <div class="setup-options">
        <span>
          First player:{" "}
          <select onChange={(e) => props.setFirstPlayer(e.currentTarget.value as PlayerId | "random")}>
            <option value="random" selected={props.firstPlayer === "random"}>
              Random
            </option>
            <option value="player" selected={props.firstPlayer === "player"}>
              Me
            </option>
            <option value="cpu" selected={props.firstPlayer === "cpu"}>
              CPU
            </option>
          </select>
        </span>
        <label>
          <input
            type="checkbox"
            checked={props.revealOpponentHand}
            onChange={(e) => props.setRevealOpponentHand(e.currentTarget.checked)}
          />{" "}
          Reveal CPU hand
        </label>
      </div>

      <Show when={props.setupError}>
        <div class="warn" style={{ "margin-bottom": "8px" }}>
          ⚠ {props.setupError}
        </div>
      </Show>
      <div class="setup-actions">
        <button class="primary" onClick={props.onStart}>
          ▶ START MATCH
        </button>
      </div>
    </div>
  );
}
