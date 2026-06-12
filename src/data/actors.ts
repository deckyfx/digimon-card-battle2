/**
 * Actors: every portrait in /assets/potraits bound to the decks they own.
 * Generated from the portrait sheet order + deck-lists owners; ids match
 * portrait file names (00.png …). Player actors use custom decks instead.
 */

export interface Actor {
  /** Portrait index — matches /assets/potraits/<id>.png. */
  id: number;
  name: string;
  portrait: string;
  /** Prebuilt deck ids this actor owns (empty for player actors). */
  deckIds: number[];
  /**
   * Base experience awarded for defeating this actor (game-guide values).
   * Where the guide lists per-deck values, this is the repeatable base —
   * one-time first-deck bonuses are a future campaign mechanic. 0 for
   * player actors.
   */
  exp: number;
  /**
   * Prize pack id awarded for defeating this actor (see
   * src/data/prize-packs.ts). Undefined = not yet specified by the guide
   * data — to be filled with sensible defaults.
   */
  prizePack?: string;
  /** Bonus card numbers granted directly on defeat (e.g. Apokarimon #103). */
  prizeCards?: string[];
  /** Player actors are controlled by the human and use custom decks. */
  isPlayer: boolean;
}

export const ACTORS: Actor[] = [
  { id: 0, name: "Player", portrait: "/assets/potraits/00.png", deckIds: [], exp: 0, isPlayer: true },
  { id: 1, name: "Player (Variant)", portrait: "/assets/potraits/01.png", deckIds: [], exp: 0, isPlayer: false },
  { id: 2, name: "Betamon", portrait: "/assets/potraits/02.png", deckIds: [1,137,138], exp: 2, isPlayer: false },
  { id: 3, name: "Agumon", portrait: "/assets/potraits/03.png", deckIds: [2], exp: 3, isPlayer: false },
  { id: 4, name: "Penguinmon", portrait: "/assets/potraits/04.png", deckIds: [3], exp: 4, isPlayer: false },
  { id: 5, name: "Babamon", portrait: "/assets/potraits/05.png", deckIds: [4], exp: 5, isPlayer: false },
  { id: 6, name: "Meramon", portrait: "/assets/potraits/06.png", deckIds: [5], exp: 4, isPlayer: false },
  { id: 7, name: "Phoenixmon", portrait: "/assets/potraits/07.png", deckIds: [6], exp: 4, isPlayer: false },
  { id: 8, name: "Veemon", portrait: "/assets/potraits/08.png", deckIds: [7,121], exp: 5, isPlayer: false },
  { id: 9, name: "Vegiemon", portrait: "/assets/potraits/09.png", deckIds: [8], exp: 5, isPlayer: false },
  { id: 10, name: "Ninjamon", portrait: "/assets/potraits/10.png", deckIds: [9], exp: 5, isPlayer: false },
  { id: 11, name: "Veedramon", portrait: "/assets/potraits/11.png", deckIds: [10], exp: 6, isPlayer: false },
  { id: 12, name: "Wormmon", portrait: "/assets/potraits/12.png", deckIds: [11,20], exp: 5, isPlayer: false },
  { id: 13, name: "Frigimon", portrait: "/assets/potraits/13.png", deckIds: [12], exp: 5, isPlayer: false },
  { id: 14, name: "Whamon", portrait: "/assets/potraits/14.png", deckIds: [13], exp: 5, isPlayer: false },
  { id: 15, name: "Garurumon", portrait: "/assets/potraits/15.png", deckIds: [14], exp: 6, isPlayer: false },
  { id: 16, name: "Stingmon", portrait: "/assets/potraits/16.png", deckIds: [15,21], exp: 6, isPlayer: false },
  { id: 17, name: "Hagurumon", portrait: "/assets/potraits/17.png", deckIds: [16], exp: 5, isPlayer: false },
  { id: 18, name: "ShellNumemon", portrait: "/assets/potraits/18.png", deckIds: [17], exp: 5, isPlayer: false },
  { id: 19, name: "KingSukamon", portrait: "/assets/potraits/19.png", deckIds: [18], exp: 6, isPlayer: false },
  { id: 20, name: "Shadramon", portrait: "/assets/potraits/20.png", deckIds: [19,22], exp: 7, isPlayer: false },
  { id: 21, name: "Quetzalmon", portrait: "/assets/potraits/21.png", deckIds: [23], exp: 8, isPlayer: false },
  { id: 22, name: "Digimon Emperor", portrait: "/assets/potraits/22.png", deckIds: [24], exp: 15, isPlayer: false },
  { id: 23, name: "Centarumon", portrait: "/assets/potraits/23.png", deckIds: [25], exp: 5, isPlayer: false },
  { id: 24, name: "Tyrannomon", portrait: "/assets/potraits/24.png", deckIds: [26], exp: 6, isPlayer: false },
  { id: 25, name: "Angemon", portrait: "/assets/potraits/25.png", deckIds: [27], exp: 7, isPlayer: false },
  { id: 26, name: "Davis", portrait: "/assets/potraits/26.png", deckIds: [28,124,125,126], exp: 8, prizePack: "red", isPlayer: false },
  { id: 27, name: "Keely", portrait: "/assets/potraits/27.png", deckIds: [29,127,128], exp: 8, prizePack: "green", isPlayer: false },
  { id: 28, name: "Cody", portrait: "/assets/potraits/28.png", deckIds: [30,129,130], exp: 8, prizePack: "blue", isPlayer: false },
  { id: 29, name: "T.K.", portrait: "/assets/potraits/29.png", deckIds: [31,131,132], exp: 7, prizePack: "green", isPlayer: false },
  { id: 30, name: "Wizardmon", portrait: "/assets/potraits/30.png", deckIds: [32], exp: 6, isPlayer: false },
  { id: 31, name: "AeroVeedramon", portrait: "/assets/potraits/31.png", deckIds: [33], exp: 7, isPlayer: false },
  { id: 32, name: "Gatomon", portrait: "/assets/potraits/32.png", deckIds: [34], exp: 8, isPlayer: false },
  { id: 33, name: "Kari", portrait: "/assets/potraits/33.png", deckIds: [35,133,134], exp: 8, prizePack: "green", isPlayer: false },
  { id: 34, name: "Goburimon", portrait: "/assets/potraits/34.png", deckIds: [36], exp: 5, isPlayer: false },
  { id: 35, name: "DemiDevimon", portrait: "/assets/potraits/35.png", deckIds: [37], exp: 6, isPlayer: false },
  { id: 36, name: "Megadramon", portrait: "/assets/potraits/36.png", deckIds: [38], exp: 7, isPlayer: false },
  { id: 37, name: "Gigadramon", portrait: "/assets/potraits/37.png", deckIds: [39], exp: 8, isPlayer: false },
  { id: 38, name: "Togemon", portrait: "/assets/potraits/38.png", deckIds: [40], exp: 8, isPlayer: false },
  { id: 39, name: "Kabuterimon", portrait: "/assets/potraits/39.png", deckIds: [41], exp: 8, isPlayer: false },
  { id: 40, name: "Ikkakumon", portrait: "/assets/potraits/40.png", deckIds: [42], exp: 8, isPlayer: false },
  { id: 41, name: "Birdramon", portrait: "/assets/potraits/41.png", deckIds: [43], exp: 8, isPlayer: false },
  { id: 42, name: "WereGarurumon", portrait: "/assets/potraits/42.png", deckIds: [44], exp: 8, isPlayer: false },
  { id: 43, name: "MetalGreymon", portrait: "/assets/potraits/43.png", deckIds: [45], exp: 8, isPlayer: false },
  { id: 44, name: "Tuskmon", portrait: "/assets/potraits/44.png", deckIds: [46], exp: 8, isPlayer: false },
  { id: 45, name: "Phantomon", portrait: "/assets/potraits/45.png", deckIds: [47], exp: 8, isPlayer: false },
  { id: 46, name: "MegaSeadramon", portrait: "/assets/potraits/46.png", deckIds: [48], exp: 8, isPlayer: false },
  { id: 47, name: "VenomMyotismon", portrait: "/assets/potraits/47.png", deckIds: [49], exp: 10, prizePack: "s-black", isPlayer: false },
  { id: 48, name: "Leomon", portrait: "/assets/potraits/48.png", deckIds: [50], exp: 8, isPlayer: false },
  { id: 49, name: "Devimon", portrait: "/assets/potraits/49.png", deckIds: [51], exp: 9, isPlayer: false },
  { id: 50, name: "MetalEtemon", portrait: "/assets/potraits/50.png", deckIds: [52], exp: 9, isPlayer: false },
  { id: 51, name: "Myotismon", portrait: "/assets/potraits/51.png", deckIds: [53], exp: 10, prizePack: "s-black", isPlayer: false },
  { id: 52, name: "Greymon", portrait: "/assets/potraits/52.png", deckIds: [54], exp: 8, prizePack: "option", isPlayer: false },
  { id: 53, name: "ExVeemon", portrait: "/assets/potraits/53.png", deckIds: [55], exp: 8, isPlayer: false },
  { id: 54, name: "Flamedramon", portrait: "/assets/potraits/54.png", deckIds: [56], exp: 9, isPlayer: false },
  { id: 55, name: "Raidramon", portrait: "/assets/potraits/55.png", deckIds: [57], exp: 10, prizePack: "red", isPlayer: false },
  { id: 56, name: "Hawkmon", portrait: "/assets/potraits/56.png", deckIds: [58,122], exp: 8, isPlayer: false },
  { id: 57, name: "Aquilamon", portrait: "/assets/potraits/57.png", deckIds: [59], exp: 8, isPlayer: false },
  { id: 58, name: "Halsemon", portrait: "/assets/potraits/58.png", deckIds: [60], exp: 10, prizePack: "green", isPlayer: false },
  { id: 59, name: "Armadillomon", portrait: "/assets/potraits/59.png", deckIds: [61,123], exp: 8, isPlayer: false },
  { id: 60, name: "Ankylomon", portrait: "/assets/potraits/60.png", deckIds: [62], exp: 9, isPlayer: false },
  { id: 61, name: "Digmon", portrait: "/assets/potraits/61.png", deckIds: [63], exp: 10, prizePack: "yellow", isPlayer: false },
  { id: 62, name: "Thundermon", portrait: "/assets/potraits/62.png", deckIds: [64], exp: 8, isPlayer: false },
  { id: 63, name: "MetalMamemon", portrait: "/assets/potraits/63.png", deckIds: [65], exp: 9, isPlayer: false },
  { id: 64, name: "SuperStarmon", portrait: "/assets/potraits/64.png", deckIds: [66], exp: 10, prizePack: "s-yellow", isPlayer: false },
  { id: 65, name: "Bakemon", portrait: "/assets/potraits/65.png", deckIds: [67], exp: 8, isPlayer: false },
  { id: 66, name: "Devimon (Variant)", portrait: "/assets/potraits/66.png", deckIds: [68], exp: 9, isPlayer: false },
  { id: 67, name: "SkullGreymon", portrait: "/assets/potraits/67.png", deckIds: [69], exp: 10, isPlayer: false },
  { id: 68, name: "Myotismon (Variant)", portrait: "/assets/potraits/68.png", deckIds: [70], exp: 11, prizePack: "s-black", isPlayer: false },
  { id: 69, name: "Patamon", portrait: "/assets/potraits/69.png", deckIds: [71], exp: 8, isPlayer: false },
  { id: 70, name: "Baronmon", portrait: "/assets/potraits/70.png", deckIds: [72], exp: 9, isPlayer: false },
  { id: 71, name: "Pegasusmon", portrait: "/assets/potraits/71.png", deckIds: [73], exp: 10, prizePack: "green", isPlayer: false },
  { id: 72, name: "Gatomon (Variant)", portrait: "/assets/potraits/72.png", deckIds: [74], exp: 8, isPlayer: false },
  { id: 73, name: "Nefertimon", portrait: "/assets/potraits/73.png", deckIds: [75], exp: 9, isPlayer: false },
  { id: 74, name: "Tylomon", portrait: "/assets/potraits/74.png", deckIds: [76], exp: 10, prizePack: "green", isPlayer: false },
  { id: 75, name: "Kuwagamon", portrait: "/assets/potraits/75.png", deckIds: [77], exp: 10, isPlayer: false },
  { id: 76, name: "HerculesKabuterimon", portrait: "/assets/potraits/76.png", deckIds: [78], exp: 13, prizePack: "s-green", isPlayer: false },
  { id: 77, name: "WarGreymon", portrait: "/assets/potraits/77.png", deckIds: [79], exp: 10, prizePack: "option", isPlayer: false },
  { id: 78, name: "Tai", portrait: "/assets/potraits/78.png", deckIds: [80], exp: 10, prizePack: "s-option", isPlayer: false },
  { id: 79, name: "Paildramon", portrait: "/assets/potraits/79.png", deckIds: [81], exp: 10, prizePack: "red", isPlayer: false },
  { id: 80, name: "Shurimon", portrait: "/assets/potraits/80.png", deckIds: [84], exp: 10, isPlayer: false },
  { id: 81, name: "Submarimon", portrait: "/assets/potraits/81.png", deckIds: [87], exp: 10, prizePack: "yellow", isPlayer: false },
  { id: 82, name: "MagnaAngemon", portrait: "/assets/potraits/82.png", deckIds: [94], exp: 10, prizePack: "green", isPlayer: false },
  { id: 83, name: "Angewomon", portrait: "/assets/potraits/83.png", deckIds: [95], exp: 10, prizePack: "green", isPlayer: false },
  { id: 84, name: "GranKuwagamon", portrait: "/assets/potraits/84.png", deckIds: [96], exp: 10, prizePack: "s-black", isPlayer: false },
  { id: 85, name: "Ken", portrait: "/assets/potraits/85.png", deckIds: [97,135,136], exp: 10, prizePack: "s-black", isPlayer: false },
  { id: 86, name: "Garudamon", portrait: "/assets/potraits/86.png", deckIds: [82], exp: 10, prizePack: "s-red", isPlayer: false },
  { id: 87, name: "Sora", portrait: "/assets/potraits/87.png", deckIds: [83], exp: 10, prizePack: "s-red", isPlayer: false },
  { id: 88, name: "Lillymon", portrait: "/assets/potraits/88.png", deckIds: [85], exp: 10, prizePack: "s-green", isPlayer: false },
  { id: 89, name: "Mimi", portrait: "/assets/potraits/89.png", deckIds: [86], exp: 10, prizePack: "s-green", isPlayer: false },
  { id: 90, name: "MetalGarurumon", portrait: "/assets/potraits/90.png", deckIds: [88], exp: 10, prizePack: "s-blue", isPlayer: false },
  { id: 91, name: "Matt", portrait: "/assets/potraits/91.png", deckIds: [89], exp: 10, prizePack: "s-blue", isPlayer: false },
  { id: 92, name: "Zudomon", portrait: "/assets/potraits/92.png", deckIds: [90], exp: 10, prizePack: "s-blue", isPlayer: false },
  { id: 93, name: "Joe", portrait: "/assets/potraits/93.png", deckIds: [91], exp: 10, prizePack: "s-blue", isPlayer: false },
  { id: 94, name: "MegaKabuterimon", portrait: "/assets/potraits/94.png", deckIds: [92], exp: 10, prizePack: "s-green", isPlayer: false },
  { id: 95, name: "Izzy", portrait: "/assets/potraits/95.png", deckIds: [93], exp: 10, prizePack: "s-green", isPlayer: false },
  { id: 96, name: "MetalSeadramon", portrait: "/assets/potraits/96.png", deckIds: [98], exp: 12, isPlayer: false },
  { id: 97, name: "Puppetmon", portrait: "/assets/potraits/97.png", deckIds: [99], exp: 12, isPlayer: false },
  { id: 98, name: "Machinedramon", portrait: "/assets/potraits/98.png", deckIds: [100], exp: 9, isPlayer: false },
  { id: 99, name: "LadyDevimon", portrait: "/assets/potraits/99.png", deckIds: [101], exp: 12, isPlayer: false },
  { id: 100, name: "Piedmon", portrait: "/assets/potraits/100.png", deckIds: [102], exp: 12, prizePack: "s-black", isPlayer: false },
  { id: 101, name: "Magnamon", portrait: "/assets/potraits/101.png", deckIds: [103], exp: 12, prizePack: "s-red", isPlayer: false },
  { id: 102, name: "Sylphymon", portrait: "/assets/potraits/102.png", deckIds: [104], exp: 12, prizePack: "s-green", isPlayer: false },
  { id: 103, name: "Shakkoumon", portrait: "/assets/potraits/103.png", deckIds: [105], exp: 12, prizePack: "s-yellow", isPlayer: false },
  { id: 104, name: "Seraphimon", portrait: "/assets/potraits/104.png", deckIds: [106], exp: 12, prizePack: "s-green", isPlayer: false },
  { id: 105, name: "Magnadramon", portrait: "/assets/potraits/105.png", deckIds: [107], exp: 12, prizePack: "s-green", isPlayer: false },
  { id: 106, name: "Infermon", portrait: "/assets/potraits/106.png", deckIds: [108], exp: 13, prizePack: "s-black", isPlayer: false },
  { id: 107, name: "Diaboromon", portrait: "/assets/potraits/107.png", deckIds: [109], exp: 14, prizePack: "s-black", isPlayer: false },
  { id: 108, name: "Imperialdramon", portrait: "/assets/potraits/108.png", deckIds: [110], exp: 15, prizePack: "s-red", isPlayer: false },
  { id: 109, name: "Valkyrimon", portrait: "/assets/potraits/109.png", deckIds: [111], exp: 15, prizePack: "s-green", isPlayer: false },
  { id: 110, name: "Omnimon", portrait: "/assets/potraits/110.png", deckIds: [113], exp: 15, prizePack: "s-option", isPlayer: false },
  { id: 111, name: "Vikemon", portrait: "/assets/potraits/111.png", deckIds: [112], exp: 15, prizePack: "s-blue", isPlayer: false },
  { id: 112, name: "Apokarimon", portrait: "/assets/potraits/112.png", deckIds: [114], exp: 25, prizePack: "s-black", prizeCards: ["103"], isPlayer: false },
  { id: 113, name: "Apokarimon (Variant)", portrait: "/assets/potraits/113.png", deckIds: [114], exp: 25, prizePack: "s-black", prizeCards: ["103"], isPlayer: false },
  { id: 114, name: "BK WarGreymon", portrait: "/assets/potraits/114.png", deckIds: [115], exp: 16, isPlayer: false },
  { id: 115, name: "BK MetalGarurumon", portrait: "/assets/potraits/115.png", deckIds: [116], exp: 16, prizePack: "s-blue", isPlayer: false },
  { id: 116, name: "Rosemon", portrait: "/assets/potraits/116.png", deckIds: [117], exp: 5, prizePack: "s-option", isPlayer: false },
  { id: 117, name: "Nanimon", portrait: "/assets/potraits/117.png", deckIds: [118], exp: 10, prizePack: "s-option", isPlayer: false },
  { id: 118, name: "Piximon", portrait: "/assets/potraits/118.png", deckIds: [119], exp: 12, prizePack: "s-green", isPlayer: false },
  { id: 119, name: "A", portrait: "/assets/potraits/119.png", deckIds: [120], exp: 30, isPlayer: false },
];

/** Actors selectable as the CPU opponent (have at least one deck). */
export const OPPONENT_ACTORS: Actor[] = ACTORS.filter((a) => !a.isPlayer && a.deckIds.length > 0);

/** Player-controllable actors. */
export const PLAYER_ACTORS: Actor[] = ACTORS.filter((a) => a.isPlayer);

export function getActorById(id: number): Actor | null {
  return ACTORS.find((a) => a.id === id) ?? null;
}
