import { For, Show } from "solid-js";
import type { PlayerId } from "@src/engine/game-engine";
import { PLAYER_ACTORS, getActorById } from "@src/data/actors";
import { getDeckById } from "@src/data/prebuilt-decks";
import { armorCardsByNumbers } from "@src/data/armor";
import type { CustomDeck } from "@src/store/custom-deck-store";
import { DeckColorBar } from "./DeckColorBar";
import { ActorPicker } from "./ActorPicker";
import { RANDOM_DECK, selectedNumbers } from "./deck-select";

/** Match setup screen: actors, decks, first player, visibility options. */
export function SetupScreen(props: {
  customDecks: CustomDeck[];
  playerActorId: number;
  setPlayerActorId: (id: number) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
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
  onStart: () => void;
}) {
  const cpuActor = () => getActorById(props.cpuActorId);

  /** Armor side-deck names of the player's currently selected custom deck. */
  const playerArmorNames = (): string | null => {
    const deck = props.customDecks.find((d) => `custom:${d.id}` === props.playerDeck);
    const names = armorCardsByNumbers(deck?.armors).map((c) => c.name);
    return names.length > 0 ? names.join(", ") : null;
  };

  return (
    <div class="setup">
      <h1 class="game-title">DIGITAL CARD BATTLE</h1>
      <p class="subtitle">Battle Engine · 301 Cards · 125 Decks</p>

      <div class="setup-grid">
        <div class="setup-side">
          <h3>You</h3>
          <div class="portrait-row">
            <For each={PLAYER_ACTORS}>
              {(a) => (
                <img
                  class="portrait"
                  classList={{ selected: props.playerActorId === a.id }}
                  src={a.portrait}
                  alt={a.name}
                  onClick={() => props.setPlayerActorId(a.id)}
                />
              )}
            </For>
          </div>
          <label>Name</label>
          <input
            type="text"
            value={props.playerName}
            onInput={(e) => props.setPlayerName(e.currentTarget.value)}
            maxLength={20}
          />
          <div class="label-row">
            <label>Deck (your custom decks)</label>
            <button class="mini" onClick={props.onOpenBuilder}>🛠 Deck Builder</button>
          </div>
          <Show
            when={props.customDecks.length > 0}
            fallback={
              <div class="tag">
                No custom decks yet — build one!{" "}
                <button onClick={props.onOpenBuilder}>🛠 Open Builder</button>
              </div>
            }
          >
            <select
              size={Math.min(6, Math.max(3, props.customDecks.length))}
              onChange={(e) => props.setPlayerDeck(e.currentTarget.value)}
            >
              <For each={props.customDecks}>
                {(d) => (
                  <option value={`custom:${d.id}`} selected={`custom:${d.id}` === props.playerDeck}>
                    {d.name}
                  </option>
                )}
              </For>
            </select>
            <DeckColorBar cardNumbers={selectedNumbers(props.playerDeck)} />
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
                when={props.customDecks.length > 0}
                fallback={<div class="tag">Mirror match needs a custom deck — build one first.</div>}
              >
                <select onChange={(e) => props.setCpuDeck(e.currentTarget.value)}>
                  <option value={RANDOM_DECK} selected={props.cpuDeck === RANDOM_DECK}>
                    🎲 Random ({props.customDecks.length} custom deck{props.customDecks.length > 1 ? "s" : ""})
                  </option>
                  <For each={props.customDecks}>
                    {(d) => (
                      <option value={`custom:${d.id}`} selected={`custom:${d.id}` === props.cpuDeck}>
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
            <DeckColorBar cardNumbers={selectedNumbers(props.cpuDeck)} />
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
