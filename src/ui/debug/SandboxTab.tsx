import { createSignal, createEffect, For, Show } from "solid-js";
import { MASTER_CARDS } from "@src/data/master-cards";
import { ScriptRunner, type SideZoneOps } from "@src/engine/script-runner";
import { createCombatantCtx, type CombatantCtx } from "@src/engine/battle-context";
import { AttackType } from "@src/types";

export function SandboxTab() {
  const cardsWithScripts = () =>
    MASTER_CARDS.filter((c) => (c.support_script && c.support_script.trim() !== "") || (c.x_effect_script && c.x_effect_script.trim() !== ""));

  const [sandboxCardIdx, setSandboxCardIdx] = createSignal(0);
  const [scriptType, setScriptType] = createSignal<"support" | "x_effect">("support");
  const [customScript, setCustomScript] = createSignal("");
  const [sandboxLog, setSandboxLog] = createSignal<string[]>([]);
  const [sandboxCommands, setSandboxCommands] = createSignal<string[]>([]);

  // Context fields (Own)
  const [ownHp, setOwnHp] = createSignal(1000);
  const [ownLevel, setOwnLevel] = createSignal("R");
  const [ownSpec, setOwnSpec] = createSignal("Fire");
  const [ownCPower, setOwnCPower] = createSignal(300);
  const [ownTPower, setOwnTPower] = createSignal(200);
  const [ownXPower, setOwnXPower] = createSignal(100);
  const [ownSelAttack, setOwnSelAttack] = createSignal<AttackType>("c");
  const [ownDpCount, setOwnDpCount] = createSignal(2);
  const [ownHandCount, setOwnHandCount] = createSignal(4);
  const [ownFirst, setOwnFirst] = createSignal(false);
  const [ownJamming, setOwnJamming] = createSignal(false);
  const [ownAbsorbing, setOwnAbsorbing] = createSignal(false);
  const [ownCrashing, setOwnCrashing] = createSignal(false);
  const [ownReviving, setOwnReviving] = createSignal(0);

  // Context fields (Opponent)
  const [oppHp, setOppHp] = createSignal(1200);
  const [oppLevel, setOppLevel] = createSignal("C");
  const [oppSpec, setOppSpec] = createSignal("Ice");
  const [oppCPower, setOppCPower] = createSignal(400);
  const [oppTPower, setOppTPower] = createSignal(300);
  const [oppXPower, setOppXPower] = createSignal(150);
  const [oppSelAttack, setOppSelAttack] = createSignal<AttackType>("t");
  const [oppDpCount, setOppDpCount] = createSignal(1);
  const [oppHandCount, setOppHandCount] = createSignal(3);
  const [oppFirst, setOppFirst] = createSignal(false);
  const [oppJamming, setOppJamming] = createSignal(false);
  const [oppAbsorbing, setOppAbsorbing] = createSignal(false);
  const [oppCrashing, setOppCrashing] = createSignal(false);
  const [oppReviving, setOppReviving] = createSignal(0);

  // Outputs of last run
  const [mutatedOwn, setMutatedOwn] = createSignal<CombatantCtx | null>(null);
  const [mutatedOpp, setMutatedOpp] = createSignal<CombatantCtx | null>(null);

  // Prepopulate sandbox when card selection changes
  createEffect(() => {
    const card = cardsWithScripts()[sandboxCardIdx()];
    if (card) {
      if (scriptType() === "support") {
        setCustomScript(card.support_script ?? "");
      } else {
        setCustomScript(card.x_effect_script ?? "");
      }
    }
  });

  const runSandboxScript = () => {
    setSandboxLog([]);
    setSandboxCommands([]);
    setMutatedOwn(null);
    setMutatedOpp(null);

    const logFn = (msg: string) => setSandboxLog((prev) => [...prev, msg]);

    // Build Contexts
    const ownCtx = createCombatantCtx({
      hp: ownHp(),
      level: ownLevel(),
      specialty: ownSpec(),
      c_power: ownCPower(),
      t_power: ownTPower(),
      x_power: ownXPower(),
      selected_attack: ownSelAttack(),
      dp_count: ownDpCount(),
      hand_count: ownHandCount(),
    });
    ownCtx.is_first_attack = ownFirst();
    ownCtx.jamming = ownJamming();
    ownCtx.is_absorbing = ownAbsorbing();
    ownCtx.is_crashing = ownCrashing();
    ownCtx.is_reviving = ownReviving();

    const oppCtx = createCombatantCtx({
      hp: oppHp(),
      level: oppLevel(),
      specialty: oppSpec(),
      c_power: oppCPower(),
      t_power: oppTPower(),
      x_power: oppXPower(),
      selected_attack: oppSelAttack(),
      dp_count: oppDpCount(),
      hand_count: oppHandCount(),
    });
    oppCtx.is_first_attack = oppFirst();
    oppCtx.jamming = oppJamming();
    oppCtx.is_absorbing = oppAbsorbing();
    oppCtx.is_crashing = oppCrashing();
    oppCtx.is_reviving = oppReviving();

    // Mock Zone Ops to capture commands
    const cmds: string[] = [];
    const createMockOps = (isOwn: boolean): SideZoneOps => ({
      drawCards(count) {
        cmds.push(`draw-card|${isOwn ? "own" : "opponent"}|${count}`);
      },
      drawPartners(count) {
        cmds.push(`draw-partner|${isOwn ? "own" : "opponent"}|${count}`);
      },
      moveCards(from, to, count, pos) {
        cmds.push(`move-card|${isOwn ? "own" : "opponent"}|${from}|${to}|${count}|${pos}`);
      },
      shuffleDeck() {
        cmds.push(`shuffle|${isOwn ? "own" : "opponent"}|deck`);
      },
      dpCount() {
        return isOwn ? ownDpCount() : oppDpCount();
      },
      handCount() {
        return isOwn ? ownHandCount() : oppHandCount();
      },
    });

    const runner = new ScriptRunner(logFn);
    const success = runner.run(
      customScript(),
      ownCtx,
      oppCtx,
      createMockOps(true),
      createMockOps(false)
    );

    if (success) {
      setSandboxLog((prev) => [...prev, "✔ Script executed successfully."]);
      setSandboxCommands(cmds);
      setMutatedOwn(ownCtx);
      setMutatedOpp(oppCtx);
    } else {
      setSandboxLog((prev) => [...prev, "❌ Script execution failed (fizzled)."]);
    }
  };

  // Helper to show changed variables
  const isChanged = (curr: CombatantCtx[keyof CombatantCtx] | undefined, orig: CombatantCtx[keyof CombatantCtx] | undefined) => {
    if (Array.isArray(curr) && Array.isArray(orig)) {
      return JSON.stringify(curr) !== JSON.stringify(orig);
    }
    return curr !== orig;
  };

  return (
    <div class="debug-panel">
      <h2>🧪 SUPPORT CARD SCRIPT SANDBOX</h2>
      <p style={{ margin: "0 0 20px 0", color: "rgba(226, 232, 240, 0.6)" }}>
        Test and live-edit support/special card scripts against mock combatant variables. Shows exact changes made to combatant contexts and zone commands pushed.
      </p>

      <div class="sandbox-grid">
        <div class="sandbox-form">
          <div class="debug-panel debug-panel-purple" style={{ padding: "12px" }}>
            <h3 style={{ margin: "0 0 12px 0", "font-size": "1rem", color: "#fff" }}>1. Setup Script</h3>
            <div style={{ display: "flex", gap: "10px", "margin-bottom": "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ "font-size": "0.8rem", color: "rgba(226, 232, 240, 0.6)" }}>Template Card</label>
                <select
                  class="sim-select"
                  value={sandboxCardIdx()}
                  onChange={(e) => setSandboxCardIdx(parseInt(e.currentTarget.value, 10))}
                >
                  <For each={cardsWithScripts()}>
                    {(card, idx) => (
                      <option value={idx()}>
                        #{card.number} - {card.name}
                      </option>
                    )}
                  </For>
                </select>
              </div>
              <div>
                <label style={{ "font-size": "0.8rem", color: "rgba(226, 232, 240, 0.6)" }}>Script Slot</label>
                <select
                  class="sim-select"
                  value={scriptType()}
                  onChange={(e) => setScriptType(e.currentTarget.value as "support" | "x_effect")}
                >
                  <option value="support">Support Effect</option>
                  <option value="x_effect">X-Attack Special Effect</option>
                </select>
              </div>
            </div>

            <label style={{ "font-size": "0.8rem", color: "rgba(226, 232, 240, 0.6)" }}>JS Script Editor</label>
            <textarea
              class="sandbox-textarea"
              value={customScript()}
              onInput={(e) => setCustomScript(e.currentTarget.value)}
            />
          </div>

          <div class="debug-panel" style={{ padding: "12px" }}>
            <h3 style={{ margin: "0 0 12px 0", "font-size": "1rem", color: "#fff" }}>2. Mock Combatants</h3>
            <div style={{ display: "grid", "grid-template-columns": "1fr 1fr", gap: "12px" }}>
              {/* OWN VARIABLES */}
              <div>
                <h4 style={{ margin: "0 0 8px 0", "font-size": "0.85rem", color: "#00f3ff" }}>OWN CONTROLLER</h4>
                <div style={{ display: "flex", "flex-direction": "column", gap: "6px" }}>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <input type="number" class="sim-input" style={{ padding: "4px" }} placeholder="HP" value={ownHp()} onInput={(e) => setOwnHp(parseInt(e.currentTarget.value) || 0)} />
                    <input type="number" class="sim-input" style={{ padding: "4px" }} placeholder="Circle" value={ownCPower()} onInput={(e) => setOwnCPower(parseInt(e.currentTarget.value) || 0)} />
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <input type="number" class="sim-input" style={{ padding: "4px" }} placeholder="Tri" value={ownTPower()} onInput={(e) => setOwnTPower(parseInt(e.currentTarget.value) || 0)} />
                    <input type="number" class="sim-input" style={{ padding: "4px" }} placeholder="Cross" value={ownXPower()} onInput={(e) => setOwnXPower(parseInt(e.currentTarget.value) || 0)} />
                  </div>
                  <div style={{ display: "flex", gap: "4px", "align-items": "center" }}>
                    <select class="sim-select" style={{ padding: "4px" }} value={ownLevel()} onChange={(e) => setOwnLevel(e.currentTarget.value)}>
                      <option value="R">Rookie (R)</option>
                      <option value="C">Champion (C)</option>
                      <option value="U">Ultimate (U)</option>
                      <option value="A">Armor (A)</option>
                    </select>
                    <select class="sim-select" style={{ padding: "4px" }} value={ownSpec()} onChange={(e) => setOwnSpec(e.currentTarget.value)}>
                      <option value="Fire">Fire</option>
                      <option value="Ice">Ice</option>
                      <option value="Nature">Nature</option>
                      <option value="Darkness">Darkness</option>
                      <option value="Rare">Rare</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: "10px", "flex-wrap": "wrap", "margin-top": "4px" }}>
                    <label style={{ display: "flex", "align-items": "center", gap: "4px", "font-size": "0.8rem" }}>
                      <input type="checkbox" checked={ownFirst()} onChange={(e) => setOwnFirst(e.currentTarget.checked)} /> 1st Strike
                    </label>
                    <label style={{ display: "flex", "align-items": "center", gap: "4px", "font-size": "0.8rem" }}>
                      <input type="checkbox" checked={ownJamming()} onChange={(e) => setOwnJamming(e.currentTarget.checked)} /> Jamming
                    </label>
                    <label style={{ display: "flex", "align-items": "center", gap: "4px", "font-size": "0.8rem" }}>
                      <input type="checkbox" checked={ownAbsorbing()} onChange={(e) => setOwnAbsorbing(e.currentTarget.checked)} /> Absorb
                    </label>
                  </div>
                </div>
              </div>

              {/* OPPONENT VARIABLES */}
              <div>
                <h4 style={{ margin: "0 0 8px 0", "font-size": "0.85rem", color: "#ff0055" }}>OPPONENT</h4>
                <div style={{ display: "flex", "flex-direction": "column", gap: "6px" }}>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <input type="number" class="sim-input" style={{ padding: "4px" }} placeholder="HP" value={oppHp()} onInput={(e) => setOppHp(parseInt(e.currentTarget.value) || 0)} />
                    <input type="number" class="sim-input" style={{ padding: "4px" }} placeholder="Circle" value={oppCPower()} onInput={(e) => setOppCPower(parseInt(e.currentTarget.value) || 0)} />
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <input type="number" class="sim-input" style={{ padding: "4px" }} placeholder="Tri" value={oppTPower()} onInput={(e) => setOppTPower(parseInt(e.currentTarget.value) || 0)} />
                    <input type="number" class="sim-input" style={{ padding: "4px" }} placeholder="Cross" value={oppXPower()} onInput={(e) => setOppXPower(parseInt(e.currentTarget.value) || 0)} />
                  </div>
                  <div style={{ display: "flex", gap: "4px", "align-items": "center" }}>
                    <select class="sim-select" style={{ padding: "4px" }} value={oppLevel()} onChange={(e) => setOppLevel(e.currentTarget.value)}>
                      <option value="R">Rookie (R)</option>
                      <option value="C">Champion (C)</option>
                      <option value="U">Ultimate (U)</option>
                      <option value="A">Armor (A)</option>
                    </select>
                    <select class="sim-select" style={{ padding: "4px" }} value={oppSpec()} onChange={(e) => setOppSpec(e.currentTarget.value)}>
                      <option value="Fire">Fire</option>
                      <option value="Ice">Ice</option>
                      <option value="Nature">Nature</option>
                      <option value="Darkness">Darkness</option>
                      <option value="Rare">Rare</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: "10px", "flex-wrap": "wrap", "margin-top": "4px" }}>
                    <label style={{ display: "flex", "align-items": "center", gap: "4px", "font-size": "0.8rem" }}>
                      <input type="checkbox" checked={oppFirst()} onChange={(e) => setOppFirst(e.currentTarget.checked)} /> 1st Strike
                    </label>
                    <label style={{ display: "flex", "align-items": "center", gap: "4px", "font-size": "0.8rem" }}>
                      <input type="checkbox" checked={oppJamming()} onChange={(e) => setOppJamming(e.currentTarget.checked)} /> Jamming
                    </label>
                    <label style={{ display: "flex", "align-items": "center", gap: "4px", "font-size": "0.8rem" }}>
                      <input type="checkbox" checked={oppAbsorbing()} onChange={(e) => setOppAbsorbing(e.currentTarget.checked)} /> Absorb
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <button class="debug-btn active" style={{ width: "100%", "justify-content": "center", "margin-top": "16px" }} onClick={runSandboxScript}>
              Execute Script
            </button>
          </div>
        </div>

        {/* OUTPUT RESULTS */}
        <div class="sandbox-results">
          <div class="debug-panel" style={{ padding: "12px", "min-height": "140px" }}>
            <h3 style={{ margin: "0 0 12px 0", "font-size": "1rem", color: "#fff" }}>3. Mutated Combatant Contexts</h3>
            <Show
              when={mutatedOwn() && mutatedOpp()}
              fallback={
                <div style={{ color: "rgba(226, 232, 240, 0.3)", "font-style": "italic", "text-align": "center", "padding-top": "40px" }}>
                  Click Execute Script to inspect variable mutations.
                </div>
              }
            >
              <div class="sandbox-state-diff">
                <div class="sandbox-state-col">
                  <h4>Own Context</h4>
                  <div class="diff-row">
                    <span>hp:</span>
                    <span classList={{ "val-changed": isChanged(mutatedOwn()?.hp, ownHp()) }}>
                      {mutatedOwn()?.hp} {isChanged(mutatedOwn()?.hp, ownHp()) && `(was ${ownHp()})`}
                    </span>
                  </div>
                  <div class="diff-row">
                    <span>c_power:</span>
                    <span classList={{ "val-changed": isChanged(mutatedOwn()?.c_power, ownCPower()) }}>
                      {mutatedOwn()?.c_power} {isChanged(mutatedOwn()?.c_power, ownCPower()) && `(was ${ownCPower()})`}
                    </span>
                  </div>
                  <div class="diff-row">
                    <span>t_power:</span>
                    <span classList={{ "val-changed": isChanged(mutatedOwn()?.t_power, ownTPower()) }}>
                      {mutatedOwn()?.t_power} {isChanged(mutatedOwn()?.t_power, ownTPower()) && `(was ${ownTPower()})`}
                    </span>
                  </div>
                  <div class="diff-row">
                    <span>x_power:</span>
                    <span classList={{ "val-changed": isChanged(mutatedOwn()?.x_power, ownXPower()) }}>
                      {mutatedOwn()?.x_power} {isChanged(mutatedOwn()?.x_power, ownXPower()) && `(was ${ownXPower()})`}
                    </span>
                  </div>
                  <div class="diff-row">
                    <span>first_strike:</span>
                    <span classList={{ "val-changed": isChanged(mutatedOwn()?.is_first_attack, ownFirst()) }}>
                      {String(mutatedOwn()?.is_first_attack)}
                    </span>
                  </div>
                  <div class="diff-row">
                    <span>jamming:</span>
                    <span classList={{ "val-changed": isChanged(mutatedOwn()?.jamming, ownJamming()) }}>
                      {String(mutatedOwn()?.jamming)}
                    </span>
                  </div>
                  <div class="diff-row">
                    <span>option_voided:</span>
                    <span>{String(mutatedOwn()?.option_voided)}</span>
                  </div>
                </div>

                <div class="sandbox-state-col">
                  <h4>Opponent Context</h4>
                  <div class="diff-row">
                    <span>hp:</span>
                    <span classList={{ "val-changed": isChanged(mutatedOpp()?.hp, oppHp()) }}>
                      {mutatedOpp()?.hp} {isChanged(mutatedOpp()?.hp, oppHp()) && `(was ${oppHp()})`}
                    </span>
                  </div>
                  <div class="diff-row">
                    <span>c_power:</span>
                    <span classList={{ "val-changed": isChanged(mutatedOpp()?.c_power, oppCPower()) }}>
                      {mutatedOpp()?.c_power} {isChanged(mutatedOpp()?.c_power, oppCPower()) && `(was ${oppCPower()})`}
                    </span>
                  </div>
                  <div class="diff-row">
                    <span>t_power:</span>
                    <span classList={{ "val-changed": isChanged(mutatedOpp()?.t_power, oppTPower()) }}>
                      {mutatedOpp()?.t_power} {isChanged(mutatedOpp()?.t_power, oppTPower()) && `(was ${oppTPower()})`}
                    </span>
                  </div>
                  <div class="diff-row">
                    <span>x_power:</span>
                    <span classList={{ "val-changed": isChanged(mutatedOpp()?.x_power, oppXPower()) }}>
                      {mutatedOpp()?.x_power} {isChanged(mutatedOpp()?.x_power, oppXPower()) && `(was ${oppXPower()})`}
                    </span>
                  </div>
                  <div class="diff-row">
                    <span>first_strike:</span>
                    <span classList={{ "val-changed": isChanged(mutatedOpp()?.is_first_attack, oppFirst()) }}>
                      {String(mutatedOpp()?.is_first_attack)}
                    </span>
                  </div>
                  <div class="diff-row">
                    <span>jamming:</span>
                    <span classList={{ "val-changed": isChanged(mutatedOpp()?.jamming, oppJamming()) }}>
                      {String(mutatedOpp()?.jamming)}
                    </span>
                  </div>
                  <div class="diff-row">
                    <span>option_voided:</span>
                    <span>{String(mutatedOpp()?.option_voided)}</span>
                  </div>
                </div>
              </div>
            </Show>
          </div>

          <div class="debug-panel" style={{ padding: "12px" }}>
            <h3 style={{ margin: "0 0 12px 0", "font-size": "1rem", color: "#fff" }}>4. Pushed Zone Commands</h3>
            <div class="sandbox-commands">
              <For each={sandboxCommands()}>
                {(cmd) => <div class="sandbox-cmd-item">⚙ {cmd}</div>}
              </For>
              <Show when={sandboxCommands().length === 0}>
                <span class="sandbox-cmd-empty">No zone commands pushed by this script.</span>
              </Show>
            </div>
          </div>

          <div class="debug-panel" style={{ padding: "12px" }}>
            <h3 style={{ margin: "0 0 8px 0", "font-size": "1rem", color: "#fff" }}>5. Script Runner Logger</h3>
            <div class="sim-log-panel" style={{ height: "100px" }}>
              <For each={sandboxLog()}>
                {(line) => <div style={{ color: line.startsWith("⚠") || line.startsWith("❌") ? "#ff0055" : "#e2e8f0" }}>{line}</div>}
              </For>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
