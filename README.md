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

## Folder Structure

```
├── app/                # App entry, navigation, and screens
│   ├── (tabs)/         # Tabbed navigation screens (main game, hangar, etc.)
│   └── _layout.tsx     # App layout
├── assets/             # Images and sounds
├── components/         # Reusable UI and game components
│   ├── game/           # Game logic, actors, audio, HUD, menus
│   └── ui/             # UI utilities (icons, collapsibles)
├── constants/          # Theme and constant values
├── hooks/              # Custom React hooks
├── scripts/            # Project scripts (e.g., reset-project.js)
├── android/            # Android native project files
├── package.json        # Project metadata and dependencies
├── tsconfig.json       # TypeScript configuration
└── README.md           # Project documentation
```

## Available Scripts

In the project directory, you can run:

- `npm run start` — Start the Expo development server
- `npm run android` — Run the app on Android
- `npm run ios` — Run the app on iOS
- `npm run web` — Run the app in a web browser
- `npm run lint` — Lint the codebase
- `npm run reset-project` — Reset the project using the provided script

## Main Dependencies

- expo, react, react-native, expo-router, expo-audio, expo-image, expo-haptics, expo-status-bar, expo-web-browser
- @react-navigation/*, @expo/vector-icons, @react-native-async-storage/async-storage
- TypeScript, ESLint

See `package.json` for the full list.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
