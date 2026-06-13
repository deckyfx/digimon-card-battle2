import { createSignal, Show } from "solid-js";
import { SimTab } from "./SimTab";
import { SandboxTab } from "./SandboxTab";
import { ExplorerTab } from "./ExplorerTab";
import { CardAnimationTab } from "./CardAnimationTab";
import { BoardDesignTab } from "./BoardDesignTab";
import "./debug.css";

export function DebugRoute() {
  const [activeTab, setActiveTab] = createSignal<"sim" | "sandbox" | "explorer" | "animation" | "board">("sim");

  // Navigation helper back to main game
  const navigateToGame = () => {
    window.history.pushState(null, "", "/");
    window.dispatchEvent(new Event("popstate"));
  };

  return (
    <div class="debug-root">
      <div class="debug-header">
        <h1 class="debug-title">DIGITAL CARD BATTLE // DEBUG</h1>
        <div class="debug-nav">
          <button class="debug-btn debug-btn-back" onClick={navigateToGame}>
            ◀ Back To Game
          </button>
        </div>
      </div>

      <div class="debug-tabs">
        <button
          class="debug-btn"
          classList={{ active: activeTab() === "sim" }}
          onClick={() => setActiveTab("sim")}
        >
          🤖 AI Match Simulator
        </button>
        <button
          class="debug-btn"
          classList={{ active: activeTab() === "sandbox" }}
          onClick={() => setActiveTab("sandbox")}
        >
          🧪 Script Sandbox
        </button>
        <button
          class="debug-btn"
          classList={{ active: activeTab() === "explorer" }}
          onClick={() => setActiveTab("explorer")}
        >
          📂 Card Explorer & Stats
        </button>
        <button
          class="debug-btn"
          classList={{ active: activeTab() === "animation" }}
          onClick={() => setActiveTab("animation")}
        >
          🎴 Card Animation Lab
        </button>
        <button
          class="debug-btn"
          classList={{ active: activeTab() === "board" }}
          onClick={() => setActiveTab("board")}
        >
          🎮 Board Design
        </button>
      </div>

      <div class="debug-content">
        <Show when={activeTab() === "sim"}>
          <SimTab />
        </Show>
        <Show when={activeTab() === "sandbox"}>
          <SandboxTab />
        </Show>
        <Show when={activeTab() === "explorer"}>
          <ExplorerTab />
        </Show>
        <Show when={activeTab() === "animation"}>
          <CardAnimationTab />
        </Show>
        <Show when={activeTab() === "board"}>
          <BoardDesignTab />
        </Show>
      </div>
    </div>
  );
}

