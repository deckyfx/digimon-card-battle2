/**
 * Headless engine smoke test: plays full AI-vs-AI matches across random
 * prebuilt decks and reports outcomes. Usage: bun run scripts/simulate.ts [n]
 */
import { GameEngine } from "../src/engine/game-engine";
import { CpuPlayer } from "../src/ai/cpu-player";
import { DECK_NAMES, buildDeck } from "../src/data/prebuilt-decks";

const matches = parseInt(Bun.argv[2] ?? "20", 10);
const MAX_STEPS = 2000;
let completed = 0;
let scriptWarnings = 0;

for (let m = 0; m < matches; m++) {
  const deckA = DECK_NAMES[Math.floor(Math.random() * DECK_NAMES.length)] as string;
  const deckB = DECK_NAMES[Math.floor(Math.random() * DECK_NAMES.length)] as string;
  const engine = new GameEngine(buildDeck(deckA), buildDeck(deckB), 1000 + m);
  const ais = { player: new CpuPlayer(engine, "player"), cpu: new CpuPlayer(engine, "cpu") };

  engine.startMatch();
  let steps = 0;
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
  scriptWarnings += warns.length;
  if (warns.length > 0) console.log(`  [${m}] warnings:`, [...new Set(warns)].slice(0, 3).join(" ;; "));

  if (engine.phase === "game-over") {
    completed++;
    const p = engine.players;
    console.log(
      `[${m}] ${deckA} vs ${deckB} → ${engine.winner} wins ${p.player.score}-${p.cpu.score} (${engine.turnCount} turns, log ${engine.log.length})`,
    );
  } else {
    console.log(`[${m}] ❌ STALLED: ${deckA} vs ${deckB} — phase=${engine.phase} turn=${engine.turnCount}`);
    console.log(engine.log.slice(-12).join("\n"));
  }
}

console.log(`\n${completed}/${matches} matches completed, ${scriptWarnings} script warnings.`);
