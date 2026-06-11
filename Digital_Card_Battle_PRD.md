# Product Requirements Document (PRD)

## Project Name
Project Digital Card Battle

## Objective

Create a playable digital recreation of the core battle system inspired by Digimon Digital Card Battle (PS1).

The initial release focuses entirely on game mechanics and rule validation. Graphics, animations, sound effects, and artwork are intentionally excluded.

The game should be fully playable using placeholder UI elements and text-based card representations.

---

# Goals

## Primary Goal

Build a complete battle engine capable of:

- Managing decks
- Managing hands
- Deploying Digimon
- Digivolving Digimon
- Executing support cards
- Resolving battles
- Tracking victory conditions

## Non-Goals (MVP)

- Original card artwork
- Animations
- Sound effects
- Multiplayer networking
- Ranked systems
- Matchmaking
- Save systems
- Campaign mode

---

# Technical Direction

## Frontend

- Solid
- TypeScript

## Architecture

```text
Game Engine
    ↓
State Store
    ↓
UI Renderer
```

Game logic must remain completely independent from UI rendering.

---

# Match Rules

## Players

- 2 participants
- Human vs CPU (MVP)

Future:
- Human vs Human

## Victory Condition

First player to earn 3 points wins.

---

# Card Types

## Digimon Card

```ts
interface DigimonCard {
  id: string;
  name: string;
  level: 'ROOKIE' | 'CHAMPION' | 'ULTIMATE';
  attribute: 'FIRE' | 'ICE' | 'NATURE' | 'DARKNESS' | 'RARE';
  hp: number;
  dpReward: number;
  evolveCost: number;
  attacks: {
    circle: Attack;
    triangle: Attack;
    cross: Attack;
  };
}
```

## Option Card

```ts
interface OptionCard {
  id: string;
  name: string;
  effectType: 'SUPPORT' | 'DIGIVOLVE' | 'DP' | 'UTILITY';
}
```

---

# Match Flow

## Start Match

1. Shuffle both decks.
2. Determine first player.
3. Enter Draw Phase.

## Draw Phase

Active player draws until hand contains 4 cards.

### Digimon Availability Check

Only performed if no active Digimon exists.

- If hand contains a Digimon card: continue.
- If hand contains no Digimon card and deck still has cards:
  - Discard hand to trash.
  - Draw again.
  - Repeat validation.
- If player cannot obtain a Digimon card:
  - Immediate match loss.

## Prep Phase

### Empty Battlefield

Player must deploy one Digimon.

Penalty modifiers:

| Level | Modifier |
|---------|---------|
| Rookie | 1.0 |
| Champion | 0.5 |
| Ultimate | 0.25 |

Penalty affects HP and attack damage.

### Occupied Battlefield

Available actions:

#### Stock DP

Discard Digimon cards.

```text
dpStock += card.dpReward
```

#### Natural Digivolution

Requirements:

- Correct progression
- Sufficient DP

Example:

```text
Rookie → Champion
Champion → Ultimate
```

On success:

1. Replace active Digimon.
2. DP stock is consumed.
3. DP stock resets to 0.

Natural Digivolution does NOT remove penalties.

Penalty is inherited.

#### Digivolve Option Cards

May:

- Ignore DP requirements
- Modify DP stock
- Preserve DP
- Remove penalties

Behavior depends on card scripts.

## Battle Availability Check

If opponent has no active Digimon:

```text
Skip battle phase.
Pass turn.
```

Battle only occurs when both players have active Digimon.

## Battle Selection Phase

Both players choose:

### Attack Type

- Circle
- Triangle
- Cross

### Support Selection

Choose:

- Support card
- Digimon support card
- No support

## Battle Resolution Phase

Order:

```text
1. Support effects
2. Cross effects
3. Turn owner attack
4. Defender counter attack
5. Cleanup
```

### First Strike

Turn owner attacks first.

Apply:

- Support modifiers
- Cross effects
- Penalties
- Active effects

### Defender KO

If defender HP <= 0:

- Send Digimon to trash
- Attacker gains 1 point
- End battle

### Counter Attack

If defender survives:

- Execute selected attack

If attacker HP <= 0:

- Attacker goes to trash
- Defender gains 1 point

## End Turn

1. Clear temporary effects
2. Clear support cards
3. Switch active player

## Match End

If score >= 3:

- Match ends
- Winner declared

---

# CPU Opponent (MVP)

## Priorities

### Deployment

Rookie → Champion → Ultimate

### Evolution

1. Evolve if possible
2. Stock DP if needed
3. End phase

### Attack Selection

1. Guaranteed kill
2. Survival move
3. Weighted random

### Support Selection

Choose highest utility support card.

---

# UI Layout

```text
┌──────────────────────────┐
│ Opponent Area            │
├──────────────────────────┤
│ Battle Log               │
├──────────────────────────┤
│ Player Area              │
├──────────────────────────┤
│ Hand Controls            │
└──────────────────────────┘
```

## Battle Log

Must record every game event.

Example:

```text
Player evolved Greymon.
DP stock reset to 0.

Player used support card.

MetalGreymon dealt 350 damage.
```

---

# Suggested Project Structure

```text
src/
├── engine/
│   ├── gameEngine.ts
│   ├── phaseManager.ts
│   ├── battleResolver.ts
│   ├── evolutionSystem.ts
│   └── cardEffects.ts
├── ai/
│   └── cpuPlayer.ts
├── data/
│   ├── cards.ts
│   └── starterDecks.ts
├── types/
│   └── gameTypes.ts
├── ui/
│   ├── components/
│   └── pages/
└── tests/
```

# MVP Success Criteria

1. Human can play against CPU.
2. Full match can be completed.
3. Score reaches 3 points.
4. Digivolution rules work.
5. Penalty inheritance works.
6. DP stock reset works.
7. Support cards execute correctly.
8. Placeholder UI is sufficient.
