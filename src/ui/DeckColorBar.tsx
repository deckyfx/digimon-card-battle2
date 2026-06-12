import { For, Show, createMemo } from "solid-js";
import { CardSpecialty, CardType, type MasterCard } from "@src/types";
import { MASTER_CARDS } from "@src/data/master-cards";

const CARD_BY_NUMBER = new Map<string, MasterCard>(MASTER_CARDS.map((c) => [c.number, c]));

/** DCB colour naming: Fire=Red, Ice=Blue, Nature=Green, Darkness=Black, Rare=Yellow. */
const SPECIALTY_CHIPS: { specialty: CardSpecialty; cls: string; label: string }[] = [
  { specialty: CardSpecialty.Fire, cls: "chip-fire", label: "Red" },
  { specialty: CardSpecialty.Ice, cls: "chip-ice", label: "Blue" },
  { specialty: CardSpecialty.Nature, cls: "chip-nature", label: "Green" },
  { specialty: CardSpecialty.Darkness, cls: "chip-darkness", label: "Black" },
  { specialty: CardSpecialty.Rare, cls: "chip-rare", label: "Yellow" },
];

/**
 * Deck colour composition bar: one coloured chip + count per specialty
 * present, plus the Option count — a quick gauge of a deck's battle power.
 */
export function DeckColorBar(props: { cardNumbers: string[] }) {
  const counts = createMemo(() => {
    const bySpec = new Map<CardSpecialty, number>();
    let options = 0;
    for (const n of props.cardNumbers) {
      const c = CARD_BY_NUMBER.get(n);
      if (!c) continue;
      if (c.type === CardType.Option) options++;
      else bySpec.set(c.specialty, (bySpec.get(c.specialty) ?? 0) + 1);
    }
    return { bySpec, options };
  });

  return (
    <div class="deck-colors">
      <For each={SPECIALTY_CHIPS.filter((s) => (counts().bySpec.get(s.specialty) ?? 0) > 0)}>
        {(s) => (
          <span class="deck-color" title={`${s.label} (${s.specialty})`}>
            <span class={`chip ${s.cls}`} />
            {counts().bySpec.get(s.specialty)}
          </span>
        )}
      </For>
      <Show when={counts().options > 0}>
        <span class="deck-color" title="Option cards">
          <span class="chip-label">OPTION</span>
          {counts().options}
        </span>
      </Show>
    </div>
  );
}
