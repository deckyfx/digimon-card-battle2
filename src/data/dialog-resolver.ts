import type { PlayerProfile } from "@src/store/profile-store";
import type { Actor } from "@src/data/actors";
import type { DeckList } from "@src/data/deck-lists";
import type { PrizePack } from "@src/data/prize-packs";
import type { City } from "@src/data/cities";
import type { MasterCard } from "@src/types";

/** Visual category of a resolved template variable — drives color in the UI. */
export type SegmentKind = "text" | "player" | "actor" | "deck" | "pack" | "card" | "city";

export interface DialogSegment {
  kind: SegmentKind;
  value: string;
}

export interface DialogContext {
  player: PlayerProfile;
  actorById: (id: number) => Actor | null | undefined;
  deckById: (id: number) => DeckList | null | undefined;
  /** Numeric pack id (1=Basic … 16=S-Option). */
  packById: (id: number) => PrizePack | null | undefined;
  cardByNumber: (num: string) => MasterCard | null | undefined;
  cityById: (id: string) => City | null | undefined;
  /** Name of the city containing the given actor, if any. */
  actorCityName: (actorId: number) => string | undefined;
}

/**
 * Parses a dialog message into typed segments for colored rendering.
 * Unknown tokens are emitted as `text` segments so they stay visible
 * during authoring.
 *
 * Supported tokens:
 *   ${player.name}              — player's name             [player]
 *   ${actor[N].name}            — actor name by id          [actor]
 *   ${actor[N].prize.name}      — actor's prize pack name   [pack]
 *   ${actor[N].city.name}       — city the actor belongs to [city]
 *   ${deck[N].name}             — deck name by id           [deck]
 *   ${deck[N].description}      — deck flavor text          [deck]
 *   ${prizepack[N].name}        — prize pack name (numeric) [pack]
 *   ${card[NNN].name}           — master card name          [card]
 *   ${city[id].name}            — city name by string id    [city]
 */
export function resolveSegments(message: string, ctx: DialogContext): DialogSegment[] {
  const segments: DialogSegment[] = [];
  let last = 0;

  const re = /\$\{([^}]+)\}/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(message)) !== null) {
    if (m.index > last) {
      segments.push({ kind: "text", value: message.slice(last, m.index) });
    }

    const full = m[0] ?? "";
    const expr = m[1] ?? "";
    const resolved = resolveExpr(expr, full, ctx);
    segments.push(resolved);
    last = m.index + full.length;
  }

  if (last < message.length) {
    segments.push({ kind: "text", value: message.slice(last) });
  }

  return segments;
}

function resolveExpr(expr: string, full: string, ctx: DialogContext): DialogSegment {
  const fallback: DialogSegment = { kind: "text", value: full };

  // ${player.name}
  if (expr === "player.name") {
    return { kind: "player", value: ctx.player.name };
  }

  // ${actor[N].prize.name}  — resolved via the actor's primary deck
  const actorPrizeM = expr.match(/^actor\[(\d+)\]\.prize\.name$/);
  if (actorPrizeM) {
    const actor = ctx.actorById(Number(actorPrizeM[1]));
    const primaryDeckId = actor?.deckIds[0];
    if (primaryDeckId !== undefined) {
      const deck = ctx.deckById(primaryDeckId);
      if (deck) {
        const pack = ctx.packById(deck.prizePack);
        if (pack) return { kind: "pack", value: pack.name };
      }
    }
    return fallback;
  }

  // ${actor[N].city.name}
  const actorCityM = expr.match(/^actor\[(\d+)\]\.city\.name$/);
  if (actorCityM) {
    const name = ctx.actorCityName(Number(actorCityM[1]));
    if (name) return { kind: "city", value: name };
    return fallback;
  }

  // ${actor[N].field}
  const actorM = expr.match(/^actor\[(\d+)\]\.(\w+)$/);
  if (actorM) {
    const actor = ctx.actorById(Number(actorM[1]));
    if (actor) {
      if (actorM[2] === "name") return { kind: "actor", value: actor.name };
    }
    return fallback;
  }

  // ${deck[N].field}
  const deckM = expr.match(/^deck\[(\d+)\]\.(\w+)$/);
  if (deckM) {
    const deck = ctx.deckById(Number(deckM[1]));
    if (deck) {
      if (deckM[2] === "name") return { kind: "deck", value: deck.name };
      if (deckM[2] === "description" && deck.description) return { kind: "deck", value: deck.description };
    }
    return fallback;
  }

  // ${prizepack[N].name}  (N is the numeric pack id)
  const packM = expr.match(/^prizepack\[(\d+)\]\.name$/);
  if (packM) {
    const pack = ctx.packById(Number(packM[1]));
    if (pack) return { kind: "pack", value: pack.name };
    return fallback;
  }

  // ${card[NNN].name}
  const cardM = expr.match(/^card\[(\d+)\]\.name$/);
  if (cardM) {
    const num = (cardM[1] ?? "").padStart(3, "0");
    const card = ctx.cardByNumber(num);
    if (card) return { kind: "card", value: card.name };
    return fallback;
  }

  // ${city[id].name}  (id is the string city id, e.g. "beginner")
  const cityM = expr.match(/^city\[([a-z-]+)\]\.name$/);
  if (cityM) {
    const city = ctx.cityById(cityM[1] ?? "");
    if (city) return { kind: "city", value: city.name };
    return fallback;
  }

  return fallback;
}

/** Convenience: collapse segments to a plain string (for non-UI use). */
export function resolveMessage(message: string, ctx: DialogContext): string {
  return resolveSegments(message, ctx)
    .map((s) => s.value)
    .join("");
}
