import { useEffect, useRef, useState } from 'react';
import type { AudioPlayer } from 'expo-audio';
import type { GestureResponderEvent } from 'react-native';

import {
  BULLET_HEIGHT,
  FIRE_COOLDOWN_MS,
  MAX_ACTIVE_BULLETS,
  PLAY_AREA_BOTTOM_PADDING,
  SHIP_FRAME_HEIGHT,
  SHIP_MUZZLE_OFFSET,
  type Bullet,
  type BulletKind,
  type GameState,
  type SceneState,
  clamp,
  getBulletHeight,
} from '@/components/game/game-logic';
import { playSoundSafely, resetSoundSafely } from '@/components/game/game-audio';

type MutableNumberRef = { current: number };
type MutableBooleanRef = { current: boolean };
type MutableGameStateRef = { current: GameState };
type MutableSceneRef = { current: SceneState };

type UsePlayerControlsArgs = {
  boostPlayer: AudioPlayer;
  firePlayer: AudioPlayer;
  gameStateRef: MutableGameStateRef;
  heightRef: MutableNumberRef;
  isSfxEnabledRef: MutableBooleanRef;
  movePlayer: AudioPlayer;
  moveStep: number;
  maxShipOffset: number;
  playAreaHeightRef: MutableNumberRef;
  pulseChargeMs: number;
  sceneRef: MutableSceneRef;
  setScene: React.Dispatch<React.SetStateAction<SceneState>>;
  setShipOffset: React.Dispatch<React.SetStateAction<number>>;
  shipLiftOffset: number;
  shipOffsetRef: MutableNumberRef;
  standardFireCooldownMs: number;
  contentWidthRef: MutableNumberRef;
  boostRef: MutableBooleanRef;
  lastFireAtRef: MutableNumberRef;
  lastMoveAtRef: MutableNumberRef;
  lastMoveDirectionRef: { current: 0 | -1 | 1 };
  lastMoveSoundAtRef: MutableNumberRef;
  bulletIdRef: MutableNumberRef;
};

export function usePlayerControls({
  boostPlayer,
  firePlayer,
  gameStateRef,
  heightRef,
  isSfxEnabledRef,
  movePlayer,
  moveStep,
  maxShipOffset,
  playAreaHeightRef,
  pulseChargeMs,
  sceneRef,
  setScene,
  setShipOffset,
  shipLiftOffset,
  shipOffsetRef,
  standardFireCooldownMs,
  contentWidthRef,
  boostRef,
  lastFireAtRef,
  lastMoveAtRef,
  lastMoveDirectionRef,
  lastMoveSoundAtRef,
  bulletIdRef,
}: UsePlayerControlsArgs) {
  const [isBoosting, setIsBoosting] = useState(false);
  const [isFireHeld, setIsFireHeld] = useState(false);
  const fireHoldStartAtRef = useRef(0);
  const pulseModeRef = useRef(false);
  const isFireHeldRef = useRef(false);

  useEffect(() => {
    boostRef.current = isBoosting;
  }, [boostRef, isBoosting]);

  useEffect(() => {
    isFireHeldRef.current = isFireHeld;
  }, [isFireHeld]);

  const spawnPlayerShot = (kind: BulletKind) => {
    if (gameStateRef.current !== 'playing') {
      return false;
    }

    const currentScene = sceneRef.current;
    const cooldown = kind === 'pulse' ? pulseChargeMs : standardFireCooldownMs;

    if (currentScene.elapsedMs - lastFireAtRef.current < cooldown) {
      return false;
    }

    if (currentScene.bullets.length >= MAX_ACTIVE_BULLETS) {
      return false;
    }

    const activePlayAreaHeight =
      playAreaHeightRef.current || Math.max(260, heightRef.current * 0.52);
    const currentShipLift = (boostRef.current ? -16 : 0) + shipLiftOffset;
    const bulletHeight = getBulletHeight(kind);
    const bulletStartY =
      activePlayAreaHeight -
      PLAY_AREA_BOTTOM_PADDING -
      SHIP_FRAME_HEIGHT +
      SHIP_MUZZLE_OFFSET +
      currentShipLift -
      Math.max(0, bulletHeight - BULLET_HEIGHT) / 2;

    const newBullet: Bullet = {
      id: bulletIdRef.current++,
      x: shipOffsetRef.current,
      y: bulletStartY,
      kind,
    };

    lastFireAtRef.current = currentScene.elapsedMs;

    setScene((currentSceneState) => ({
      ...currentSceneState,
      bullets:
        currentSceneState.bullets.length >= MAX_ACTIVE_BULLETS
          ? currentSceneState.bullets
          : [...currentSceneState.bullets, newBullet],
    }));

    return true;
  };

  const moveShipToOffset = (targetOffset: number) => {
    if (gameStateRef.current !== 'playing') {
      return;
    }

    let didMove = false;
    let direction: 0 | -1 | 1 = 0;

    const nextOffset = clamp(targetOffset, -maxShipOffset, maxShipOffset);

    setShipOffset(nextOffset);
    didMove = nextOffset !== shipOffsetRef.current;
    direction =
      nextOffset === shipOffsetRef.current ? 0 : nextOffset > shipOffsetRef.current ? 1 : -1;
    shipOffsetRef.current = nextOffset;

    if (
      didMove &&
      sceneRef.current.elapsedMs - lastMoveSoundAtRef.current > 140
    ) {
      lastMoveAtRef.current = sceneRef.current.elapsedMs;
      lastMoveDirectionRef.current = direction;
      lastMoveSoundAtRef.current = sceneRef.current.elapsedMs;
      void playSoundSafely(movePlayer, isSfxEnabledRef.current);
    } else if (didMove) {
      lastMoveAtRef.current = sceneRef.current.elapsedMs;
      lastMoveDirectionRef.current = direction;
    }
  };

  const moveShip = (direction: -1 | 1) => {
    moveShipToOffset(shipOffsetRef.current + direction * moveStep);
  };

  const handleTouchMoveShip = (event: GestureResponderEvent) => {
    if (gameStateRef.current !== 'playing') {
      return;
    }

    moveShipToOffset(event.nativeEvent.locationX - contentWidthRef.current / 2);
  };

  const handleFirePressIn = () => {
    if (gameStateRef.current !== 'playing') {
      return;
    }

    isFireHeldRef.current = true;
    pulseModeRef.current = false;
    fireHoldStartAtRef.current = sceneRef.current.elapsedMs;
    setIsFireHeld(true);

    if (spawnPlayerShot('standard')) {
      void playSoundSafely(firePlayer, isSfxEnabledRef.current);
    }
  };

  const handleFirePressOut = () => {
    isFireHeldRef.current = false;
    pulseModeRef.current = false;
    fireHoldStartAtRef.current = 0;
    setIsFireHeld(false);
  };

  const handleBoostStart = () => {
    if (gameStateRef.current !== 'playing' || boostRef.current) {
      return;
    }

    setIsBoosting(true);
    void playSoundSafely(boostPlayer, isSfxEnabledRef.current);
  };

  const handleBoostEnd = () => {
    if (!boostRef.current) {
      return;
    }

    setIsBoosting(false);
    void resetSoundSafely(boostPlayer);
  };

  return {
    boostRef,
    fireHoldStartAtRef,
    handleBoostEnd,
    handleBoostStart,
    handleFirePressIn,
    handleFirePressOut,
    handleTouchMoveShip,
    isBoosting,
    isFireHeld,
    isFireHeldRef,
    lastMoveAtRef,
    lastMoveDirectionRef,
    lastMoveSoundAtRef,
    moveShip,
    moveShipToOffset,
    pulseModeRef,
    setIsBoosting,
    setIsFireHeld,
  };
}
