import { MASTER_CARDS } from "@src/data/master-cards";
import { ARMOR_PARTNER } from "@src/data/armor";
import { DECK_LISTS } from "@src/data/deck-lists";
import { DIGIPARTS } from "@src/data/digiparts";
import {
  partnerLevelFromExp,
  PARTNER_PROGRESSIONS,
  PARTNERS,
  type PartnerId,
} from "@src/data/partners";
import { CardLevel } from "@src/types";
import {
  DECK_SIZE,
  MAX_COPIES,
  MAX_NAME_LENGTH,
  type CustomDeck,
} from "./custom-deck-store";
import type { StorageProvider } from "./storage-provider";

/**
 * Runtime state for one unlocked partner Digimon on a profile.
 * Level and stat bonuses are always derived from `totalExp`; they are
 * re-computed from scratch by {@link ProfileStore.setPartnerExp}.
 */
export interface PartnerState {
  id: PartnerId;
  /** Total accumulated EXP (0 to 9999). Level is derived from this. */
  totalExp: number;
  /** Stat bonuses accumulated from level-ups (+10 each, max 200 per stat). */
  bonusHp: number;
  bonusCircle: number;
  bonusTriangle: number;
  bonusCross: number;
  /** DigiPart ids owned by this partner. */
  ownedDigiparts: number[];
  /** Currently equipped DigiPart ids (max 3). */
  equippedDigiparts: number[];
  /** Equipped armor card number (null = none chosen). */
  armor: string | null;
}

/** A player profile: identity + owned cards + up to 3 built decks. */
export interface PlayerProfile {
  id: string;
  /** Display name (max 20 chars). */
  name: string;
  /** Actor id whose portrait is this profile's avatar. */
  avatarActorId: number;
  /**
   * The card bag — every card the player owns, as card number → copy
   * count (max {@link MAX_BAG_COPIES} each). Bag cards are SHADOW-CLONED
   * into decks: a deck reserves nothing, it just may not use more copies
   * of a card than the bag owns — so 1 owned Agumon can appear once in
   * every saved deck simultaneously.
   */
  bag: Record<string, number>;
  /** Built decks (max {@link MAX_DECKS}); same shape as custom decks. */
  decks: CustomDeck[];
  /** Accumulated experience points (earned by defeating duelists). */
  exp: number;
  /** Win/loss tallies per opponent actor id (drives city unlocks). */
  records: BattleRecords;
  /**
   * Persistent story flags set by CafeBattle.onWin and checked by the
   * progression engine. Keys are free-form strings (e.g. "betamon_tutorial_defeated").
   */
  flags: Record<string, boolean>;
  /**
   * City cafe rosters overridden by progression (cityId → cafeBattleIds).
   * If absent for a city the static city.cafeBattleIds is used instead.
   */
  cityRosters: Record<string, number[]>;
  /**
   * Active partners (max 3). Ordered: first = primary.
   * Partners are unlocked via {@link ProfileStore.unlockPartner}.
   */
  partners: PartnerState[];
  createdAt: string;
  updatedAt: string;
}

/** One opponent's tally against this profile. */
export interface ActorRecord {
  wins: number;
  losses: number;
}

/** Win/loss tallies keyed by opponent actor id. */
export type BattleRecords = Record<number, ActorRecord>;

/** A profile may keep at most this many built decks. */
export const MAX_DECKS = 3;
/** The bag holds at most this many copies of each card. */
export const MAX_BAG_COPIES = 6;
/** Profile names are short labels. */
export const MAX_PROFILE_NAME = 20;

const CARD_BY_NUMBER = new Map(MASTER_CARDS.map((c) => [c.number, c]));

/** Prebuilt decks selectable as a new profile's starter (note-tagged). */
export function starterDecks() {
  return DECK_LISTS.filter((d) => /starting deck/i.test(d.note));
}

/**
 * Semi-random reserve cards per starter deck (game-guide accurate): each
 * pair grants ONE of its two card numbers, coin-flipped at profile
 * creation. Reserves go to the bag only — not into the starting deck.
 */
const STARTER_RESERVES: Record<number, [string, string][]> = {
  121: [
    // Red Deck
    ["011", "116"], // Meteormon | Andromon
    ["025", "131"], // BomberNanimon | Zassomon
    ["028", "137"], // Solarmon | Aruraumon
    ["031", "138"], // Candlemon | Sharmamon
    ["258", "249"], // Fire Spot | Circle Hitter
  ],
  122: [
    // Green Deck
    ["080", "150"], // Piximon | Etemon
    ["096", "164"], // MoriShellmon | SandYanmamon
    ["098", "166"], // Palmon | Hagurumon
    ["100", "171"], // Elecmon | ModokiBetamon
    ["265", "250"], // High Speed Disk | Triangle Hitter
  ],
  123: [
    // Yellow Deck
    ["045", "149"], // BlueMeramon | Mamemon
    ["060", "160"], // Icemon | Geremon
    ["065", "167"], // Gizamon | ToyAgumon
    ["068", "169"], // SnowGoburimon | Vi-Elecmon
    ["259", "251"], // Ice Crystal | Cross Hitter
  ],
};

/** Unique-enough id (crypto.randomUUID is unavailable over LAN http). */
function generateId(): string {
  return (
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10)
  );
}

const cardName = (n: string) => CARD_BY_NUMBER.get(n)?.name ?? n;

/**
 * CRUD + rules for player profiles. Pure logic — persistence goes through
 * the injected {@link StorageProvider}. Replaces free-form deck building:
 * every deck must be assembled from the profile's owned card bag.
 */
export class ProfileStore {
  constructor(
    private readonly provider: StorageProvider,
    private readonly key = "dcb:profiles",
  ) {}

  /** All profiles, newest first. */
  list(): PlayerProfile[] {
    const raw = this.provider.get(this.key);
    if (!raw) return [];
    try {
      const profiles = JSON.parse(raw) as PlayerProfile[];
      if (!Array.isArray(profiles)) return [];
      // Migrate profiles from before exp / record tracking (the short-lived
      // `defeated` win-count map becomes win-only records).
      return profiles.map((raw) => {
        const p = raw as PlayerProfile & { defeated?: Record<number, number> };
        let records: BattleRecords = p.records ?? {};
        if (!p.records && p.defeated) {
          records = Object.fromEntries(
            Object.entries(p.defeated).map(([id, wins]) => [
              Number(id),
              { wins, losses: 0 },
            ]),
          );
        }
        const { defeated: _legacy, ...rest } = p;
        return { ...rest, exp: p.exp ?? 0, records, flags: p.flags ?? {}, cityRosters: p.cityRosters ?? {}, partners: p.partners ?? [] };
      });
    } catch {
      return [];
    }
  }

  get(id: string): PlayerProfile | null {
    return this.list().find((p) => p.id === id) ?? null;
  }

  /**
   * Creates a profile: the chosen starter deck's 30 cards are granted to
   * the bag and assembled as the profile's first deck.
   */
  create(input: {
    name: string;
    avatarActorId: number;
    starterDeckId: number;
  }): PlayerProfile {
    const name = input.name.trim();
    if (!name) throw new Error("Profile name is required.");
    if (name.length > MAX_PROFILE_NAME)
      throw new Error(
        `Profile name must be ${MAX_PROFILE_NAME} characters or fewer.`,
      );
    const clash = this.list().find(
      (p) => p.name.toLowerCase() === name.toLowerCase(),
    );
    if (clash)
      throw new Error(`A profile named "${clash.name}" already exists.`);

    const starter = starterDecks().find((d) => d.id === input.starterDeckId);
    if (!starter) throw new Error("Pick a starter deck.");

    // Starter cards + five semi-random reserves (one coin-flip per pair).
    const reserves = (STARTER_RESERVES[starter.id] ?? []).map(
      (pair) => pair[Math.random() < 0.5 ? 0 : 1],
    );
    const bag: Record<string, number> = {};
    for (const n of [...starter.cardNumbers, ...starter.armors, ...reserves]) {
      bag[n] = Math.min(MAX_BAG_COPIES, (bag[n] ?? 0) + 1);
    }

    const now = new Date().toISOString();
    const profile: PlayerProfile = {
      id: generateId(),
      name,
      avatarActorId: input.avatarActorId,
      bag,
      decks: [
        {
          id: generateId(),
          name: starter.name.slice(0, MAX_NAME_LENGTH),
          cardNumbers: [...starter.cardNumbers],
          ...(starter.armors.length > 0 ? { armors: [...starter.armors] } : {}),
          updatedAt: now,
        },
      ],
      exp: 0,
      records: {},
      flags: {},
      cityRosters: {},
      partners: [],
      createdAt: now,
      updatedAt: now,
    };
    this.persist([profile, ...this.list()]);
    return profile;
  }

  delete(id: string): boolean {
    const profiles = this.list();
    const next = profiles.filter((p) => p.id !== id);
    if (next.length === profiles.length) return false;
    this.persist(next);
    return true;
  }

  /** Copies of `cardNumber` the profile owns. */
  owned(profile: PlayerProfile, cardNumber: string): number {
    return profile.bag[cardNumber] ?? 0;
  }

  /** Career totals across every opponent. */
  totalRecord(profile: PlayerProfile): ActorRecord {
    let wins = 0;
    let losses = 0;
    for (const rec of Object.values(profile.records)) {
      wins += rec.wins;
      losses += rec.losses;
    }
    return { wins, losses };
  }

  /** Records a match result against an actor (win AND loss are tracked). */
  recordResult(
    profileId: string,
    actorId: number,
    won: boolean,
  ): PlayerProfile {
    const profile = this.require(profileId);
    const rec = profile.records[actorId] ?? { wins: 0, losses: 0 };
    if (won) rec.wins++;
    else rec.losses++;
    profile.records[actorId] = rec;
    return this.update(profile);
  }

  /** Adds experience points to the profile's running total. */
  addExp(profileId: string, amount: number): PlayerProfile {
    const profile = this.require(profileId);
    profile.exp = (profile.exp ?? 0) + Math.max(0, amount);
    return this.update(profile);
  }

  /** Grants cards to the bag, capped at {@link MAX_BAG_COPIES} copies each. */
  grantCards(profileId: string, cardNumbers: string[]): PlayerProfile {
    const profile = this.require(profileId);
    for (const n of cardNumbers) {
      if (!CARD_BY_NUMBER.has(n)) continue;
      profile.bag[n] = Math.min(MAX_BAG_COPIES, (profile.bag[n] ?? 0) + 1);
    }
    return this.update(profile);
  }

  /**
   * Validates a deck against the global rules AND the profile's bag.
   * Returns human-readable problems; an empty array means legal.
   */
  validateDeck(
    profile: PlayerProfile,
    cardNumbers: string[],
    armors?: string[],
  ): string[] {
    const errors: string[] = [];
    if (cardNumbers.length !== DECK_SIZE) {
      errors.push(
        `Deck must have exactly ${DECK_SIZE} cards (currently ${cardNumbers.length}).`,
      );
    }

    const copies = new Map<string, number>();
    for (const n of cardNumbers) {
      const card = CARD_BY_NUMBER.get(n);
      if (!card) {
        errors.push(`Unknown card number: ${n}`);
        continue;
      }
      if (card.level === CardLevel.A) {
        errors.push(
          `${card.name} is an Armor card — it can only be the hidden side deck, not a main-deck card.`,
        );
        continue;
      }
      copies.set(n, (copies.get(n) ?? 0) + 1);
    }
    for (const [n, count] of copies) {
      if (count > MAX_COPIES) {
        errors.push(
          `Max ${MAX_COPIES} copies of the same card — ${cardName(n)} has ${count}.`,
        );
      }
      if (count > this.owned(profile, n)) {
        errors.push(
          `You only own ${this.owned(profile, n)}× ${cardName(n)} (deck uses ${count}).`,
        );
      }
    }

    const armorsByPartner = new Map<string, string>();
    for (const armor of armors ?? []) {
      const partner = ARMOR_PARTNER[armor];
      if (!partner) {
        errors.push(`${cardName(armor)} is not a valid armor side-deck card.`);
        continue;
      }
      if (this.owned(profile, armor) < 1) {
        errors.push(`You do not own ${cardName(armor)}.`);
      }
      if (!cardNumbers.includes(partner)) {
        errors.push(
          `Armor ${cardName(armor)} requires its partner ${cardName(partner)} in the deck.`,
        );
      }
      if (armorsByPartner.has(partner)) {
        errors.push(
          `Only one armor per partner — ${cardName(partner)} cannot bring two.`,
        );
      } else {
        armorsByPartner.set(partner, armor);
      }
    }
    return errors;
  }

  /** Creates or updates one of the profile's decks (upsert by deck id). */
  saveDeck(
    profileId: string,
    deck: {
      id?: string;
      name: string;
      cardNumbers: string[];
      armors?: string[];
    },
  ): PlayerProfile {
    const profile = this.require(profileId);
    const name = deck.name.trim();
    if (!name) throw new Error("Deck name is required.");
    if (name.length > MAX_NAME_LENGTH)
      throw new Error(
        `Deck name must be ${MAX_NAME_LENGTH} characters or fewer.`,
      );
    const errors = this.validateDeck(profile, deck.cardNumbers, deck.armors);
    if (errors.length > 0) throw new Error(errors.join(" "));

    const isNew = !deck.id || !profile.decks.some((d) => d.id === deck.id);
    if (isNew && profile.decks.length >= MAX_DECKS) {
      throw new Error(
        `A profile keeps at most ${MAX_DECKS} decks — delete one first.`,
      );
    }
    const clash = profile.decks.find(
      (d) => d.id !== deck.id && d.name.toLowerCase() === name.toLowerCase(),
    );
    if (clash) throw new Error(`A deck named "${clash.name}" already exists.`);

    const saved: CustomDeck = {
      id: deck.id ?? generateId(),
      name,
      cardNumbers: [...deck.cardNumbers],
      ...(deck.armors && deck.armors.length > 0
        ? { armors: [...deck.armors] }
        : {}),
      updatedAt: new Date().toISOString(),
    };
    const idx = profile.decks.findIndex((d) => d.id === saved.id);
    if (idx >= 0) profile.decks[idx] = saved;
    else profile.decks.push(saved);
    return this.update(profile);
  }

  deleteDeck(profileId: string, deckId: string): PlayerProfile {
    const profile = this.require(profileId);
    if (profile.decks.length <= 1) {
      throw new Error("A profile must keep at least one deck.");
    }
    profile.decks = profile.decks.filter((d) => d.id !== deckId);
    return this.update(profile);
  }

  /** Moves the given deck to position 0 (the "default" used on profile select). */
  setDefaultDeck(profileId: string, deckId: string): PlayerProfile {
    const profile = this.require(profileId);
    const idx = profile.decks.findIndex((d) => d.id === deckId);
    if (idx <= 0) return profile;
    const [deck] = profile.decks.splice(idx, 1) as [CustomDeck];
    profile.decks.unshift(deck);
    return this.update(profile);
  }

  setFlag(profileId: string, key: string, value: boolean): PlayerProfile {
    const profile = this.require(profileId);
    profile.flags = { ...profile.flags, [key]: value };
    return this.update(profile);
  }

  applyCityRoster(profileId: string, cityId: string, cafeBattleIds: number[]): PlayerProfile {
    const profile = this.require(profileId);
    profile.cityRosters = { ...profile.cityRosters, [cityId]: cafeBattleIds };
    return this.update(profile);
  }

  // ---------------------------------------------------------------------------
  // Partner management
  // ---------------------------------------------------------------------------

  /**
   * Returns the partner state for this profile, or null if not yet unlocked.
   *
   * @param profileId - Profile id.
   * @param partnerId - The partner to look up.
   */
  getPartner(profileId: string, partnerId: PartnerId): PartnerState | null {
    const profile = this.require(profileId);
    return profile.partners.find((p) => p.id === partnerId) ?? null;
  }

  /**
   * Unlocks a partner for the profile (adds to `profile.partners` if not
   * already present, up to a maximum of 3 partners).
   *
   * @param profileId - Profile id.
   * @param partnerId - The partner to unlock.
   * @returns The updated profile.
   */
  unlockPartner(profileId: string, partnerId: PartnerId): PlayerProfile {
    // Verify partnerId is valid.
    PARTNERS.find((p) => p.id === partnerId); // throws if not found via getPartnerById
    const profile = this.require(profileId);
    if (profile.partners.some((p) => p.id === partnerId)) return profile;
    if (profile.partners.length >= 3) {
      throw new Error("A profile can hold at most 3 partners.");
    }
    const newPartner: PartnerState = {
      id: partnerId,
      totalExp: 0,
      bonusHp: 0,
      bonusCircle: 0,
      bonusTriangle: 0,
      bonusCross: 0,
      ownedDigiparts: [],
      equippedDigiparts: [],
      armor: null,
    };
    profile.partners = [...profile.partners, newPartner];
    return this.update(profile);
  }

  /**
   * Sets a partner's total EXP directly and recalculates all stat bonuses
   * from scratch based on the new level. Useful for debug / grant-exp flows.
   *
   * Stat bonuses: each level transition in {@link PARTNER_LEVEL_STAT_SEQUENCE}
   * that is non-null awards +10 to the corresponding stat, capped at 200.
   *
   * @param profileId - Profile id.
   * @param partnerId - The partner to update.
   * @param totalExp - New total EXP (clamped to 0–9999).
   * @returns The updated profile.
   */
  setPartnerExp(
    profileId: string,
    partnerId: PartnerId,
    totalExp: number,
  ): PlayerProfile {
    const profile = this.require(profileId);
    const partner = profile.partners.find((p) => p.id === partnerId);
    if (!partner) throw new Error(`Partner "${partnerId}" is not unlocked on this profile.`);

    const clampedExp = Math.max(0, Math.min(9999, totalExp));
    partner.totalExp = clampedExp;

    // Recalculate stat bonuses and earned DigiParts from scratch.
    const newLevel = partnerLevelFromExp(clampedExp);
    const progression = PARTNER_PROGRESSIONS[partnerId];
    let hp = 0, circle = 0, triangle = 0, cross = 0;
    const earnedDigiparts = new Set<number>(partner.ownedDigiparts);
    // Transitions k=0...(newLevel-2) have been crossed (k = Lv(k+1)→Lv(k+2)).
    for (let k = 0; k < newLevel - 1; k++) {
      const reward = progression[k];
      if (!reward) continue;
      if (reward.type === "stat") {
        if (reward.stat === "hp") hp += 10;
        else if (reward.stat === "circle") circle += 10;
        else if (reward.stat === "triangle") triangle += 10;
        else if (reward.stat === "cross") cross += 10;
      } else {
        earnedDigiparts.add(reward.id);
      }
    }
    partner.bonusHp = Math.min(200, hp);
    partner.bonusCircle = Math.min(200, circle);
    partner.bonusTriangle = Math.min(200, triangle);
    partner.bonusCross = Math.min(200, cross);
    partner.ownedDigiparts = Array.from(earnedDigiparts);

    return this.update(profile);
  }

  /**
   * Grants a DigiPart to a partner (adds to `ownedDigiparts` if not already
   * present).
   *
   * @param profileId - Profile id.
   * @param partnerId - The partner receiving the DigiPart.
   * @param digipartId - DigiPart id (0–127).
   * @returns The updated profile.
   */
  grantDigipart(
    profileId: string,
    partnerId: PartnerId,
    digipartId: number,
  ): PlayerProfile {
    const profile = this.require(profileId);
    const partner = profile.partners.find((p) => p.id === partnerId);
    if (!partner) throw new Error(`Partner "${partnerId}" is not unlocked on this profile.`);
    if (!DIGIPARTS[digipartId]) throw new Error(`Unknown DigiPart id: ${digipartId}`);
    if (!partner.ownedDigiparts.includes(digipartId)) {
      partner.ownedDigiparts = [...partner.ownedDigiparts, digipartId];
    }
    return this.update(profile);
  }

  /**
   * Equips a DigiPart on a partner. Enforces:
   * - Max 3 equipped parts at once.
   * - No two parts of the same group can be equipped simultaneously.
   * - The part must be owned by the partner.
   *
   * @param profileId - Profile id.
   * @param partnerId - The partner equipping the DigiPart.
   * @param digipartId - DigiPart id (0–127).
   * @returns An error string describing the problem, or null on success.
   */
  equipDigipart(
    profileId: string,
    partnerId: PartnerId,
    digipartId: number,
  ): string | null {
    const profile = this.require(profileId);
    const partner = profile.partners.find((p) => p.id === partnerId);
    if (!partner) return `Partner "${partnerId}" is not unlocked on this profile.`;

    const part = DIGIPARTS[digipartId];
    if (!part) return `Unknown DigiPart id: ${digipartId}`;
    if (!partner.ownedDigiparts.includes(digipartId)) {
      return `Partner does not own DigiPart "${part.name}".`;
    }
    if (partner.equippedDigiparts.includes(digipartId)) {
      return null; // Already equipped — idempotent.
    }
    if (partner.equippedDigiparts.length >= 3) {
      return "Cannot equip more than 3 DigiParts at once.";
    }

    // Check group conflict.
    for (const equippedId of partner.equippedDigiparts) {
      const equipped = DIGIPARTS[equippedId];
      if (equipped && equipped.group === part.group) {
        return `Cannot equip two DigiParts of the same group ("${part.group}"): already have "${equipped.name}".`;
      }
    }

    partner.equippedDigiparts = [...partner.equippedDigiparts, digipartId];
    this.update(profile);
    return null;
  }

  /**
   * Unequips a DigiPart from a partner. No-ops if the part is not equipped.
   *
   * @param profileId - Profile id.
   * @param partnerId - The partner unequipping the DigiPart.
   * @param digipartId - DigiPart id (0–127).
   * @returns The updated profile.
   */
  unequipDigipart(
    profileId: string,
    partnerId: PartnerId,
    digipartId: number,
  ): PlayerProfile {
    const profile = this.require(profileId);
    const partner = profile.partners.find((p) => p.id === partnerId);
    if (!partner) throw new Error(`Partner "${partnerId}" is not unlocked on this profile.`);
    partner.equippedDigiparts = partner.equippedDigiparts.filter(
      (id) => id !== digipartId,
    );
    return this.update(profile);
  }

  /**
   * Sets the partner's chosen armor card number. Pass null to clear.
   *
   * @param profileId - Profile id.
   * @param partnerId - The partner to update.
   * @param armorNumber - An armor card number string, or null to clear.
   * @returns The updated profile.
   */
  setPartnerArmor(
    profileId: string,
    partnerId: PartnerId,
    armorNumber: string | null,
  ): PlayerProfile {
    const profile = this.require(profileId);
    const partner = profile.partners.find((p) => p.id === partnerId);
    if (!partner) throw new Error(`Partner "${partnerId}" is not unlocked on this profile.`);
    partner.armor = armorNumber;
    return this.update(profile);
  }

  private require(id: string): PlayerProfile {
    const profile = this.get(id);
    if (!profile) throw new Error("Profile not found.");
    return profile;
  }

  private update(profile: PlayerProfile): PlayerProfile {
    profile.updatedAt = new Date().toISOString();
    const profiles = this.list();
    const idx = profiles.findIndex((p) => p.id === profile.id);
    if (idx >= 0) profiles[idx] = profile;
    else profiles.unshift(profile);
    this.persist(profiles);
    return profile;
  }

  private persist(profiles: PlayerProfile[]): void {
    this.provider.set(this.key, JSON.stringify(profiles));
  }
}
