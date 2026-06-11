/**
 * Reseeds src/data/deck-lists.ts from the GameFAQs base deck list
 * (decklist.html, saved manually — GameFAQs blocks fetchers).
 *
 * Usage: bun run scripts/reseed-decks.ts
 */
import { MASTER_CARDS } from "../src/data/master-cards";

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/○/g, "circle")
    .replace(/△/g, "triangle")
    .replace(/✕/g, "cross")
    .replace(/\bo\b/g, "circle")
    .replace(/\bx\b/g, "cross")
    .replace(/[^a-z0-9]/g, "");

/** Known FAQ typos / shorthand → master card names. */
const ALIASES: Record<string, string> = {
  dokunemmon: "Dokunemon",
  pixiemon: "Piximon",
  sylphymon: "Silphymon",
  attachchip: "Attack Chip",
  recoverfloppy: "Recovery Floppy",
  reoveryfloppy: "Recovery Floppy",
  revoverfloppy: "Recovery Floppy",
  revoveryfloppy: "Recovery Floppy",
  grandkuwagamon: "GranKuwagamon",
  armorcrash: "ArmorCrush Digivolve",
  megaredfloppy: "Mega Rec. Floppy",
  megarecflopppy: "Mega Rec. Floppy",
  shogunsorders: "Shogun's Order",
  networm: "Net Worm",
  network: "Net Worm",
  hittercircle: "Circle Hitter",
  hittertriangle: "Triangle Hitter",
  hittercross: "Cross Hitter",
  darknessalter: "Darkness Altar",
  rarealter: "Rare Altar",
  guardomon: "Guardromon",
  speeddigivolv: "Speed Digivolve",
  specialdigivolv: "Special Digivolve",
};

const index = new Map<string, string>();
for (const card of MASTER_CARDS) {
  const key = normalize(card.name);
  if (!index.has(key)) index.set(key, card.number);
}
for (const [alias, target] of Object.entries(ALIASES)) {
  const num = index.get(normalize(target));
  if (num) index.set(alias, num);
}

// ── Parse the HTML ───────────────────────────────────────────────────────

const html = await Bun.file("decklist.html").text();

interface ParsedDeck {
  name: string;
  composition: string;
  owner: string;
  /** Armor digivolution target noted on partner decks (e.g. "Flamedramon"). */
  armor: string;
  numbers: string[];
  unmatched: string[];
}

const decks: ParsedDeck[] = [];
const COLOR_RE = /Red|Blue|Green|Black|Yellow/;

const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
let m: RegExpExecArray | null;
while ((m = cellRe.exec(html)) !== null) {
  const cell = m[1] as string;
  const strongMatch = cell.match(/<strong[^>]*>([\s\S]*?)<\/strong[^>]*>/);
  if (!strongMatch) continue;

  const toLines = (chunk: string): string[] =>
    chunk
      .split(/<br\s*\/?>/i)
      .map((l) => l.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
      .filter((l) => l.length > 0);

  // Header: name, optional "A.K.A …", composition "(…)" (may span lines), owner.
  const header = toLines(strongMatch[1] as string);
  if (header.length === 0) continue;
  const name = header[0] as string;
  const rest = header.slice(1).filter((l) => !/^A\.?K\.?A/i.test(l));
  const compositionParts = rest.filter((l) => COLOR_RE.test(l) || l.startsWith("("));
  const composition = compositionParts.join(" ").replace(/\s+/g, " ");
  const owner = rest.filter((l) => !compositionParts.includes(l)).join(" ").trim();

  // Body: "N Card Name" entries (or "- Card Name" play-order bullets).
  const bodyStart = (strongMatch.index as number) + strongMatch[0].length;
  const body = toLines(cell.slice(bodyStart));
  const numbers: string[] = [];
  const unmatched: string[] = [];
  let armor = "";
  for (const line of body) {
    // "Armor → X" + the stat lines after it are an informational block in
    // the middle of partner deck lists — record the target, skip the stats.
    const armorMatch = line.match(/^Armor\s*(?:→|->)\s*(.+)$/);
    if (armorMatch) {
      armor = (armorMatch[1] as string).trim();
      continue;
    }
    if (/^\((Red|Blue|Green|Black|Yellow)\)$/.test(line)) continue;
    if (/^HP\s+\d+/.test(line)) continue;
    if (/^[O△X✕○]\s+\d+/.test(line)) continue;
    // "N Card Name" or a "- Card Name" play-order bullet (count 1).
    let count: number;
    let rawName: string;
    const counted = line.match(/^(\d+)\s+(.+)$/);
    const bullet = line.match(/^-\s+(.+)$/);
    if (counted) {
      count = parseInt(counted[1] as string, 10);
      rawName = counted[2] as string;
    } else if (bullet) {
      count = 1;
      rawName = bullet[1] as string;
    } else {
      if (line.trim()) unmatched.push(`?? ${line}`);
      continue;
    }
    const cardName = rawName.replace(/\[[^\]]*\]/g, "").replace(/\s*---.*$/, "").trim(); // strip notes like [no armor]
    const num = index.get(normalize(cardName));
    if (!num) {
      unmatched.push(cardName);
      continue;
    }
    for (let i = 0; i < count; i++) numbers.push(num);
  }

  decks.push({ name, composition, owner, armor, numbers, unmatched });
}

// Disambiguate duplicate deck names (selection in the UI is by name).
const nameCounts = new Map<string, number>();
for (const d of decks) nameCounts.set(d.name, (nameCounts.get(d.name) ?? 0) + 1);
for (const d of decks) {
  if ((nameCounts.get(d.name) ?? 0) > 1 && d.owner) {
    d.name = `${d.name} (${d.owner.split(" ")[0]})`;
  }
}

// ── Report ───────────────────────────────────────────────────────────────

let bad = 0;
for (const d of decks) {
  const counts = new Map<string, number>();
  for (const n of d.numbers) counts.set(n, (counts.get(n) ?? 0) + 1);
  const over = [...counts.values()].some((c) => c > 4);
  const problems: string[] = [];
  if (d.numbers.length !== 30) problems.push(`${d.numbers.length} cards`);
  if (over) problems.push(">4 copies");
  if (d.unmatched.length) problems.push(`unmatched: ${d.unmatched.join(" | ")}`);
  if (problems.length) {
    bad++;
    console.log(`⚠ ${d.name} [${d.owner}]: ${problems.join(", ")}`);
  }
}
console.log(`\n${decks.length} decks parsed, ${bad} with problems.`);

if (Bun.argv.includes("--write")) {
  const body = decks
    .map((d) => {
      const armorNum = d.armor ? (index.get(normalize(d.armor)) ?? "") : "";
      const armors = armorNum ? [armorNum] : [];
      if (d.armor && !armorNum) console.log("⚠ armor not in card set: " + d.armor);
      return (
        "  {\n" +
        "    name: " + JSON.stringify(d.name) + ",\n" +
        "    owner: " + JSON.stringify(d.owner) + ",\n" +
        "    cardNumbers: " + JSON.stringify(d.numbers) + ",\n" +
        "    armors: " + JSON.stringify(armors) + ",\n" +
        "  },"
      );
    })
    .join("\n");

  const out =
    "/**\n" +
    " * Prebuilt deck lists — auto-generated from the GameFAQs base deck list\n" +
    " * by scripts/reseed-decks.ts. Do not edit by hand; rerun the generator.\n" +
    " */\n\n" +
    "export interface DeckList {\n" +
    "  name: string;\n" +
    "  /** In-game owner of this deck (useful for campaign mode later). */\n" +
    "  owner: string;\n" +
    "  /** Master card numbers, one entry per copy. */\n" +
    "  cardNumbers: string[];\n" +
    "  /** Armor side-deck card numbers (empty when the deck has none). */\n" +
    "  armors: string[];\n" +
    "}\n\n" +
    "export const DECK_LISTS: DeckList[] = [\n" +
    body +
    "\n];\n";

  await Bun.write("src/data/deck-lists.ts", out);
  const withArmor = decks.filter((d) => d.armor !== "").length;
  console.log("Wrote src/data/deck-lists.ts: " + decks.length + " decks, " + withArmor + " with armor side decks");
}
