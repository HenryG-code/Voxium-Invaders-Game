# Voxium Invaders

Voxium Invaders is a mobile arcade space shooter built with React Native, Expo, and TypeScript. It combines real-time combat, enemy spawning, boss fights, mobile controls, audio, scoring, and retro sci-fi presentation into a playable prototype.

## What Is In The Game

- Menu, options, hangar, records, and credits flow
- Player movement and boost control
- Standard fire and charged pulse shots
- Enemy spawning, asteroid pressure, and boss logic
- Collision handling, scoring, lives, and shields
- Music and sound effects
- Retro space-shooter presentation

## Tech Stack

- Expo
- React Native
- TypeScript
- Expo Audio
- Expo Image
- Expo Router

## Project Layout

- [`app/(tabs)/index.tsx`](app/(tabs)/index.tsx): main game screen and gameplay loop
- [`app/(tabs)/hangar.tsx`](app/(tabs)/hangar.tsx): ship-selection hangar with unlock-ready fleet UI
- [`components/game/game-logic.ts`](components/game/game-logic.ts): game constants, types, and core logic helpers
- [`components/game/game-audio.ts`](components/game/game-audio.ts): audio safety helpers
- [`components/game/game-actors.tsx`](components/game/game-actors.tsx): ship and enemy render pieces
- [`components/ui/icon-symbol.tsx`](components/ui/icon-symbol.tsx): icon mapping for the tab bar

## Getting Started

```bash
npm install
npm run start
```

## Controls

- Move left and right with the on-screen buttons
- Hold Boost to surge forward
- Tap Fire for standard shots
- Hold Fire to charge the pulse attack

## Current Status

The prototype is playable, and the codebase is now being split into smaller gameplay modules so it is easier to extend stage logic, enemy behavior, and UI sections without fighting one giant screen file.
