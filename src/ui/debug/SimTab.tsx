import { createSignal, For, Show } from "solid-js";
import { GameEngine } from "@src/engine/game-engine";
import { CpuPlayer } from "@src/ai/cpu-player";
import { PREBUILT_DECKS, cardsByNumbers } from "@src/data/prebuilt-decks";
import { armorCardsByNumbers } from "@src/data/armor";

interface SimLog {
  text: string;
  type: "win" | "loss" | "warn" | "stall";
}

export function SimTab() {
  const [deckAIdx, setDeckAIdx] = createSignal(0);
  const [deckBIdx, setDeckBIdx] = createSignal(1);
  const [simCount, setSimCount] = createSignal(10);
  const [simRunning, setSimRunning] = createSignal(false);
  const [simStats, setSimStats] = createSignal({
    completed: 0,
    playerWins: 0,
    cpuWins: 0,
    warnings: 0,
    totalTurns: 0,
  });
  const [simLogs, setSimLogs] = createSignal<SimLog[]>([]);
  let simStopRequested = false;

  const runSimulation = async () => {
    if (simRunning()) return;
    setSimRunning(true);
    simStopRequested = false;
    setSimStats({ completed: 0, playerWins: 0, cpuWins: 0, warnings: 0, totalTurns: 0 });
    setSimLogs([]);

    const deckA = PREBUILT_DECKS[deckAIdx()];
    const deckB = PREBUILT_DECKS[deckBIdx()];
    if (!deckA || !deckB) {
      setSimRunning(false);
      return;
    }

    const count = simCount();
    for (let m = 0; m < count; m++) {
      if (simStopRequested) {
        setSimLogs((prev) => [...prev, { text: "Simulation stopped by user.", type: "warn" }]);
        break;
      }

      try {
        const engine = new GameEngine(
          cardsByNumbers(deckA.cardNumbers),
          cardsByNumbers(deckB.cardNumbers),
          Date.now() + m,
          undefined,
          {
            player: armorCardsByNumbers(deckA.armors),
            cpu: armorCardsByNumbers(deckB.armors),
          }
        );
        const ais = {
          player: new CpuPlayer(engine, "player"),
          cpu: new CpuPlayer(engine, "cpu"),
        };

        engine.startMatch();
        let steps = 0;
        const MAX_STEPS = 2000;
        while (engine.phase !== "game-over" && steps++ < MAX_STEPS) {
          if (engine.phase === "deploy" || engine.phase === "digivolve") {
            ais[engine.turn].runPrepPhase();
          } else if (engine.phase === "battle-select") {
            const owner = engine.turn;
            const defender = owner === "player" ? "cpu" : "player";
            engine.resolveBattlePhase(ais[owner].chooseBattle(), ais[defender].chooseBattle());
          }
        }

        const warns = engine.log.filter((l) => l.startsWith("⚠"));
        const matchWarnings = warns.length;

        let outcome = "";
        let isWin = false;
        if (engine.phase === "game-over") {
          isWin = engine.winner === "player";
          outcome = `[Match ${m + 1}] ${deckA.name} vs ${deckB.name} → ${
            engine.winner === "player" ? "PLAYER" : "CPU"
          } wins ${engine.players.player.score}-${engine.players.cpu.score} (${engine.turnCount} turns, log ${
            engine.log.length
          } lines)`;
        } else {
          outcome = `[Match ${m + 1}] ❌ STALLED: ${deckA.name} vs ${deckB.name} — phase=${engine.phase} turn=${
            engine.turnCount
          }`;
        }

        setSimStats((prev) => ({
          completed: prev.completed + 1,
          playerWins: prev.playerWins + (isWin ? 1 : 0),
          cpuWins: prev.cpuWins + (!isWin && engine.phase === "game-over" ? 1 : 0),
          warnings: prev.warnings + matchWarnings,
          totalTurns: prev.totalTurns + engine.turnCount,
        }));

        setSimLogs((prev) => [
          ...prev,
          {
            text: outcome,
            type: isWin ? "win" : engine.phase !== "game-over" ? "stall" : "loss",
          },
        ]);

        if (matchWarnings > 0) {
          const uniqueWarns = [...new Set(warns)].slice(0, 3).join(" ;; ");
          setSimLogs((prev) => [
            ...prev,
            { text: `   └─ ⚠ Match Warnings: ${uniqueWarns}`, type: "warn" },
          ]);
        }
      } catch (e) {
        setSimLogs((prev) => [
          ...prev,
          { text: `[Match ${m + 1}] Error: ${e instanceof Error ? e.message : String(e)}`, type: "stall" },
        ]);
      }

      // Allow UI updates
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    setSimRunning(false);
  };

  const stopSimulation = () => {
    simStopRequested = true;
  };

  return (
    <div class="debug-panel">
      <h2>🤖 AI-vs-AI HEADLESS MATCH SIMULATOR</h2>
      <p style={{ margin: "0 0 20px 0", color: "rgba(226, 232, 240, 0.6)" }}>
        Run local simulations between prebuilt decks using the Game Engine and CpuPlayer. Verifies that matches complete successfully without errors or stalls.
      </p>

      <div class="sim-grid">
        <div class="sim-controls">
          <div class="debug-panel debug-panel-purple" style={{ padding: "12px", "margin-bottom": "16px" }}>
            <label>Player (Deck A)</label>
            <select
              class="sim-select"
              value={deckAIdx()}
              onChange={(e) => setDeckAIdx(parseInt(e.currentTarget.value, 10))}
            >
              <For each={PREBUILT_DECKS}>
                {(deck, idx) => (
                  <option value={idx()}>
                    {deck.name} ({deck.owner})
                  </option>
                )}
              </For>
            </select>

            <label>CPU (Deck B)</label>
            <select
              class="sim-select"
              value={deckBIdx()}
              onChange={(e) => setDeckBIdx(parseInt(e.currentTarget.value, 10))}
            >
              <For each={PREBUILT_DECKS}>
                {(deck, idx) => (
                  <option value={idx()}>
                    {deck.name} ({deck.owner})
                  </option>
                )}
              </For>
            </select>

            <label>Matches Count</label>
            <input
              type="number"
              class="sim-input"
              value={simCount()}
              min={1}
              max={500}
              onInput={(e) => setSimCount(Math.max(1, parseInt(e.currentTarget.value, 10) || 1))}
            />

            <div style={{ "margin-top": "20px" }}>
              <Show
                when={simRunning()}
                fallback={
                  <button class="debug-btn active" style={{ width: "100%", "justify-content": "center" }} onClick={runSimulation}>
                    Run Simulation
                  </button>
                }
              >
                <button class="debug-btn" style={{ width: "100%", "justify-content": "center", "border-color": "#ff0055", color: "#ff0055" }} onClick={stopSimulation}>
                  Stop Simulation
                </button>
              </Show>
            </div>
          </div>
        </div>

        <div>
          <div class="sim-stats-grid">
            <div class="sim-stat-card">
              <div class="sim-stat-val">
                {simStats().completed} / {simCount()}
              </div>
              <div class="sim-stat-label">Progress</div>
            </div>
            <div class="sim-stat-card">
              <div class="sim-stat-val">
                {simStats().completed > 0
                  ? `${Math.round((simStats().playerWins / simStats().completed) * 100)}%`
                  : "0%"}
              </div>
              <div class="sim-stat-label">Deck A Win Rate</div>
            </div>
            <div class="sim-stat-card">
              <div class="sim-stat-val loss">
                {simStats().completed > 0
                  ? `${Math.round((simStats().cpuWins / simStats().completed) * 100)}%`
                  : "0%"}
              </div>
              <div class="sim-stat-label">Deck B Win Rate</div>
            </div>
            <div class="sim-stat-card">
              <div class="sim-stat-val warn">{simStats().warnings}</div>
              <div class="sim-stat-label">Total Warnings</div>
            </div>
          </div>

          <div class="sim-progress-bar-container">
            <div
              class="sim-progress-bar"
              style={{ width: `${(simStats().completed / simCount()) * 100}%` }}
            />
          </div>

          <h3 style={{ "font-size": "0.9rem", "text-transform": "uppercase", color: "rgba(226, 232, 240, 0.6)", "margin-bottom": "8px" }}>
            Simulation Live Output Log
          </h3>
          <div class="sim-log-panel">
            <For each={simLogs()}>
              {(log) => (
                <div class="sim-log-entry" classList={{ [log.type]: true }}>
                  {log.text}
                </div>
              )}
            </For>
            <Show when={simLogs().length === 0}>
              <div style={{ color: "rgba(226, 232, 240, 0.3)", "font-style": "italic", "text-align": "center", "padding-top": "100px" }}>
                Simulation outputs will appear here when running.
              </div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
