import { createSignal, Show } from "solid-js";
import { SimTab } from "./SimTab";
import { SandboxTab } from "./SandboxTab";
import { ExplorerTab } from "./ExplorerTab";
import { CardsTab } from "./CardsTab";
import { PartnersTab } from "./PartnersTab";
import { KeyItemsTab } from "./KeyItemsTab";
import "./debug.css";

type DebugTab = "sim" | "sandbox" | "explorer" | "cards" | "partners" | "keyitems";

export function DebugRoute() {
  const [activeTab, setActiveTab] = createSignal<DebugTab>("sim");

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
        <button class="debug-btn" classList={{ active: activeTab() === "sim" }} onClick={() => setActiveTab("sim")}>
          🤖 AI Simulator
        </button>
        <button class="debug-btn" classList={{ active: activeTab() === "sandbox" }} onClick={() => setActiveTab("sandbox")}>
          🧪 Script Sandbox
        </button>
        <button class="debug-btn" classList={{ active: activeTab() === "explorer" }} onClick={() => setActiveTab("explorer")}>
          📂 Card Explorer
        </button>
        <button class="debug-btn" classList={{ active: activeTab() === "cards" }} onClick={() => setActiveTab("cards")}>
          🃏 Give Cards
        </button>
        <button class="debug-btn" classList={{ active: activeTab() === "partners" }} onClick={() => setActiveTab("partners")}>
          🐉 Partners
        </button>
        <button class="debug-btn" classList={{ active: activeTab() === "keyitems" }} onClick={() => setActiveTab("keyitems")}>
          🎒 Key Items
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
        <Show when={activeTab() === "cards"}>
          <CardsTab />
        </Show>
        <Show when={activeTab() === "partners"}>
          <PartnersTab />
        </Show>
        <Show when={activeTab() === "keyitems"}>
          <KeyItemsTab />
        </Show>
      </div>
    </div>
  );
}
