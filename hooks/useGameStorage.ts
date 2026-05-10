import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { getActiveShipId, setActiveShipId as setGlobalActiveShipId } from '@/components/game/ship-loadout';

import type { ControlLayout } from '@/components/game/game-logic';

type PersistedGameState = {
  activeShipId: string;
  controlLayout: ControlLayout;
  highScore: number;
  highestClearedStage: number;
  isMusicEnabled: boolean;
  isSfxEnabled: boolean;
  lastRunScore: number;
};

const GAME_STATE_FILENAME = 'voxium-game-state.json';
const LEGACY_STORAGE_KEYS = {
  activeShipId: 'voxium.activeShipId',
  controlLayout: 'voxium.controlLayout',
  highScore: 'voxium.highScore',
  highestClearedStage: 'voxium.highestClearedStage',
  isMusicEnabled: 'voxium.isMusicEnabled',
  isSfxEnabled: 'voxium.isSfxEnabled',
  lastRunScore: 'voxium.lastRunScore',
} as const;

const DEFAULT_GAME_STATE: PersistedGameState = {
  activeShipId: getActiveShipId(),
  controlLayout: 'classic',
  highScore: 0,
  highestClearedStage: 1,
  isMusicEnabled: true,
  isSfxEnabled: true,
  lastRunScore: 0,
};
let latestGameStateCache: PersistedGameState = DEFAULT_GAME_STATE;

const gameStateFile =
  Platform.OS === 'web' ? null : new File(Paths.document, GAME_STATE_FILENAME);
const inMemoryStorage = new Map<string, string>();

function normalizeGameState(
  rawState: Partial<PersistedGameState> | null | undefined,
) {
  return {
    activeShipId: rawState?.activeShipId || DEFAULT_GAME_STATE.activeShipId,
    controlLayout:
      rawState?.controlLayout === 'split'
        ? 'split'
        : DEFAULT_GAME_STATE.controlLayout,
    highScore: Number(rawState?.highScore) || DEFAULT_GAME_STATE.highScore,
    highestClearedStage: Math.max(
      1,
      Number(rawState?.highestClearedStage) ||
        DEFAULT_GAME_STATE.highestClearedStage,
    ),
    isMusicEnabled:
      rawState?.isMusicEnabled ?? DEFAULT_GAME_STATE.isMusicEnabled,
    isSfxEnabled: rawState?.isSfxEnabled ?? DEFAULT_GAME_STATE.isSfxEnabled,
    lastRunScore:
      Number(rawState?.lastRunScore) || DEFAULT_GAME_STATE.lastRunScore,
  } satisfies PersistedGameState;
}

async function readNativeState() {
  if (!gameStateFile) {
    return DEFAULT_GAME_STATE;
  }

  try {
    const storedState = await gameStateFile.text();
    const normalizedState = normalizeGameState(
      JSON.parse(storedState) as Partial<PersistedGameState>,
    );
    latestGameStateCache = normalizedState;
    return normalizedState;
  } catch {
    return DEFAULT_GAME_STATE;
  }
}

async function readLegacyWebState() {
  try {
    const rawState = globalThis.localStorage?.getItem(GAME_STATE_FILENAME);
    if (rawState) {
      const normalizedState = normalizeGameState(
        JSON.parse(rawState) as Partial<PersistedGameState>,
      );
      latestGameStateCache = normalizedState;
      return normalizedState;
    }
  } catch {}

  try {
    const legacyState: Partial<PersistedGameState> = {};

    for (const [storageKeyName, storageKey] of Object.entries(LEGACY_STORAGE_KEYS)) {
      const storedValue = globalThis.localStorage?.getItem(storageKey);
      if (storedValue == null) {
        continue;
      }

      switch (storageKeyName) {
        case 'activeShipId':
          legacyState.activeShipId = storedValue;
          break;
        case 'controlLayout':
          legacyState.controlLayout = storedValue === 'split' ? 'split' : 'classic';
          break;
        case 'highScore':
          legacyState.highScore = Number(storedValue) || 0;
          break;
        case 'highestClearedStage':
          legacyState.highestClearedStage = Number(storedValue) || 1;
          break;
        case 'isMusicEnabled':
          legacyState.isMusicEnabled = storedValue !== 'false';
          break;
        case 'isSfxEnabled':
          legacyState.isSfxEnabled = storedValue !== 'false';
          break;
        case 'lastRunScore':
          legacyState.lastRunScore = Number(storedValue) || 0;
          break;
        default:
          break;
      }
    }

    const normalizedState = normalizeGameState(legacyState);
    latestGameStateCache = normalizedState;
    return normalizedState;
  } catch {
    return DEFAULT_GAME_STATE;
  }
}

async function readPersistedGameState() {
  if (Platform.OS === 'web') {
    return await readLegacyWebState();
  }

  const cachedState = inMemoryStorage.get(GAME_STATE_FILENAME);
  if (cachedState) {
    try {
      return normalizeGameState(JSON.parse(cachedState) as Partial<PersistedGameState>);
    } catch {}
  }

  return await readNativeState();
}

async function writePersistedGameState(state: PersistedGameState) {
  const serializedState = JSON.stringify(state);
  latestGameStateCache = state;

  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(GAME_STATE_FILENAME, serializedState);
    } catch {}
    return;
  }

  inMemoryStorage.set(GAME_STATE_FILENAME, serializedState);

  if (!gameStateFile) {
    return;
  }

  try {
    gameStateFile.write(serializedState);
  } catch {}
}

export function useGameStorage() {
  const [highScore, setHighScoreState] = useState(latestGameStateCache.highScore);
  const [lastRunScore, setLastRunScoreState] = useState(latestGameStateCache.lastRunScore);
  const [isMusicEnabled, setIsMusicEnabledState] = useState(latestGameStateCache.isMusicEnabled);
  const [isSfxEnabled, setIsSfxEnabledState] = useState(latestGameStateCache.isSfxEnabled);
  const [controlLayout, setControlLayout] = useState<ControlLayout>(
    latestGameStateCache.controlLayout,
  );
  const [activeShipId, setActiveShipIdState] = useState(latestGameStateCache.activeShipId);
  const [highestClearedStage, setHighestClearedStage] = useState(
    latestGameStateCache.highestClearedStage,
  );
  const [hasLoadedState, setHasLoadedState] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const storedState = await readPersistedGameState();

      if (!isMounted) {
        return;
      }

      setHighScore(storedState.highScore);
      setLastRunScoreState(storedState.lastRunScore);
      setIsMusicEnabledState(storedState.isMusicEnabled);
      setIsSfxEnabledState(storedState.isSfxEnabled);
      setControlLayout(storedState.controlLayout);
      setHighestClearedStage(storedState.highestClearedStage);
      setGlobalActiveShipId(storedState.activeShipId);
      setActiveShipIdState(getActiveShipId());
      setHasLoadedState(true);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistedState = useMemo<PersistedGameState>(
    () => ({
      activeShipId,
      controlLayout,
      highScore,
      highestClearedStage,
      isMusicEnabled,
      isSfxEnabled,
      lastRunScore,
    }),
    [
      activeShipId,
      controlLayout,
      highScore,
      highestClearedStage,
      isMusicEnabled,
      isSfxEnabled,
      lastRunScore,
    ],
  );

  useEffect(() => {
    if (!hasLoadedState) {
      return;
    }

    void writePersistedGameState(persistedState);
  }, [hasLoadedState, persistedState]);

  useEffect(() => {
    setGlobalActiveShipId(activeShipId);
  }, [activeShipId]);

  const refreshActiveShip = useCallback(() => {
    const nextShipId = getActiveShipId();
    setActiveShipIdState(nextShipId);
  }, []);

  const setActiveShipId = useCallback((shipId: string) => {
    const normalizedShipId = shipId;
    latestGameStateCache = {
      ...latestGameStateCache,
      activeShipId: normalizedShipId,
    };
    setActiveShipIdState(normalizedShipId);
    setGlobalActiveShipId(normalizedShipId);
  }, []);

  const setHighScore = useCallback((value: React.SetStateAction<number>) => {
    setHighScoreState((currentValue) => {
      const nextValue =
        typeof value === 'function' ? value(currentValue) : value;
      latestGameStateCache = {
        ...latestGameStateCache,
        highScore: nextValue,
      };
      return nextValue;
    });
  }, []);

  const setLastRunScore = useCallback((value: React.SetStateAction<number>) => {
    setLastRunScoreState((currentValue) => {
      const nextValue =
        typeof value === 'function' ? value(currentValue) : value;
      latestGameStateCache = {
        ...latestGameStateCache,
        lastRunScore: nextValue,
      };
      return nextValue;
    });
  }, []);

  const setIsMusicEnabled = useCallback((value: React.SetStateAction<boolean>) => {
    setIsMusicEnabledState((currentValue) => {
      const nextValue =
        typeof value === 'function' ? value(currentValue) : value;
      latestGameStateCache = {
        ...latestGameStateCache,
        isMusicEnabled: nextValue,
      };
      return nextValue;
    });
  }, []);

  const setIsSfxEnabled = useCallback((value: React.SetStateAction<boolean>) => {
    setIsSfxEnabledState((currentValue) => {
      const nextValue =
        typeof value === 'function' ? value(currentValue) : value;
      latestGameStateCache = {
        ...latestGameStateCache,
        isSfxEnabled: nextValue,
      };
      return nextValue;
    });
  }, []);

  const setHighestClearedStageState = useCallback((value: React.SetStateAction<number>) => {
    setHighestClearedStage((currentValue) => {
      const nextValue =
        typeof value === 'function' ? value(currentValue) : value;
      latestGameStateCache = {
        ...latestGameStateCache,
        highestClearedStage: nextValue,
      };
      return nextValue;
    });
  }, []);

  return {
    activeShipId,
    controlLayout,
    highScore,
    highestClearedStage,
    isMusicEnabled,
    isSfxEnabled,
    lastRunScore,
    refreshActiveShip,
    setActiveShipId,
    setControlLayout,
    setHighScore,
    setHighestClearedStage: setHighestClearedStageState,
    setIsMusicEnabled,
    setIsSfxEnabled,
    setLastRunScore,
  };
}
