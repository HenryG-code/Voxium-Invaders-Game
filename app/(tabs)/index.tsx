import { useIsFocused } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { GameControls } from '@/components/game/GameControls';
import { GameHUD } from '@/components/game/GameHUD';
import { GameMenu } from '@/components/game/GameMenu';
import { GameOverScreen } from '@/components/game/GameOverScreen';
import { StageClearScreen } from '@/components/game/StageClearScreen';
import { AlienInvader, HeroShip } from '@/components/game/game-actors';
import { playSoundSafely, resetSoundSafely } from '@/components/game/game-audio.native';
import {
  getNextUnlockHangarShip,
  getNewlyUnlockedHangarShips,
  getStageClearanceAfterClear,
  getUnlockedHangarShips,
} from '@/components/game/hangar-data';
import {
  advanceBossLasers,
  createBossLaser,
  doesBossLaserHitShip,
  getBossLaserOriginY,
  getStageEnemySpawnKind,
  getStageMaxHostiles,
  shouldLaunchBossLaser,
} from '@/components/game/game-enemy-system';
import { getMainMenuReturnRequestId } from '@/components/game/main-menu-return';
import {
  applyPlayerDamage,
  BOOST_TRAVEL_PER_MS,
  BossLaser,
  BOSS_STAGE,
  BULLET_HEIGHT,
  BULLET_WIDTH,
  Bullet,
  createEnemy,
  createExplosion,
  createForegroundStreaks,
  createStars,
  ASTEROID_FRAME_SIZE,
  COLLISION_BIN_WIDTH,
  ENEMY_FRAME_HEIGHT,
  ENEMY_FRAME_WIDTH,
  Enemy,
  EnemyCollisionCandidate,
  EnemyKind,
  FAR_STAR_COUNT,
  FIRE_COOLDOWN_MS,
  FOREGROUND_STREAK_COUNT,
  GameState,
  getBulletDamage,
  getBulletHeight,
  getBulletSpeed,
  getBulletWidth,
  getEnemyDamage,
  getEnemyFrameHeight,
  getEnemyFrameWidth,
  getEnemyScore,
  MAX_ACTIVE_BULLETS,
  MenuPanel,
  MID_STAR_COUNT,
  MOVE_SOUND_COOLDOWN_MS,
  NEAR_STAR_COUNT,
  NORMAL_TRAVEL_PER_MS,
  PLAY_AREA_BOTTOM_PADDING,
  PLAY_AREA_PADDING,
  SCREEN_BOTTOM_PADDING,
  SCREEN_HORIZONTAL_PADDING,
  SCREEN_TOP_PADDING,
  SceneState,
  SHIP_BOUNDING_WIDTH,
  SHIP_FRAME_HEIGHT,
  SHIP_FRAME_WIDTH,
  SHIP_MUZZLE_OFFSET,
  SHIP_PIXEL_SIZE,
  SPEED_LINE_COUNT,
  SHIP_COLLISION_HEIGHT,
  BulletKind,
  HealthPickup,
  clamp,
  getEnemyCenterX,
  getEnemyCenterY,
} from '@/components/game/game-logic';
import {
  getBossSpawnThreshold,
  getNextEnemySpawnDelay,
} from '@/components/game/game-stage';
import { getShipGameplayProfile } from '@/components/game/ship-loadout';
import { useGameAudio } from '@/hooks/useGameAudio.native';
import { useGameStorage } from '@/hooks/useGameStorage';

export default function HomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { width, height } = useWindowDimensions();
  const {
    activeShipId,
    controlLayout,
    highScore,
    highestClearedStage: stageClearance,
    isMusicEnabled,
    isSfxEnabled,
    lastRunScore,
    refreshActiveShip,
    setControlLayout,
    setHighScore,
    setHighestClearedStage,
    setIsMusicEnabled,
    setIsSfxEnabled,
    setLastRunScore,
  } = useGameStorage();
  const shipProfile = getShipGameplayProfile(activeShipId);
  const [gameState, setGameState] = useState<GameState>("menu");
  const [menuPanel, setMenuPanel] = useState<MenuPanel>("main");
  const [stageClearAnnouncement, setStageClearAnnouncement] = useState<string | null>(null);
  const [shipOffset, setShipOffset] = useState(0);
  const [isBoosting, setIsBoosting] = useState(false);
  const [isFireHeld, setIsFireHeld] = useState(false);
  const [playAreaHeight, setPlayAreaHeight] = useState(0);
  const [screenShakeMs, setScreenShakeMs] = useState(0);
  const [scene, setScene] = useState<SceneState>({
    elapsedMs: 0,
    travel: 0,
    score: 0,
    playerHp: shipProfile.playerHp,
    playerShield: 0,
    playerDamageFlashMs: 0,
    stage: BOSS_STAGE,
    stageKills: 0,
    bossDefeated: false,
    bullets: [],
    enemies: [],
    bossLasers: [],
    healthDrops: [],
    explosions: [],
    lives: shipProfile.playerHp,
  });
  const boostRef = useRef(isBoosting);
  const isSfxEnabledRef = useRef(isSfxEnabled);
  const gameStateRef = useRef<GameState>(gameState);
  const sceneRef = useRef(scene);
  const shipOffsetRef = useRef(shipOffset);
  const playAreaHeightRef = useRef(playAreaHeight);
  const contentWidthRef = useRef(
    Math.max(0, width - SCREEN_HORIZONTAL_PADDING * 2),
  );
  const heightRef = useRef(height);
  const lastMoveAtRef = useRef(0);
  const lastMoveDirectionRef = useRef<0 | -1 | 1>(0);
  const lastMoveSoundAtRef = useRef(0);
  const lastFireAtRef = useRef(-FIRE_COOLDOWN_MS);
  const bulletIdRef = useRef(0);
  const enemyIdRef = useRef(0);
  const explosionIdRef = useRef(0);
  const bossLaserIdRef = useRef(0);
  const healthDropIdRef = useRef(0);
  const enemySpawnClockRef = useRef(0);
  const nextEnemySpawnMsRef = useRef(1200);
  const bossSpawnedRef = useRef(false);
  const healthDropClockRef = useRef(0);
  const nextHealthDropMsRef = useRef(4800);
  const isFireHeldRef = useRef(false);
  const pulseModeRef = useRef(false);
  const fireHoldStartAtRef = useRef(0);
  const handledMainMenuReturnRequestRef = useRef(0);
  const previousSceneSnapshotRef = useRef(scene);
  const heldMoveDirectionRef = useRef<0 | -1 | 1>(0);
  const targetShipOffsetRef = useRef(0);
  const screenShakeRemainingRef = useRef(0);

  const {
    alienBlasterPlayer,
    blasterThreePlayer,
    blasterTwoPlayer,
    bossPlayer,
    bossDestroyedPlayer,
    boostPlayer,
    blipPlayer,
    destroyPlayer,
    firePlayer,
    incomingPlayer,
    movePlayer,
    playerDeathPlayer,
    pulsePlayer,
    victoryPlayer,
    wavePlayer,
  } = useGameAudio({
    gameState,
    isMusicEnabled,
    isSfxEnabled,
    stage: scene.stage,
  });

  const maxShipOffset = Math.max(
    0,
    width / 2 - SHIP_BOUNDING_WIDTH / 2 - PLAY_AREA_PADDING,
  );
  const contentWidth = Math.max(0, width - SCREEN_HORIZONTAL_PADDING * 2);

  const stars = useMemo(
    () => [
      ...createStars(FAR_STAR_COUNT, "far", 0),
      ...createStars(MID_STAR_COUNT, "mid", 100),
      ...createStars(NEAR_STAR_COUNT, "near", 200),
    ],
    [],
  );

  const foregroundStreaks = useMemo(
    () => createForegroundStreaks(FOREGROUND_STREAK_COUNT),
    [],
  );
  const {
    moveSpeedPxPerMs,
    pulseChargeMs,
    standardFireCooldownMs,
    shipBankMultiplier,
    shipLiftOffset,
    shipScale,
    playerHp,
    shieldPoints,
  } = shipProfile;
  const unlockedHangarShips = useMemo(
    () => getUnlockedHangarShips(stageClearance),
    [stageClearance],
  );
  const nextUnlockShip = useMemo(
    () => getNextUnlockHangarShip(stageClearance),
    [stageClearance],
  );
  const appVersion = Constants.expoConfig?.version ?? "0.1.33";
  const movementLockedWhileFiring = activeShipId === "helios" && isFireHeld;
  const playerFlightBaseLift = -104;
  const NOVA_FREEZE_DURATION_MS = 1200;

  const buildShotsForAttack = useCallback(
    (attackMode: "standard" | "alt", muzzleOriginY: number, originX: number) => {
      const bullets: Bullet[] = [];
          const pushBullet = (
            kind: BulletKind,
            options?: {
              damage?: number;
              blastRadius?: number;
              beamTickMs?: number;
              maxAgeMs?: number;
              offsetX?: number;
              offsetY?: number;
              pierce?: number;
              sourceShipId?: string;
              vx?: number;
              beamLength?: number;
        },
      ) => {
        const bulletHeight = getBulletHeight(kind);
        bullets.push({
          id: bulletIdRef.current++,
          x: originX + (options?.offsetX ?? 0),
          y:
            kind === "beam"
              ? 0
              : muzzleOriginY -
                Math.max(0, bulletHeight - BULLET_HEIGHT) / 2 +
                (options?.offsetY ?? 0),
          kind,
          vx: options?.vx,
          damage: options?.damage,
          ageMs: 0,
          maxAgeMs: options?.maxAgeMs,
          pierce: options?.pierce,
          blastRadius: options?.blastRadius,
          beamTickMs: options?.beamTickMs,
          lastBeamHitMs: kind === "beam" ? -Infinity : undefined,
          beamLength: options?.beamLength,
          sourceShipId: options?.sourceShipId ?? activeShipId,
        });
      };

      switch (activeShipId) {
        case "raptor":
          if (attackMode === "alt") {
            pushBullet("missile", {
              damage: 2.6,
              maxAgeMs: 1700,
              blastRadius: 92,
            });
          } else {
            pushBullet("missile", {
              damage: 1.3,
              maxAgeMs: 1500,
            });
          }
          break;
        case "viper":
          if (attackMode === "alt") {
            pushBullet("needle", { offsetX: -8, vx: -0.05, damage: 0.78 });
            pushBullet("needle", { damage: 0.82 });
            pushBullet("needle", { offsetX: 8, vx: 0.05, damage: 0.78 });
          } else {
            pushBullet("needle", { damage: 0.9 });
          }
          break;
        case "tempest":
          if (attackMode === "alt") {
            pushBullet("electricOrb", { offsetX: -10, vx: -0.03, damage: 1.3, pierce: 1 });
            pushBullet("electricOrb", { offsetX: 10, vx: 0.03, damage: 1.3, pierce: 1 });
          } else {
            pushBullet("electricOrb", { damage: 1.1 });
          }
          break;
        case "helios":
          pushBullet("beam", {
            damage: 1.12,
            maxAgeMs: 240,
            pierce: 9999,
            beamTickMs: 84,
            beamLength: muzzleOriginY,
          });
          break;
        case "bastion":
          if (attackMode === "alt") {
            pushBullet("plasmaPellet", { offsetX: -18, vx: -0.18, damage: 0.46 });
            pushBullet("plasmaPellet", { offsetX: -9, vx: -0.09, damage: 0.5 });
            pushBullet("plasmaPellet", { damage: 0.55 });
            pushBullet("plasmaPellet", { offsetX: 9, vx: 0.09, damage: 0.5 });
            pushBullet("plasmaPellet", { offsetX: 18, vx: 0.18, damage: 0.46 });
          } else {
            pushBullet("plasmaPellet", { offsetX: -10, vx: -0.1, damage: 0.58 });
            pushBullet("plasmaPellet", { damage: 0.64 });
            pushBullet("plasmaPellet", { offsetX: 10, vx: 0.1, damage: 0.58 });
          }
          break;
        case "atlas":
          if (attackMode === "alt") {
            pushBullet("seekerPod", { offsetX: -12, damage: 1.25, maxAgeMs: 2200 });
            pushBullet("seekerPod", { damage: 1.35, maxAgeMs: 2200 });
            pushBullet("seekerPod", { offsetX: 12, damage: 1.25, maxAgeMs: 2200 });
          } else {
            pushBullet("seekerPod", { damage: 1.4, maxAgeMs: 2200 });
          }
          break;
        case "nova":
          if (attackMode === "alt") {
            pushBullet("pulse", { offsetX: -14, damage: 1.8 });
            pushBullet("pulse", { offsetX: 14, damage: 1.8 });
          } else {
            pushBullet("novaPulse", { offsetX: -12, damage: 1.08 });
            pushBullet("novaPulse", { offsetX: 12, damage: 1.08 });
          }
          break;
        case "warden":
        default:
          if (attackMode === "alt") {
            pushBullet("pulse", { damage: 2 });
          } else {
            pushBullet("standard", { damage: 1 });
          }
          break;
      }

      return bullets;
    },
    [activeShipId],
  );

  useEffect(() => {
    boostRef.current = isBoosting;
  }, [isBoosting]);

  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  useEffect(() => {
    shipOffsetRef.current = shipOffset;
  }, [shipOffset]);

  useEffect(() => {
    isSfxEnabledRef.current = isSfxEnabled;
  }, [isSfxEnabled]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    playAreaHeightRef.current = playAreaHeight;
  }, [playAreaHeight]);

  useEffect(() => {
    contentWidthRef.current = contentWidth;
  }, [contentWidth]);

  useEffect(() => {
    heightRef.current = height;
  }, [height]);

  useEffect(() => {
    setShipOffset((currentOffset) =>
      Math.max(-maxShipOffset, Math.min(maxShipOffset, currentOffset)),
    );
    targetShipOffsetRef.current = clamp(
      targetShipOffsetRef.current,
      -maxShipOffset,
      maxShipOffset,
    );
  }, [maxShipOffset]);

  useEffect(() => {
    if (scene.score > highScore) {
      setHighScore(scene.score);
    }
  }, [highScore, scene.score, setHighScore]);

  const applyShipOffset = useCallback(
    (nextOffset: number) => {
      const clampedOffset = clamp(nextOffset, -maxShipOffset, maxShipOffset);
      const previousOffset = shipOffsetRef.current;

      if (clampedOffset === previousOffset) {
        return;
      }

      const direction: 0 | -1 | 1 = clampedOffset > previousOffset ? 1 : -1;
      shipOffsetRef.current = clampedOffset;
      setShipOffset(clampedOffset);

      if (
        sceneRef.current.elapsedMs - lastMoveSoundAtRef.current >
        MOVE_SOUND_COOLDOWN_MS
      ) {
        lastMoveAtRef.current = sceneRef.current.elapsedMs;
        lastMoveDirectionRef.current = direction;
        lastMoveSoundAtRef.current = sceneRef.current.elapsedMs;
        void playSoundSafely(movePlayer, isSfxEnabledRef.current, true, false);
      } else {
        lastMoveAtRef.current = sceneRef.current.elapsedMs;
        lastMoveDirectionRef.current = direction;
      }
    },
    [maxShipOffset, movePlayer],
  );

  useEffect(() => {
    let frameId = 0;
    let previousTime = 0;

    const animate = (time: number) => {
      if (!previousTime) {
        previousTime = time;
      }

      const deltaMs = Math.min(34, time - previousTime);
      previousTime = time;

      if (screenShakeRemainingRef.current > 0) {
        const nextShake = Math.max(0, screenShakeRemainingRef.current - deltaMs);
        screenShakeRemainingRef.current = nextShake;
        setScreenShakeMs(nextShake);
      }

      if (gameStateRef.current === "playing") {
        const isMovementLocked = activeShipId === "helios" && isFireHeldRef.current;

        if (isMovementLocked) {
          heldMoveDirectionRef.current = 0;
          targetShipOffsetRef.current = shipOffsetRef.current;
        } else if (heldMoveDirectionRef.current !== 0) {
          targetShipOffsetRef.current = clamp(
            shipOffsetRef.current + heldMoveDirectionRef.current * moveSpeedPxPerMs * deltaMs,
            -maxShipOffset,
            maxShipOffset,
          );
        }

        const offsetDelta = targetShipOffsetRef.current - shipOffsetRef.current;
        if (Math.abs(offsetDelta) > 0.01) {
          const responseMultiplier =
            heldMoveDirectionRef.current !== 0
              ? 1.22
              : Math.min(2.05, 1 + Math.abs(offsetDelta) / 58);
          const movementStep = moveSpeedPxPerMs * deltaMs * responseMultiplier;
          const nextOffset =
            Math.abs(offsetDelta) <= movementStep
              ? targetShipOffsetRef.current
              : shipOffsetRef.current + Math.sign(offsetDelta) * movementStep;
          applyShipOffset(nextOffset);
        }

        let shouldEnterStageClear = false;

        setScene((currentScene) => {
          const activePlayAreaHeight =
            playAreaHeightRef.current ||
            Math.max(260, heightRef.current * 0.52);
          const currentStage = currentScene.stage || BOSS_STAGE;
          const spawnedEnemies: Enemy[] = [];
          const advancedEnemies: Enemy[] = [];
          const collisionBins = new Map<number, EnemyCollisionCandidate[]>();
          const nextExplosions = currentScene.explosions
            .map((explosion) => ({
              ...explosion,
              ageMs: explosion.ageMs + deltaMs,
            }))
            .filter((explosion) => explosion.ageMs < explosion.maxAgeMs);
          const nextBossLasers = advanceBossLasers(currentScene.bossLasers, deltaMs);
          const nextHealthDrops = currentScene.healthDrops
            .map((drop) => ({
              ...drop,
              ageMs: drop.ageMs + deltaMs,
              y: drop.y + drop.speed * deltaMs,
            }))
            .filter((drop) => drop.y < activePlayAreaHeight + 42);
          const spawnedBullets: Bullet[] = [];
          const spawnedBossLasers: BossLaser[] = [];
          const spawnedHealthDrops: HealthPickup[] = [];
          const nextElapsedMs = currentScene.elapsedMs + deltaMs;
          let nextScore = currentScene.score || 0;
          let nextPlayerHp = currentScene.playerHp ?? playerHp;
          let nextPlayerShield = currentScene.playerShield || 0;
          let nextPlayerDamageFlashMs = Math.max(
            0,
            (currentScene.playerDamageFlashMs || 0) - deltaMs,
          );
          let nextStageKills = currentScene.stageKills || 0;
          let bossDefeated = currentScene.bossDefeated || false;
          const bossSpawnThreshold = getBossSpawnThreshold(currentStage);
          const bossAlreadyActive = currentScene.enemies.some(
            (enemy) => enemy.kind === "boss",
          );
          const stageThreePrepActive =
            currentStage >= 3 && !bossAlreadyActive && !bossSpawnedRef.current;
          let shouldSpawnBoss =
            !bossSpawnedRef.current &&
            !bossAlreadyActive &&
            nextStageKills >= bossSpawnThreshold;
          if (stageThreePrepActive) {
            enemySpawnClockRef.current +=
              deltaMs * (boostRef.current ? 1.6 : 1);

            if (enemySpawnClockRef.current >= nextEnemySpawnMsRef.current) {
              spawnedEnemies.push(
                createEnemy(
                  enemyIdRef.current++,
                  contentWidthRef.current,
                  "boss",
                  currentStage,
                ),
              );
              bossSpawnedRef.current = true;
              enemySpawnClockRef.current = 0;
            }
          } else {
            enemySpawnClockRef.current += deltaMs;
          }

          if (currentStage >= 3) {
            healthDropClockRef.current += deltaMs;
            if (
              nextHealthDrops.length + spawnedHealthDrops.length < 3 &&
              healthDropClockRef.current >= nextHealthDropMsRef.current
            ) {
              healthDropClockRef.current = 0;
              nextHealthDropMsRef.current = 3800 + Math.random() * 2200;
              spawnedHealthDrops.push({
                id: healthDropIdRef.current++,
                x:
                  (Math.random() * 2 - 1) *
                  Math.max(42, contentWidthRef.current * 0.28),
                y: -30,
                speed: 0.06 + Math.random() * 0.03,
                ageMs: 0,
              });
            }
          } else {
            healthDropClockRef.current = 0;
          }
          const shipCenterY =
            activePlayAreaHeight -
            PLAY_AREA_BOTTOM_PADDING -
            SHIP_FRAME_HEIGHT / 2 +
            playerFlightBaseLift +
            (boostRef.current ? -16 : 0) +
            shipLiftOffset;

          const queueExplosion = (
            x: number,
            y: number,
            kind: EnemyKind,
          ) => {
            nextExplosions.push(
              createExplosion(explosionIdRef.current++, x, y, kind),
            );
          };

          const queuePlayerShot = (attackMode: "standard" | "alt") => {
            const cooldown =
              activeShipId === "helios"
                ? standardFireCooldownMs
                : attackMode === "alt"
                  ? pulseChargeMs
                  : standardFireCooldownMs;

            if (nextElapsedMs - lastFireAtRef.current < cooldown) {
              return false;
            }

            const currentShipLift = (boostRef.current ? -16 : 0) + shipLiftOffset;
            const muzzleOriginY =
              activePlayAreaHeight -
              PLAY_AREA_BOTTOM_PADDING -
              SHIP_FRAME_HEIGHT +
              playerFlightBaseLift +
              SHIP_MUZZLE_OFFSET +
              currentShipLift;
            const nextShots = buildShotsForAttack(
              attackMode,
              muzzleOriginY,
              shipOffsetRef.current,
            );

            if (
              nextShots.length === 0 ||
              currentScene.bullets.length + spawnedBullets.length + nextShots.length >
                MAX_ACTIVE_BULLETS
            ) {
              return false;
            }

            spawnedBullets.push(...nextShots);
            lastFireAtRef.current = nextElapsedMs;
            return true;
          };

          if (isFireHeldRef.current) {
            if (activeShipId === "helios") {
              queuePlayerShot("standard");
            } else {
              const heldDuration = nextElapsedMs - fireHoldStartAtRef.current;

              if (heldDuration >= pulseChargeMs) {
                pulseModeRef.current = true;
              }

              if (pulseModeRef.current && queuePlayerShot("alt")) {
                // Alt-shot audio is handled after state updates by observing spawned bullets.
              }
            }
          }

          if (currentStage < 3) {
            while (enemySpawnClockRef.current >= nextEnemySpawnMsRef.current) {
              enemySpawnClockRef.current -= nextEnemySpawnMsRef.current;

              if (shouldSpawnBoss) {
                spawnedEnemies.push(
                  createEnemy(
                    enemyIdRef.current++,
                    contentWidthRef.current,
                    "boss",
                    currentStage,
                  ),
                );
                bossSpawnedRef.current = true;
                shouldSpawnBoss = false;
                break;
              } else {
                const activeHostileCount = currentScene.enemies.filter(
                  (enemy) => enemy.kind !== "boss",
                ).length;
                const pendingHostileCount = spawnedEnemies.filter(
                  (enemy) => enemy.kind !== "boss",
                ).length;
                const maxHostiles = getStageMaxHostiles(currentStage);
                const spawnKind = getStageEnemySpawnKind(currentStage);

                if (activeHostileCount + pendingHostileCount < maxHostiles) {
                  spawnedEnemies.push(
                    createEnemy(
                      enemyIdRef.current++,
                      contentWidthRef.current,
                      spawnKind,
                      currentStage,
                    ),
                  );
                }
              }

              nextEnemySpawnMsRef.current = getNextEnemySpawnDelay(currentStage);
            }
          }

          for (const enemy of currentScene.enemies) {
          const advancedEnemy: Enemy = {
              ...enemy,
              x:
                (enemy.frozenUntilMs ?? 0) > nextElapsedMs
                  ? enemy.x
                  : enemy.kind === "boss"
                    ? Math.sin(nextElapsedMs / 1200 + enemy.wobblePhase) *
                      Math.max(
                        28,
                        contentWidthRef.current * 0.22,
                      )
                    : enemy.x + enemy.drift * deltaMs,
              y:
                (enemy.frozenUntilMs ?? 0) > nextElapsedMs
                  ? enemy.y
                  : enemy.y + enemy.speed * deltaMs,
              fireClockMs: enemy.fireClockMs + deltaMs,
              hitFlashMs: Math.max(0, (enemy.hitFlashMs || 0) - deltaMs),
            };

            if (
              shouldLaunchBossLaser(
                advancedEnemy,
                currentStage,
                advancedEnemy.fireClockMs,
              )
            ) {
              const bossLaserOriginY = getBossLaserOriginY(advancedEnemy, nextElapsedMs);
              const bossLaserOriginX = clamp(
                shipOffsetRef.current,
                -maxShipOffset,
                maxShipOffset,
              );

              if (currentStage >= 3) {
                spawnedBossLasers.push(
                  createBossLaser(
                    bossLaserIdRef.current++,
                    bossLaserOriginX,
                    bossLaserOriginY,
                    "stage3",
                  ),
                );

                const supportCount = 1 + (Math.random() > 0.45 ? 1 : 0);
                for (let supportIndex = 0; supportIndex < supportCount; supportIndex += 1) {
                  const offset = supportIndex === 0 ? -76 : 76;
                  const supportEnemy = createEnemy(
                    enemyIdRef.current++,
                    contentWidthRef.current,
                    "grunt",
                    currentStage,
                  );
                  supportEnemy.x = clamp(
                    advancedEnemy.x + offset,
                    -Math.max(40, contentWidthRef.current / 2 - 42),
                    Math.max(40, contentWidthRef.current / 2 - 42),
                  );
                  supportEnemy.y = advancedEnemy.y + 20;
                  supportEnemy.speed = 0.042 + Math.random() * 0.026;
                  supportEnemy.drift = offset < 0 ? -0.014 : 0.014;
                  supportEnemy.scale = 0.82 + Math.random() * 0.12;
                  supportEnemy.hp = 2;
                  supportEnemy.maxHp = 2;
                  supportEnemy.modelVariant = 'enemy2';
                  supportEnemy.fireCooldownMs = 2100 + Math.random() * 700;
                  spawnedEnemies.push(supportEnemy);
                }
              } else if (currentStage === 2) {
                spawnedBossLasers.push(
                  createBossLaser(
                    bossLaserIdRef.current++,
                    clamp(bossLaserOriginX - 42, -maxShipOffset, maxShipOffset),
                    bossLaserOriginY,
                    "stage2",
                  ),
                );
                spawnedBossLasers.push(
                  createBossLaser(
                    bossLaserIdRef.current++,
                    clamp(bossLaserOriginX + 42, -maxShipOffset, maxShipOffset),
                    bossLaserOriginY,
                    "stage2",
                  ),
                );
              } else {
                spawnedBossLasers.push(
                  createBossLaser(
                    bossLaserIdRef.current++,
                    bossLaserOriginX,
                    bossLaserOriginY,
                    "stage1",
                  ),
                );
              }
              advancedEnemy.fireClockMs = 0;
            }

            advancedEnemies.push(advancedEnemy);

            const centerX = getEnemyCenterX(advancedEnemy, nextElapsedMs);
            const centerY = getEnemyCenterY(advancedEnemy, nextElapsedMs);
            const halfWidth =
              (getEnemyFrameWidth(advancedEnemy.kind) * advancedEnemy.scale) / 2;
            const halfHeight =
              (getEnemyFrameHeight(advancedEnemy.kind) * advancedEnemy.scale) / 2;
            const candidate: EnemyCollisionCandidate = {
              enemy: advancedEnemy,
              centerX,
              centerY,
              halfWidth,
              halfHeight,
            };

            const startBin = Math.floor(
              (centerX - halfWidth) / COLLISION_BIN_WIDTH,
            );
            const endBin = Math.floor(
              (centerX + halfWidth) / COLLISION_BIN_WIDTH,
            );

            for (let bin = startBin; bin <= endBin; bin += 1) {
              const list = collisionBins.get(bin);
              if (list) {
                list.push(candidate);
              } else {
                collisionBins.set(bin, [candidate]);
              }
            }
          }

          for (const enemy of spawnedEnemies) {
            const advancedEnemy: Enemy = {
              ...enemy,
              fireClockMs: enemy.fireClockMs + deltaMs,
            };
            advancedEnemies.push(advancedEnemy);
          }

          const survivingBullets: Bullet[] = [];
          const survivingEnemies: Enemy[] = [];
          const hitEnemyIds = new Set<number>();

          const resolveEnemyKill = (candidate: EnemyCollisionCandidate) => {
            const enemy = candidate.enemy;
            if (hitEnemyIds.has(enemy.id)) {
              return;
            }

            hitEnemyIds.add(enemy.id);
            nextScore += getEnemyScore(enemy.kind);

            if (enemy.kind === "boss") {
              bossDefeated = true;
              shouldEnterStageClear = true;
              if (currentStage === BOSS_STAGE) {
                nextPlayerShield = shieldPoints;
              }
            } else {
              nextStageKills += 1;
            }

            queueExplosion(candidate.centerX, candidate.centerY, enemy.kind);
          };

          for (const bullet of currentScene.bullets) {
            const bulletWidth =
              bullet.kind === "beam" ? 30 : getBulletWidth(bullet.kind);
            const bulletHeight =
              bullet.kind === "beam"
                ? Math.max(1, bullet.beamLength ?? bullet.y)
                : getBulletHeight(bullet.kind);
            const nextBullet: Bullet = {
              ...bullet,
              ageMs: (bullet.ageMs ?? 0) + deltaMs,
            };

            if (bullet.kind === "beam") {
              nextBullet.x = shipOffsetRef.current;
            } else if (bullet.kind === "seekerPod") {
              let nearestEnemy: EnemyCollisionCandidate | null = null;

              for (const enemy of advancedEnemies) {
                if (hitEnemyIds.has(enemy.id)) {
                  continue;
                }

                const centerX = getEnemyCenterX(enemy, nextElapsedMs);
                const centerY = getEnemyCenterY(enemy, nextElapsedMs);
                const distance = Math.hypot(centerX - nextBullet.x, centerY - nextBullet.y);

                if (!nearestEnemy || distance < Math.hypot(nearestEnemy.centerX - nextBullet.x, nearestEnemy.centerY - nextBullet.y)) {
                  nearestEnemy = {
                    enemy,
                    centerX,
                    centerY,
                    halfWidth: 0,
                    halfHeight: 0,
                  };
                }
              }

              if (nearestEnemy) {
                const desiredVx = clamp(
                  (nearestEnemy.centerX - nextBullet.x) * 0.0055,
                  -0.24,
                  0.24,
                );
                nextBullet.vx = (nextBullet.vx ?? 0) * 0.7 + desiredVx * 0.3;
              }
              nextBullet.x += (nextBullet.vx ?? 0) * deltaMs;
              nextBullet.y -= deltaMs * getBulletSpeed(bullet.kind);
            } else {
              nextBullet.x += (nextBullet.vx ?? 0) * deltaMs;
              nextBullet.y -= deltaMs * getBulletSpeed(bullet.kind);
            }

            if (
              nextBullet.y + bulletHeight <= -80 ||
              nextBullet.x < -contentWidthRef.current * 0.7 ||
              nextBullet.x > contentWidthRef.current * 0.7 ||
              (nextBullet.maxAgeMs != null && (nextBullet.ageMs ?? 0) >= nextBullet.maxAgeMs)
            ) {
              continue;
            }

            const bulletCenterY = nextBullet.y + bulletHeight / 2;
            let didHitEnemy = false;
            const bulletBin = Math.floor(nextBullet.x / COLLISION_BIN_WIDTH);
            const checkedEnemyIds = new Set<number>();
            const collisionCandidates = [
              ...(collisionBins.get(bulletBin - 1) ?? []),
              ...(collisionBins.get(bulletBin) ?? []),
              ...(collisionBins.get(bulletBin + 1) ?? []),
            ];
            const impactedCandidates: EnemyCollisionCandidate[] = [];

            for (const candidate of collisionCandidates) {
              const enemy = candidate.enemy;
              if (hitEnemyIds.has(enemy.id)) {
                continue;
              }

              if (checkedEnemyIds.has(enemy.id)) {
                continue;
              }

              checkedEnemyIds.add(enemy.id);
              const hitPaddingX =
                bullet.kind === "pulse"
                  ? 26
                  : bullet.kind === "beam"
                    ? 12
                    : bullet.kind === "electricOrb"
                      ? 10
                      : bullet.kind === "seekerPod"
                        ? 8
                        : 0;
              const hitPaddingY =
                bullet.kind === "pulse"
                  ? 18
                  : bullet.kind === "beam"
                    ? 22
                    : bullet.kind === "electricOrb"
                      ? 10
                      : bullet.kind === "plasmaPellet"
                        ? 4
                        : 0;

              const bulletHitX =
                Math.abs(nextBullet.x - candidate.centerX) <=
                candidate.halfWidth +
                  bulletWidth / 2 +
                  hitPaddingX;
              const bulletHitY =
                Math.abs(bulletCenterY - candidate.centerY) <=
                candidate.halfHeight +
                  bulletHeight / 2 +
                  hitPaddingY;

              if (bulletHitX && bulletHitY) {
                impactedCandidates.push(candidate);
                if ((bullet.pierce ?? 0) <= 0 && bullet.kind !== "pulse") {
                  break;
                }
              }
            }

            if (impactedCandidates.length > 0) {
              didHitEnemy = true;
              const bulletDamage = bullet.damage ?? getBulletDamage(bullet.kind);
              const impactCenterX = impactedCandidates[0].centerX;
              const impactCenterY = impactedCandidates[0].centerY;

            if (bullet.kind === "beam") {
              const beamTickMs = nextBullet.beamTickMs ?? 84;
              const lastBeamHitMs = nextBullet.lastBeamHitMs ?? -Infinity;
              const beamAgeMs = nextBullet.ageMs ?? 0;
              if (beamAgeMs - lastBeamHitMs < beamTickMs) {
                  survivingBullets.push(nextBullet);
                  continue;
                }

                nextBullet.lastBeamHitMs = beamAgeMs;
              }

              for (const candidate of impactedCandidates) {
                if (hitEnemyIds.has(candidate.enemy.id)) {
                  continue;
                }

                if (candidate.enemy.hp > bulletDamage) {
                  candidate.enemy.hp -= bulletDamage;
                  candidate.enemy.hitFlashMs = 180;
                  if (
                    bullet.sourceShipId === "nova" &&
                    candidate.enemy.kind !== "boss"
                  ) {
                    candidate.enemy.frozenUntilMs = Math.max(
                      candidate.enemy.frozenUntilMs ?? 0,
                      nextElapsedMs + NOVA_FREEZE_DURATION_MS,
                    );
                    candidate.enemy.frozenCenterX = candidate.centerX;
                    candidate.enemy.frozenCenterY = candidate.centerY;
                  }
                } else {
                  resolveEnemyKill(candidate);
                }
              }

              if (bullet.blastRadius && bullet.blastRadius > 0) {
                for (const enemy of advancedEnemies) {
                  if (hitEnemyIds.has(enemy.id)) {
                    continue;
                  }

                  const enemyCenterX = getEnemyCenterX(enemy, nextElapsedMs);
                  const enemyCenterY = getEnemyCenterY(enemy, nextElapsedMs);
                  const distance = Math.hypot(
                    enemyCenterX - impactCenterX,
                    enemyCenterY - impactCenterY,
                  );

                  if (distance > bullet.blastRadius) {
                    continue;
                  }

                  const splashDamage = Math.max(
                    bulletDamage * 0.3,
                    bulletDamage * (1 - distance / bullet.blastRadius),
                  );

                  if (enemy.hp > splashDamage) {
                    enemy.hp -= splashDamage;
                    enemy.hitFlashMs = 160;
                  } else {
                    resolveEnemyKill({
                      enemy,
                      centerX: enemyCenterX,
                      centerY: enemyCenterY,
                      halfWidth:
                        (getEnemyFrameWidth(enemy.kind) * enemy.scale) / 2,
                      halfHeight:
                        (getEnemyFrameHeight(enemy.kind) * enemy.scale) / 2,
                    });
                  }
                }
              }

              if (bullet.kind === "beam") {
                survivingBullets.push(nextBullet);
                continue;
              }

              if ((nextBullet.pierce ?? 0) > 0) {
                nextBullet.pierce = Math.max(
                  0,
                  (nextBullet.pierce ?? 0) - impactedCandidates.length,
                );
                if ((nextBullet.pierce ?? 0) > 0) {
                  survivingBullets.push(nextBullet);
                }
              }
            }

            if (!didHitEnemy) {
              survivingBullets.push(nextBullet);
            }
          }

          for (const enemy of advancedEnemies) {
            if (hitEnemyIds.has(enemy.id)) {
              continue;
            }

            const frameWidth = getEnemyFrameWidth(enemy.kind) * enemy.scale;
            const frameHeight = getEnemyFrameHeight(enemy.kind) * enemy.scale;
            const centerX = getEnemyCenterX(enemy, nextElapsedMs);
            const centerY = getEnemyCenterY(enemy, nextElapsedMs);
            const shipCollisionX =
              Math.abs(centerX - shipOffsetRef.current) <=
              SHIP_BOUNDING_WIDTH / 2 + frameWidth * 0.26;
            const shipCollisionY =
              Math.abs(centerY - shipCenterY) <=
              SHIP_COLLISION_HEIGHT + frameHeight * 0.24;

            if (shipCollisionX && shipCollisionY) {
              const damageResult = applyPlayerDamage(
                nextPlayerShield,
                nextPlayerHp,
                getEnemyDamage(enemy.kind),
              );
              nextPlayerShield = damageResult.playerShield;
              nextPlayerHp = damageResult.playerHp;
              nextPlayerDamageFlashMs = 240;
              queueExplosion(centerX, centerY, enemy.kind);
              continue;
            }

            if (centerY - frameHeight / 2 > activePlayAreaHeight + 20) {
              const damageResult = applyPlayerDamage(
                nextPlayerShield,
                nextPlayerHp,
                getEnemyDamage(enemy.kind),
              );
              nextPlayerShield = damageResult.playerShield;
              nextPlayerHp = damageResult.playerHp;
              nextPlayerDamageFlashMs = 240;
              continue;
            }

            survivingEnemies.push(enemy);
          }

          const survivingHealthDrops: HealthPickup[] = [];
          for (const drop of nextHealthDrops) {
            const dropCenterX = drop.x;
            const dropCenterY = drop.y;
            const shipCollisionX =
              Math.abs(dropCenterX - shipOffsetRef.current) <=
              SHIP_BOUNDING_WIDTH / 2 + 16;
            const shipCollisionY =
              Math.abs(dropCenterY - shipCenterY) <= SHIP_COLLISION_HEIGHT + 18;

            if (shipCollisionX && shipCollisionY) {
              nextPlayerHp = Math.min(playerHp, nextPlayerHp + 1);
              nextPlayerDamageFlashMs = Math.max(0, nextPlayerDamageFlashMs - 40);
              continue;
            }

            survivingHealthDrops.push(drop);
          }

          for (const laser of nextBossLasers) {
            if (
              !doesBossLaserHitShip(
                laser,
                shipOffsetRef.current,
                shipCenterY,
                SHIP_BOUNDING_WIDTH,
              )
            ) {
              continue;
            }

            const damageResult = applyPlayerDamage(
              nextPlayerShield,
              nextPlayerHp,
              1,
            );
            nextPlayerShield = damageResult.playerShield;
            nextPlayerHp = damageResult.playerHp;
            nextPlayerDamageFlashMs = 240;
            laser.hasHitPlayer = true;
          }

          if (shouldEnterStageClear) {
            return {
              elapsedMs: nextElapsedMs,
              travel:
                currentScene.travel +
                deltaMs *
                  (boostRef.current ? BOOST_TRAVEL_PER_MS : NORMAL_TRAVEL_PER_MS),
              score: nextScore,
              playerHp: nextPlayerHp,
              playerShield: nextPlayerShield,
              playerDamageFlashMs: nextPlayerDamageFlashMs,
              stage: currentStage,
              stageKills: nextStageKills,
              bossDefeated,
              bullets: [],
              enemies: [],
              bossLasers: [],
              healthDrops: [],
              explosions: nextExplosions,
              lives: nextPlayerHp,
            };
          }

          return {
            elapsedMs: nextElapsedMs,
            travel:
              currentScene.travel +
                deltaMs *
                  (boostRef.current ? BOOST_TRAVEL_PER_MS : NORMAL_TRAVEL_PER_MS),
            score: nextScore,
            playerHp: nextPlayerHp,
            playerShield: nextPlayerShield,
            playerDamageFlashMs: nextPlayerDamageFlashMs,
            stage: currentStage,
            stageKills: nextStageKills,
            bossDefeated,
            bullets: [...survivingBullets, ...spawnedBullets],
            enemies: survivingEnemies,
            bossLasers: [...nextBossLasers, ...spawnedBossLasers],
            healthDrops: [...survivingHealthDrops, ...spawnedHealthDrops],
            explosions: nextExplosions,
            lives: nextPlayerHp,
          };
        });
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [
    applyShipOffset,
    activeShipId,
    buildShotsForAttack,
    maxShipOffset,
    moveSpeedPxPerMs,
    pulseChargeMs,
    playerHp,
    playerFlightBaseLift,
    standardFireCooldownMs,
    shieldPoints,
    shipLiftOffset,
  ]);

  useEffect(() => {
    const previousScene = previousSceneSnapshotRef.current;

    if (gameState === "playing") {
      const previousEnemyIds = new Set(previousScene.enemies.map((enemy) => enemy.id));
      const previousBulletIds = new Set(previousScene.bullets.map((bullet) => bullet.id));
      const previousBossLaserIds = new Set(previousScene.bossLasers.map((laser) => laser.id));
      const previousExplosionIds = new Set(previousScene.explosions.map((explosion) => explosion.id));
      const currentHealthDropIds = new Set(scene.healthDrops.map((drop) => drop.id));
      const spawnedBoss = scene.enemies.some(
        (enemy) => enemy.kind === "boss" && !previousEnemyIds.has(enemy.id),
      );
      const spawnedHostile = scene.enemies.some(
        (enemy) => enemy.kind !== "boss" && !previousEnemyIds.has(enemy.id),
      );
      const spawnedPulseBullet = scene.bullets.some(
        (bullet) => bullet.kind === "pulse" && !previousBulletIds.has(bullet.id),
      );
      const spawnedMissileBullet = scene.bullets.some(
        (bullet) => bullet.kind === "missile" && !previousBulletIds.has(bullet.id),
      );
      const spawnedNeedleBullet = scene.bullets.some(
        (bullet) => bullet.kind === "needle" && !previousBulletIds.has(bullet.id),
      );
      const spawnedElectricBullet = scene.bullets.some(
        (bullet) => bullet.kind === "electricOrb" && !previousBulletIds.has(bullet.id),
      );
      const spawnedBeamBullet = scene.bullets.some(
        (bullet) => bullet.kind === "beam" && !previousBulletIds.has(bullet.id),
      );
      const spawnedPlasmaBullet = scene.bullets.some(
        (bullet) => bullet.kind === "plasmaPellet" && !previousBulletIds.has(bullet.id),
      );
      const spawnedSeekerBullet = scene.bullets.some(
        (bullet) => bullet.kind === "seekerPod" && !previousBulletIds.has(bullet.id),
      );
      const spawnedNovaBullet = scene.bullets.some(
        (bullet) => bullet.kind === "novaPulse" && !previousBulletIds.has(bullet.id),
      );
      const spawnedBossLaser = scene.bossLasers.some(
        (laser) => !previousBossLaserIds.has(laser.id),
      );
      const collectedHealthDrop = previousScene.healthDrops.some(
        (drop) => !currentHealthDropIds.has(drop.id),
      );
      const explosionSpawned = scene.explosions.some(
        (explosion) => !previousExplosionIds.has(explosion.id),
      );
      const playerTookDamage =
        scene.playerHp < previousScene.playerHp ||
        scene.playerShield < previousScene.playerShield;
      const bossJustDefeated = scene.bossDefeated && !previousScene.bossDefeated;
      const playerJustDied = scene.playerHp <= 0 && previousScene.playerHp > 0;

      if (spawnedBoss) {
        void playSoundSafely(bossPlayer, isSfxEnabledRef.current);
      }

      if (spawnedHostile) {
        void playSoundSafely(wavePlayer, isSfxEnabledRef.current, true, false);
      }

      if (spawnedPulseBullet) {
        void playSoundSafely(pulsePlayer, isSfxEnabledRef.current);
      }

      if (spawnedMissileBullet) {
        void playSoundSafely(blasterTwoPlayer, isSfxEnabledRef.current);
      }

      if (spawnedNeedleBullet) {
        void playSoundSafely(blipPlayer, isSfxEnabledRef.current);
      }

      if (spawnedElectricBullet) {
        void playSoundSafely(blasterThreePlayer, isSfxEnabledRef.current);
      }

      if (spawnedBeamBullet) {
        void playSoundSafely(alienBlasterPlayer, isSfxEnabledRef.current, true, false);
      }

      if (spawnedPlasmaBullet) {
        void playSoundSafely(blasterThreePlayer, isSfxEnabledRef.current);
      }

      if (spawnedSeekerBullet) {
        void playSoundSafely(incomingPlayer, isSfxEnabledRef.current);
      }

      if (spawnedNovaBullet) {
        void playSoundSafely(blasterTwoPlayer, isSfxEnabledRef.current);
      }

      if (spawnedBossLaser) {
        if (scene.stage >= 3) {
          void playSoundSafely(alienBlasterPlayer, isSfxEnabledRef.current);
        } else if (scene.stage === 2) {
          void playSoundSafely(blasterThreePlayer, isSfxEnabledRef.current);
        } else {
          void playSoundSafely(bossPlayer, isSfxEnabledRef.current);
        }
      }

      if (collectedHealthDrop) {
        void playSoundSafely(blipPlayer, isSfxEnabledRef.current);
      }

      if ((explosionSpawned || playerTookDamage) && !bossJustDefeated && !playerJustDied) {
        void playSoundSafely(destroyPlayer, isSfxEnabledRef.current);
      }
    }

    previousSceneSnapshotRef.current = scene;
  }, [
    applyShipOffset,
    alienBlasterPlayer,
    bossPlayer,
    destroyPlayer,
    blasterThreePlayer,
    blasterTwoPlayer,
    gameState,
    maxShipOffset,
    moveSpeedPxPerMs,
    blipPlayer,
    incomingPlayer,
    pulsePlayer,
    scene,
    wavePlayer,
  ]);

  useEffect(() => {
    if (gameState === "playing" && scene.playerHp <= 0) {
      setLastRunScore(scene.score);
      setGameState("gameOver");
      setIsBoosting(false);
      heldMoveDirectionRef.current = 0;
      targetShipOffsetRef.current = shipOffsetRef.current;
      void resetSoundSafely(boostPlayer);
      void resetSoundSafely(pulsePlayer);
      void playSoundSafely(playerDeathPlayer, isSfxEnabledRef.current);
    }
  }, [
    boostPlayer,
    gameState,
    playerDeathPlayer,
    pulsePlayer,
    scene.playerHp,
    scene.score,
    setLastRunScore,
  ]);

  useEffect(() => {
    if (gameState === "playing" && scene.bossDefeated) {
      const nextClearance = getStageClearanceAfterClear(
        stageClearance,
        scene.stage,
      );
      const newlyUnlockedShips = getNewlyUnlockedHangarShips(
        stageClearance,
        nextClearance,
      );

      setLastRunScore(scene.score);
      setHighestClearedStage(nextClearance);
      setStageClearAnnouncement(
        newlyUnlockedShips.length > 0
          ? newlyUnlockedShips.map((ship) => ship.name).join(", ")
          : null,
      );
      setIsBoosting(false);
      setIsFireHeld(false);
      isFireHeldRef.current = false;
      heldMoveDirectionRef.current = 0;
      targetShipOffsetRef.current = shipOffsetRef.current;
      pulseModeRef.current = false;
      fireHoldStartAtRef.current = 0;
      void resetSoundSafely(boostPlayer);
      screenShakeRemainingRef.current = 480;
      setScreenShakeMs(480);
      void playSoundSafely(bossDestroyedPlayer, isSfxEnabledRef.current);
      void playSoundSafely(victoryPlayer, isSfxEnabledRef.current);
      setGameState("stageClear");
    }
  }, [
    bossDestroyedPlayer,
    boostPlayer,
    gameState,
    scene.bossDefeated,
    scene.score,
    scene.stage,
    stageClearance,
    setLastRunScore,
    setHighestClearedStage,
    victoryPlayer,
  ]);

  const resetRunState = useCallback(() => {
    setIsBoosting(false);
    setIsFireHeld(false);
    setStageClearAnnouncement(null);
    setShipOffset(0);
    lastMoveAtRef.current = 0;
    lastMoveDirectionRef.current = 0;
    lastMoveSoundAtRef.current = 0;
    lastFireAtRef.current = -FIRE_COOLDOWN_MS;
    bulletIdRef.current = 0;
    enemyIdRef.current = 0;
    explosionIdRef.current = 0;
    bossLaserIdRef.current = 0;
    healthDropIdRef.current = 0;
    enemySpawnClockRef.current = 0;
    nextEnemySpawnMsRef.current = 1200;
    bossSpawnedRef.current = false;
    healthDropClockRef.current = 0;
    nextHealthDropMsRef.current = 4800;
    isFireHeldRef.current = false;
    heldMoveDirectionRef.current = 0;
    pulseModeRef.current = false;
    fireHoldStartAtRef.current = 0;
    targetShipOffsetRef.current = 0;
    screenShakeRemainingRef.current = 0;
    setScreenShakeMs(0);
    setScene({
      elapsedMs: 0,
      travel: 0,
      score: 0,
      playerHp,
      playerShield: 0,
      playerDamageFlashMs: 0,
      stage: BOSS_STAGE,
      stageKills: 0,
      bossDefeated: false,
      bullets: [],
      enemies: [],
      bossLasers: [],
      healthDrops: [],
      explosions: [],
      lives: playerHp,
    });
  }, [playerHp]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    refreshActiveShip();

    const requestId = getMainMenuReturnRequestId();
    if (
      requestId === 0 ||
      requestId === handledMainMenuReturnRequestRef.current
    ) {
      return;
    }

    handledMainMenuReturnRequestRef.current = requestId;
    setLastRunScore(sceneRef.current.score);
    setGameState("menu");
    setMenuPanel("main");
    setStageClearAnnouncement(null);
    resetRunState();
    void resetSoundSafely(boostPlayer);
  }, [
    boostPlayer,
    isFocused,
    playerHp,
    refreshActiveShip,
    resetRunState,
    setLastRunScore,
    shieldPoints,
  ]);

  const startGame = () => {
    resetRunState();
    setGameState("playing");
  };

  const togglePause = () => {
    if (gameState === "playing") {
      setGameState("paused");
      setIsBoosting(false);
      setIsFireHeld(false);
      isFireHeldRef.current = false;
      pulseModeRef.current = false;
      fireHoldStartAtRef.current = 0;
      heldMoveDirectionRef.current = 0;
      targetShipOffsetRef.current = shipOffsetRef.current;
      void resetSoundSafely(boostPlayer);
      void resetSoundSafely(pulsePlayer);
      return;
    }

    if (gameState === "paused") {
      setGameState("playing");
    }
  };

  const continueToNextStage = () => {
    if (gameState !== "stageClear" || scene.stage >= 3) {
      return;
    }

    const nextStage = scene.stage + 1;
    setScene((currentScene) => ({
      ...currentScene,
      stage: nextStage,
      stageKills: 0,
      bossDefeated: false,
      playerDamageFlashMs: 0,
      bullets: [],
      enemies: [],
      bossLasers: [],
      healthDrops: [],
      explosions: [],
    }));
    enemySpawnClockRef.current = 0;
    nextEnemySpawnMsRef.current = nextStage >= 3 ? 30000 : 1100;
    bossSpawnedRef.current = false;
    healthDropClockRef.current = 0;
    nextHealthDropMsRef.current = 4800;
    isFireHeldRef.current = false;
    heldMoveDirectionRef.current = 0;
    pulseModeRef.current = false;
    fireHoldStartAtRef.current = 0;
    targetShipOffsetRef.current = shipOffsetRef.current;
    screenShakeRemainingRef.current = 0;
    setScreenShakeMs(0);
    setIsFireHeld(false);
    setStageClearAnnouncement(null);
    setGameState("playing");
  };

  const returnToMenuFromStageClear = () => {
    setLastRunScore(scene.score);
    setGameState("menu");
    setMenuPanel("main");
    setStageClearAnnouncement(null);
    resetRunState();
    void resetSoundSafely(boostPlayer);
  };

  const returnToMenu = () => {
    setLastRunScore(scene.score);
    setGameState("menu");
    setMenuPanel("main");
    setStageClearAnnouncement(null);
    resetRunState();
    void resetSoundSafely(boostPlayer);
  };

  const spawnPlayerShot = (kind: BulletKind) => {
    if (gameStateRef.current !== "playing") {
      return false;
    }

    const currentScene = sceneRef.current;
    const cooldown =
      activeShipId === "helios" ? standardFireCooldownMs : kind === "pulse" ? pulseChargeMs : standardFireCooldownMs;

    if (currentScene.elapsedMs - lastFireAtRef.current < cooldown) {
      return false;
    }

    const activePlayAreaHeight =
      playAreaHeightRef.current || Math.max(260, heightRef.current * 0.52);
    const currentShipLift = (boostRef.current ? -16 : 0) + shipLiftOffset;
    const muzzleOriginY =
      activePlayAreaHeight -
      PLAY_AREA_BOTTOM_PADDING -
      SHIP_FRAME_HEIGHT +
      playerFlightBaseLift +
      SHIP_MUZZLE_OFFSET +
      currentShipLift;
    const nextShots = buildShotsForAttack(
      kind === "pulse" ? "alt" : "standard",
      muzzleOriginY,
      shipOffsetRef.current,
    );

    if (
      nextShots.length === 0 ||
      currentScene.bullets.length + nextShots.length > MAX_ACTIVE_BULLETS
    ) {
      return false;
    }

    lastFireAtRef.current = currentScene.elapsedMs;

    setScene((currentSceneState) => ({
      ...currentSceneState,
      bullets:
        currentSceneState.bullets.length + nextShots.length > MAX_ACTIVE_BULLETS
          ? currentSceneState.bullets
          : [...currentSceneState.bullets, ...nextShots],
    }));

    return true;
  };

  const moveShipToOffset = (targetOffset: number) => {
    if (gameStateRef.current !== "playing" || movementLockedWhileFiring) {
      return;
    }

    heldMoveDirectionRef.current = 0;
    targetShipOffsetRef.current = clamp(targetOffset, -maxShipOffset, maxShipOffset);
  };

  const handleMoveStart = (direction: -1 | 1) => {
    if (gameStateRef.current !== "playing" || movementLockedWhileFiring) {
      return;
    }

    heldMoveDirectionRef.current = direction;
    targetShipOffsetRef.current = shipOffsetRef.current;
  };

  const handleMoveEnd = (direction: -1 | 1) => {
    if (heldMoveDirectionRef.current !== direction) {
      return;
    }

    heldMoveDirectionRef.current = 0;
    targetShipOffsetRef.current = shipOffsetRef.current;
  };

  const handleTouchMoveShip = (event: GestureResponderEvent) => {
    if (gameStateRef.current !== "playing" || movementLockedWhileFiring) {
      return;
    }

    moveShipToOffset(event.nativeEvent.locationX - contentWidthRef.current / 2);
  };

  const handleFirePressIn = () => {
    if (gameStateRef.current !== "playing") {
      return;
    }

    isFireHeldRef.current = true;
    pulseModeRef.current = false;
    fireHoldStartAtRef.current = sceneRef.current.elapsedMs;
    setIsFireHeld(true);

    if (activeShipId !== "helios" && spawnPlayerShot("standard")) {
      void playSoundSafely(firePlayer, isSfxEnabledRef.current);
    }
  };

  const handleFirePressOut = () => {
    isFireHeldRef.current = false;
    pulseModeRef.current = false;
    fireHoldStartAtRef.current = 0;
    setIsFireHeld(false);
    if (activeShipId === "helios") {
      setScene((currentScene) => ({
        ...currentScene,
        bullets: currentScene.bullets.filter((bullet) => bullet.kind !== "beam"),
      }));
    }
  };

  const handleBoostStart = () => {
    if (gameState !== "playing" || boostRef.current) {
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

  const handlePlayAreaLayout = (event: LayoutChangeEvent) => {
    setPlayAreaHeight(event.nativeEvent.layout.height);
  };

  const toggleControlLayout = () => {
    setControlLayout((current) =>
      current === "classic" ? "split" : "classic",
    );
  };

  const isManeuvering = scene.elapsedMs - lastMoveAtRef.current < 220;
  const bankProgress = Math.max(
    0,
    1 - (scene.elapsedMs - lastMoveAtRef.current) / 220,
  );
  const shipBank = lastMoveDirectionRef.current
    ? Math.max(
        -15,
        Math.min(
          15,
          lastMoveDirectionRef.current *
            Math.pow(bankProgress, 0.72) *
            13 *
            shipBankMultiplier,
        ),
      )
    : 0;
  const shipLift = playerFlightBaseLift + (isBoosting ? -16 : 0) + shipLiftOffset;
  const motionIntensity = isBoosting ? 1 : isManeuvering ? 0.45 : 0.14;
  const travelAmount = gameState === "playing" ? scene.travel : 0;
  const highScoreDisplay = String(highScore).padStart(4, "0");
  const lastRunDisplay = String(lastRunScore).padStart(4, "0");
  const shieldUnlocked =
    scene.stage > BOSS_STAGE || gameState === "stageClear" || scene.playerShield > 0;
  const visibleShieldPoints = shieldUnlocked ? shieldPoints : 0;
  const shakeStrength = Math.min(14, screenShakeMs / 26);
  const shakeOffsetX =
    screenShakeMs > 0 ? Math.sin(screenShakeMs * 0.2) * shakeStrength : 0;
  const shakeOffsetY =
    screenShakeMs > 0 ? Math.cos(screenShakeMs * 0.32) * (shakeStrength * 0.65) : 0;
  const getBulletShellVariant = (bullet: Bullet) => {
    switch (bullet.kind) {
      case "missile":
        return {
          backgroundColor: "#5A6678",
          shadowColor: "#AAB7C6",
          shadowRadius: 12,
        };
      case "needle":
        return {
          backgroundColor: "#B9FFAF",
          shadowColor: "#C8FFB4",
          shadowRadius: 8,
        };
      case "electricOrb":
        return {
          backgroundColor: "#8CB2FF",
          shadowColor: "#B8C8FF",
          shadowRadius: 14,
        };
      case "beam":
        return {
          backgroundColor: "rgba(255, 191, 102, 0.58)",
          shadowColor: "#FFD37C",
          shadowRadius: 16,
          opacity: 0.92,
        };
      case "plasmaPellet":
        return {
          backgroundColor: "#D4A1FF",
          shadowColor: "#E0B9FF",
          shadowRadius: 10,
        };
      case "seekerPod":
        return {
          backgroundColor: "#FF9F8C",
          shadowColor: "#FFB5AA",
          shadowRadius: 12,
        };
      case "novaPulse":
        return {
          backgroundColor: "#7BEAFF",
          shadowColor: "#C2FBFF",
          shadowRadius: 12,
        };
      case "pulse":
        return {
          backgroundColor: "#82B9FF",
          shadowColor: "#9FD5FF",
          shadowRadius: 14,
        };
      case "standard":
      default:
        return null;
    }
  };
  const getBulletCoreVariant = (bullet: Bullet) => {
    switch (bullet.kind) {
      case "missile":
        return { width: 5, backgroundColor: "#F8E8B8" };
      case "needle":
        return { width: 2, backgroundColor: "#F6FFF3" };
      case "electricOrb":
        return { width: getBulletWidth(bullet.kind) - 6, backgroundColor: "#F1F6FF" };
      case "beam":
        return { width: 6, backgroundColor: "#FFF8E8", opacity: 0.96 };
      case "plasmaPellet":
        return { width: getBulletWidth(bullet.kind) - 5, backgroundColor: "#FFF2FF" };
      case "seekerPod":
        return { width: 6, backgroundColor: "#FFF1E8" };
      case "novaPulse":
        return { width: 3, backgroundColor: "#FEFFFF" };
      case "pulse":
        return { width: 12, backgroundColor: "#EAF5FF", opacity: 0.92 };
      case "standard":
      default:
        return null;
    }
  };

  return (
    <View
      style={[
        styles.screen,
        gameState === "menu" ? styles.screenMenu : styles.screenInGame,
        screenShakeMs > 0
          ? {
              transform: [
                { translateX: shakeOffsetX },
                { translateY: shakeOffsetY },
              ],
            }
          : null,
      ]}
    >
      <View style={styles.spaceLayer} pointerEvents="none">
        <View style={styles.deepSpaceVignette} />
        <View style={styles.infiniteVoid} />
        <View
          style={[
            styles.milkyWayBand,
            {
              transform: [
                {
                  translateX: gameState === "playing" ? travelAmount * -24 : 0,
                },
                { rotate: "-18deg" },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.milkyWayCore,
            {
              transform: [
                {
                  translateX: gameState === "playing" ? travelAmount * -18 : 0,
                },
                { rotate: "-18deg" },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.milkyWayDustLane,
            {
              transform: [
                { translateX: gameState === "playing" ? travelAmount * 12 : 0 },
                { rotate: "-18deg" },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.milkyWayBandEcho,
            {
              transform: [
                { translateX: gameState === "playing" ? travelAmount * 16 : 0 },
                { rotate: "-18deg" },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.milkyWayGlow,
            {
              transform: [
                {
                  translateX: gameState === "playing" ? travelAmount * -14 : 0,
                },
                { rotate: "-18deg" },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.spaceHazeA,
            {
              transform: [
                {
                  translateX: gameState === "playing" ? travelAmount * -12 : 0,
                },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.spaceHazeB,
            {
              transform: [
                { translateX: gameState === "playing" ? travelAmount * 10 : 0 },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.spaceHazeC,
            {
              transform: [
                { translateX: gameState === "playing" ? travelAmount * -7 : 0 },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.spaceHazeD,
            {
              transform: [
                { translateX: gameState === "playing" ? travelAmount * 8 : 0 },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.distantPlanet,
            {
              transform: [
                { translateX: gameState === "playing" ? travelAmount * -5 : 0 },
              ],
            },
          ]}
        >
          <View style={styles.distantPlanetShadow} />
          <View style={styles.distantPlanetRing} />
          <View style={styles.distantPlanetCap} />
        </View>
        <View style={styles.distantPlanetGlow} />
        <View
          style={[
            styles.distantMoon,
            {
              transform: [
                { translateX: gameState === "playing" ? travelAmount * -3 : 0 },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.asteroidClusterA,
            {
              transform: [
                { translateX: gameState === "playing" ? travelAmount * 4 : 0 },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.asteroidClusterB,
            {
              transform: [
                { translateX: gameState === "playing" ? travelAmount * 6 : 0 },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.asteroidClusterC,
            {
              transform: [
                { translateX: gameState === "playing" ? travelAmount * 3 : 0 },
              ],
            },
          ]}
        />

        {stars.map((star) => {
          const progress = (travelAmount * star.speed + star.phaseOffset) % 1;
          const easedProgress = Math.pow(progress, 1.45);
          const outwardSpread = width * (0.14 + easedProgress * 0.62);
          const x = width / 2 + star.baseX * outwardSpread;
          const y = height * 0.08 + easedProgress * height * 0.84;
          const size = star.size * (0.7 + easedProgress * 1.75);
          const opacity = Math.min(
            1,
            star.opacity * (0.35 + easedProgress * 1.25),
          );

          return (
            <View
              key={star.id}
              style={[
                styles.star,
                star.layer === "near" && styles.nearStar,
                {
                  left: x,
                  top: y,
                  width: size,
                  height: size,
                  opacity,
                  transform: [
                    { translateX: -size / 2 },
                    { translateY: -size / 2 },
                  ],
                },
              ]}
            >
              <View
                style={[
                  styles.starGlow,
                  star.layer === "near" && styles.nearStarGlow,
                ]}
              />
              <View style={styles.starCore} />
            </View>
          );
        })}

        {gameState === "playing" &&
          foregroundStreaks.map((streak) => {
            const progress =
              (scene.travel * streak.speed + streak.phaseOffset) % 1;

            if (progress < 0.58) {
              return null;
            }

            const visibleProgress = (progress - 0.58) / 0.42;
            const x =
              width / 2 + streak.baseX * width * (0.3 + visibleProgress * 0.44);
            const y = height * 0.28 + visibleProgress * height * 0.6;
            const streakOpacity =
              (isBoosting ? 0.42 : 0.22) * (0.4 + visibleProgress * 0.9);

            return (
              <View
                key={streak.id}
                style={[
                  styles.foregroundStreak,
                  {
                    left: x,
                    top: y,
                    height: streak.length * (0.65 + visibleProgress),
                    opacity: streakOpacity,
                  },
                ]}
              />
            );
          })}

        {gameState === "playing" &&
          Array.from({ length: SPEED_LINE_COUNT }, (_, index) => {
            const lineOffset = index - (SPEED_LINE_COUNT - 1) / 2;
            const lineHeight = 54 + index * 16;
            const sway = Math.sin(scene.elapsedMs / 140 + index) * 8;

            return (
              <View
                key={`speed-line-${index}`}
                style={[
                  styles.speedLine,
                  {
                    left: width / 2 + lineOffset * 26 + sway,
                    top: height * 0.18,
                    height: lineHeight,
                    opacity: motionIntensity * (0.14 + index * 0.025),
                  },
                ]}
              />
            );
          })}
      </View>

      {gameState === "menu" ? (
        <GameMenu
          appVersion={appVersion}
          activeShipModelKey={shipProfile.ship.modelKey}
          controlLayout={controlLayout}
          highScoreDisplay={highScoreDisplay}
          isMusicEnabled={isMusicEnabled}
          isSfxEnabled={isSfxEnabled}
          lastRunDisplay={lastRunDisplay}
          menuPanel={menuPanel}
          nextUnlockShip={nextUnlockShip}
          stageClearance={stageClearance}
          onOpenHangar={() => router.push("/hangar")}
          onStartGame={startGame}
          setIsMusicEnabled={setIsMusicEnabled}
          setIsSfxEnabled={setIsSfxEnabled}
          setMenuPanel={setMenuPanel}
          styles={styles}
          toggleControlLayout={toggleControlLayout}
          unlockedHangarShips={unlockedHangarShips}
        />
      ) : (
        <>
          <View style={styles.playArea} onLayout={handlePlayAreaLayout}>
            <View
              style={styles.touchFlightZone}
              onStartShouldSetResponder={() => gameState === "playing"}
              onMoveShouldSetResponder={() => gameState === "playing"}
              onResponderGrant={handleTouchMoveShip}
              onResponderMove={handleTouchMoveShip}
            />

            <View style={styles.enemyLayer} pointerEvents="none">
              {scene.enemies.map((enemy) => (
                <AlienInvader
                  key={enemy.id}
                  enemy={enemy}
                  elapsedMs={scene.elapsedMs}
                  contentWidth={contentWidth}
                  styles={styles}
                />
              ))}
            </View>

            <View style={styles.healthDropLayer} pointerEvents="none">
              {scene.healthDrops.map((drop) => {
                const activePlayAreaHeight =
                  playAreaHeight || Math.max(260, height * 0.52);
                const dropX = contentWidth / 2 + drop.x;

                return (
                  <View
                    key={drop.id}
                    style={[
                      styles.healthDropOrb,
                      {
                        left: dropX,
                        top: drop.y,
                      },
                    ]}
                  >
                    <View style={styles.healthDropGlow} />
                    <View style={styles.healthDropCore}>
                      <Text style={styles.healthDropText}>+</Text>
                    </View>
                    <View
                      style={[
                        styles.healthDropTrail,
                        {
                          left: 12.5,
                          top: 20,
                          height: Math.min(42, Math.max(18, activePlayAreaHeight * 0.04)),
                        },
                      ]}
                    />
                  </View>
                );
              })}
            </View>

            <View style={styles.enemyLaserLayer} pointerEvents="none">
              {scene.bossLasers.map((laser) => {
                const isActive = laser.telegraphMs >= laser.maxTelegraphMs;
                const activePlayAreaHeight =
                  playAreaHeight || Math.max(260, height * 0.52);
                const beamHeight = Math.max(0, activePlayAreaHeight - laser.y);
                const lightningSegments =
                  laser.kind === "stage3"
                    ? Array.from({ length: 8 }, (_, index) => {
                        const segmentHeight = Math.max(12, beamHeight / 8);
                        const jitterSeed = laser.id * 19 + index * 23 + Math.floor(laser.activeMs / 24);
                        const horizontalShift = ((jitterSeed % 7) - 3) * 6;
                        const rotate = (index % 2 === 0 ? 1 : -1) * (8 + (jitterSeed % 3) * 3);
                        const segmentWidth = index === 0 ? 32 : index === 7 ? 28 : 18 + (jitterSeed % 2) * 4;

                        return {
                          id: index,
                          top: Math.min(beamHeight - 6, index * (segmentHeight * 0.88)),
                          width: segmentWidth,
                          height: segmentHeight + 8,
                          translateX: horizontalShift,
                          rotate: `${rotate}deg`,
                        };
                      })
                    : [];

                return (
                  <View
                    key={laser.id}
                    style={[
                      styles.enemyLaserBeam,
                      isActive
                        ? styles.enemyLaserBeamActive
                        : styles.enemyLaserBeamTelegraph,
                      laser.kind === "stage3" && styles.enemyLaserBeamStageThree,
                      laser.kind === "stage2" && styles.enemyLaserBeamStageTwo,
                      {
                        left: contentWidth / 2 + laser.x - laser.width / 2,
                        top: laser.y,
                        width: laser.width,
                        height: beamHeight,
                        opacity: isActive ? 1 : 0.62,
                      },
                    ]}
                  >
                    {laser.kind === "stage3" ? (
                      <View style={styles.enemyLightningBolt}>
                        <View
                          style={[
                            styles.enemyLightningAura,
                            isActive
                              ? styles.enemyLightningAuraActive
                              : styles.enemyLightningAuraTelegraph,
                          ]}
                        />
                        {lightningSegments.map((segment) => (
                          <View
                            key={`${laser.id}-${segment.id}`}
                            style={[
                              styles.enemyLightningSegment,
                              isActive
                                ? styles.enemyLightningSegmentActive
                                : styles.enemyLightningSegmentTelegraph,
                              {
                                top: segment.top,
                                width: segment.width,
                                height: segment.height,
                                transform: [
                                  { translateX: segment.translateX },
                                  { rotate: segment.rotate },
                                ],
                              },
                            ]}
                          />
                        ))}
                        <View
                          style={[
                            styles.enemyLightningSpark,
                            isActive
                              ? styles.enemyLightningSparkActive
                              : styles.enemyLightningSparkTelegraph,
                          ]}
                        />
                      </View>
                    ) : (
                      <>
                        <View
                          style={[
                            styles.enemyLaserAura,
                            isActive
                              ? styles.enemyLaserAuraActive
                              : styles.enemyLaserAuraTelegraph,
                            laser.kind === "stage2" &&
                              styles.enemyLaserAuraStageTwo,
                          ]}
                        />
                        <View
                          style={[
                            styles.enemyLaserEmitter,
                            isActive
                              ? styles.enemyLaserEmitterActive
                              : styles.enemyLaserEmitterTelegraph,
                            laser.kind === "stage2" &&
                              styles.enemyLaserEmitterStageTwo,
                          ]}
                        />
                        <View
                          style={[
                            styles.enemyLaserCore,
                            isActive
                              ? styles.enemyLaserCoreActive
                              : styles.enemyLaserCoreTelegraph,
                            laser.kind === "stage2" &&
                              styles.enemyLaserCoreStageTwo,
                          ]}
                        />
                      </>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.bulletLayer} pointerEvents="none">
              {scene.bullets.map((bullet) => {
                const isBeam = bullet.kind === "beam";
                const bulletWidth = isBeam ? 30 : getBulletWidth(bullet.kind);
                const bulletHeight = isBeam
                  ? Math.max(1, bullet.beamLength ?? bullet.y)
                  : getBulletHeight(bullet.kind);
                const beamPulse = isBeam
                  ? 0.72 + Math.sin(((bullet.ageMs ?? 0) / 18) * Math.PI * 2) * 0.09
                  : 0;

                return (
                  <View
                    key={bullet.id}
                    style={[
                      styles.bulletShell,
                      bullet.kind === "pulse" && styles.pulseBulletShell,
                      isBeam && styles.heliosBeamShell,
                      !isBeam && getBulletShellVariant(bullet),
                      {
                        left: contentWidth / 2 + bullet.x - bulletWidth / 2,
                        top: isBeam ? 0 : bullet.y,
                        width: bulletWidth,
                        height: bulletHeight,
                        transform:
                          bullet.kind === "missile" ||
                          bullet.kind === "needle" ||
                          bullet.kind === "plasmaPellet" ||
                          bullet.kind === "seekerPod"
                            ? [{ rotate: `${(bullet.vx ?? 0) * 160}deg` }]
                            : undefined,
                      },
                    ]}
                  >
                    {isBeam ? (
                      <>
                        <View
                          style={[
                            styles.heliosBeamWash,
                            { opacity: 0.26 + beamPulse * 0.08 },
                          ]}
                        />
                        <View
                          style={[
                            styles.heliosBeamAura,
                            { opacity: 0.48 + beamPulse * 0.16 },
                          ]}
                        />
                        <View
                          style={[
                            styles.heliosBeamCore,
                            { opacity: 0.82 + beamPulse * 0.1 },
                          ]}
                        />
                        <View
                          style={[
                            styles.heliosBeamDischarge,
                            {
                              opacity: 0.86 + beamPulse * 0.1,
                              transform: [{ scale: 1 + beamPulse * 0.08 }],
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.heliosBeamDischargeCore,
                            { opacity: 0.95 + beamPulse * 0.04 },
                          ]}
                        />
                        <View style={styles.heliosBeamEmitter} />
                      </>
                    ) : (
                      <>
                        {bullet.kind === "missile" ? (
                          <>
                            <View
                              style={[
                                styles.missileSmokeTrail,
                                {
                                  opacity: 0.18,
                                  left: -18,
                                  width: 18,
                                  top: getBulletHeight(bullet.kind) / 2 - 3,
                                },
                              ]}
                            />
                            <View
                              style={[
                                styles.missileSmokeTrail,
                                {
                                  opacity: 0.24,
                                  left: -10,
                                  width: 14,
                                  top: getBulletHeight(bullet.kind) / 2 - 2,
                                },
                              ]}
                            />
                            <View
                              style={[
                                styles.missileSmokeTrail,
                                {
                                  opacity: 0.32,
                                  left: -4,
                                  width: 9,
                                  top: getBulletHeight(bullet.kind) / 2 - 1,
                                },
                              ]}
                            />
                            <View style={styles.missileNoseFlare} />
                          </>
                        ) : null}
                        <View
                          style={[
                            styles.bulletCore,
                            bullet.kind === "pulse" && styles.pulseBulletCore,
                            getBulletCoreVariant(bullet),
                            {
                              height: getBulletHeight(bullet.kind) - 6,
                            },
                          ]}
                        />
                      </>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.explosionLayer} pointerEvents="none">
              {scene.explosions.map((explosion) => {
                const progress = explosion.ageMs / explosion.maxAgeMs;
                const size = explosion.size * (0.55 + progress * 0.95);
                const coreSize = size * (0.28 + (1 - progress) * 0.18);

                return (
                  <View
                    key={explosion.id}
                    style={[
                      styles.explosionBurst,
                      {
                        left: contentWidth / 2 + explosion.x - size / 2,
                        top: explosion.y - size / 2,
                        width: size,
                        height: size,
                        borderColor: explosion.color,
                        shadowColor: explosion.color,
                        opacity: 1 - progress,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.explosionCore,
                        {
                          width: coreSize,
                          height: coreSize,
                          backgroundColor: explosion.color,
                        },
                      ]}
                    />
                  </View>
                );
              })}
            </View>

            <HeroShip
              bankAngle={shipBank}
              isBoosting={isBoosting}
              modelKey={shipProfile.ship.modelKey}
              shipOffset={shipOffset}
              shipLift={shipLift}
              scale={shipScale}
              damageFlashMs={scene.playerDamageFlashMs}
              styles={styles}
            />

            {scene.playerDamageFlashMs > 0 ? (
              <View
                pointerEvents="none"
                style={[
                  styles.playerDamageOverlay,
                  {
                    opacity: Math.min(0.24, scene.playerDamageFlashMs / 240 / 3),
                  },
                ]}
              />
            ) : null}

            {gameState === "gameOver" && (
              <GameOverScreen
                onRestart={startGame}
                onReturnToMenu={returnToMenu}
                styles={styles}
              />
            )}

            {gameState === "stageClear" && (
              <StageClearScreen
                onContinue={continueToNextStage}
                onRestart={startGame}
                onReturnToMenu={returnToMenuFromStageClear}
                unlockAnnouncement={stageClearAnnouncement}
                stage={scene.stage}
                styles={styles}
              />
            )}
          </View>

          <GameHUD
            gameState={gameState}
            playerHpMax={playerHp}
            playerShieldMax={visibleShieldPoints}
            highScoreDisplay={highScoreDisplay}
            onTogglePause={togglePause}
            onReturnToMenu={returnToMenu}
            scene={scene}
            styles={styles}
          />

          {gameState === "playing" && (
            <GameControls
              controlLayout={controlLayout}
              isBoosting={isBoosting}
              isFireHeld={isFireHeld}
              onMoveStart={handleMoveStart}
              onMoveEnd={handleMoveEnd}
              onBoostStart={handleBoostStart}
              onBoostEnd={handleBoostEnd}
              onFirePressIn={handleFirePressIn}
              onFirePressOut={handleFirePressOut}
              styles={styles}
            />
          )}

          {gameState === "paused" && (
            <View style={styles.pauseOverlay}>
              <Text style={styles.pauseTitle}>PAUSED</Text>
              <Text style={styles.pauseText}>
                Systems holding position. Resume when you are ready.
              </Text>
              <Pressable
                style={styles.gameOverPrimaryButton}
                onPress={togglePause}
                android_disableSound
              >
                <Text style={styles.gameOverPrimaryButtonText}>RESUME</Text>
              </Pressable>
              <Pressable
                style={styles.gameOverSecondaryButton}
                onPress={returnToMenu}
                android_disableSound
              >
                <Text style={styles.gameOverSecondaryButtonText}>MAIN MENU</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
    overflow: "hidden",
  },
  screenMenu: {
    paddingTop: SCREEN_TOP_PADDING,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingBottom: SCREEN_BOTTOM_PADDING,
  },
  screenInGame: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
  },
  spaceLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  starGlow: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(192, 227, 255, 0.42)",
    transform: [{ scale: 1.9 }],
  },
  nearStarGlow: {
    backgroundColor: "rgba(224, 244, 255, 0.58)",
    transform: [{ scale: 2.3 }],
  },
  starCore: {
    width: "44%",
    height: "44%",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  nearStar: {
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.85,
    shadowRadius: 4,
    elevation: 4,
  },
  foregroundStreak: {
    position: "absolute",
    width: 2,
    backgroundColor: "#EAF7FF",
    borderRadius: 999,
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  speedLine: {
    position: "absolute",
    width: 1,
    backgroundColor: "#9FD8FF",
    borderRadius: 999,
  },
  deepSpaceVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(1, 3, 8, 0.55)",
  },
  infiniteVoid: {
    position: "absolute",
    top: -120,
    left: -180,
    right: -180,
    height: 360,
    borderRadius: 999,
    backgroundColor: "rgba(14, 23, 46, 0.52)",
    transform: [{ rotate: "-16deg" }],
  },
  menuScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 10,
    gap: 10,
  },
  menuHeader: {
    alignItems: "center",
    zIndex: 2,
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#4CF0FF",
    borderRadius: 6,
    backgroundColor: "rgba(6, 10, 16, 0.82)",
    shadowColor: "#4CF0FF",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  menuEyebrow: {
    color: "#84E7FF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginBottom: 10,
  },
  menuTitle: {
    color: "#F9FBFF",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 5,
    textAlign: "center",
    textShadowColor: "#4CF0FF",
    textShadowRadius: 8,
    lineHeight: 36,
  },
  menuBlurb: {
    color: "#D0DDEA",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 12,
    maxWidth: 240,
    lineHeight: 16,
  },
  menuActions: {
    width: "100%",
    gap: 8,
    zIndex: 2,
    paddingHorizontal: 4,
  },
  menuStartButton: {
    borderWidth: 1.5,
    borderColor: "#FF5C78",
    backgroundColor: "#140C12",
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 4,
    shadowColor: "#FF5C78",
    shadowOpacity: 0.38,
    shadowRadius: 8,
    elevation: 6,
  },
  menuStartButtonText: {
    color: "#FFF3F5",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1.6,
  },
  menuSecondaryButton: {
    borderWidth: 1.5,
    borderColor: "#60728C",
    backgroundColor: "#0D111A",
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 4,
  },
  menuSecondaryButtonText: {
    color: "#EAF2FF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  menuShipStage: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 6,
    zIndex: 2,
  },
  menuPanel: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
    gap: 12,
    zIndex: 2,
    borderWidth: 1,
    borderColor: "#46607A",
    borderRadius: 6,
    backgroundColor: "rgba(7, 11, 17, 0.72)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuPanelTitle: {
    color: "#F5F9FF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 4,
  },
  menuPanelBody: {
    color: "#C7D4E5",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  menuHangarPreview: {
    width: "100%",
    gap: 10,
    marginBottom: 4,
  },
  menuHangarShipCard: {
    width: "100%",
    borderWidth: 1,
    backgroundColor: "rgba(12, 20, 34, 0.92)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  menuHangarShipName: {
    color: "#F4FAFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },
  menuHangarShipWeapon: {
    color: "#B8D0E7",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.9,
    textAlign: "center",
  },
  menuHangarHint: {
    color: "#93B5D2",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.9,
    textAlign: "center",
    marginBottom: 4,
  },
  menuBackButton: {
    borderWidth: 1.5,
    borderColor: "#7D95B5",
    backgroundColor: "#121A29",
    paddingVertical: 9,
    alignItems: "center",
    marginTop: 6,
    borderRadius: 4,
  },
  menuBackButtonText: {
    color: "#EBF2FB",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  versionFooter: {
    position: "absolute",
    left: 2,
    bottom: 0,
    color: "#8FA5BF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    zIndex: 3,
  },
  creditsScroll: {
    width: "100%",
    maxHeight: 360,
  },
  creditsScrollContent: {
    paddingBottom: 10,
  },
  creditsBlockCard: {
    borderWidth: 1,
    borderColor: "#355778",
    backgroundColor: "rgba(12, 20, 34, 0.9)",
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderRadius: 6,
    shadowColor: "#69C7FF",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
  creditsBlockText: {
    color: "#EAF3FF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
    lineHeight: 24,
    textAlign: "center",
  },
  menuDecorPlanetLarge: {
    position: "absolute",
    top: 86,
    right: -26,
    width: 112,
    height: 112,
    borderRadius: 999,
    backgroundColor: "#273F76",
    opacity: 0.55,
  },
  menuDecorPlanetRing: {
    position: "absolute",
    top: 126,
    right: -42,
    width: 150,
    height: 28,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: "#90B8FF",
    opacity: 0.45,
    transform: [{ rotate: "-14deg" }],
  },
  menuDecorPlanetSmall: {
    position: "absolute",
    top: 240,
    left: 10,
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#7D2E4D",
    opacity: 0.7,
  },
  menuDecorNebulaA: {
    position: "absolute",
    top: 180,
    left: -30,
    width: 180,
    height: 110,
    borderRadius: 999,
    backgroundColor: "#243970",
    opacity: 0.18,
    transform: [{ rotate: "-10deg" }],
  },
  menuDecorNebulaB: {
    position: "absolute",
    top: 330,
    right: -20,
    width: 170,
    height: 96,
    borderRadius: 999,
    backgroundColor: "#5D1849",
    opacity: 0.16,
    transform: [{ rotate: "18deg" }],
  },
  menuDecorAsteroidA: {
    position: "absolute",
    top: 154,
    left: 82,
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: "#69778D",
    transform: [{ rotate: "22deg" }],
    opacity: 0.8,
  },
  menuDecorAsteroidB: {
    position: "absolute",
    top: 418,
    right: 48,
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: "#5E6F81",
    transform: [{ rotate: "-16deg" }],
    opacity: 0.75,
  },
  menuDecorAsteroidC: {
    position: "absolute",
    bottom: 210,
    left: 30,
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: "#8697A6",
    transform: [{ rotate: "14deg" }],
    opacity: 0.8,
  },
  hudOverlay: {
    position: "absolute",
    top: 18,
    left: SCREEN_HORIZONTAL_PADDING,
    right: SCREEN_HORIZONTAL_PADDING,
    zIndex: 6,
  },
  hud: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  hudBlock: {
    gap: 2,
  },
  hudBlockRight: {
    gap: 2,
    alignItems: "flex-end",
  },
  hudText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.9,
  },
  hudSubtext: {
    color: "#96BFEA",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  statusMeters: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
    zIndex: 2,
  },
  bossMeterSection: {
    borderWidth: 1,
    borderColor: "rgba(255, 201, 108, 0.18)",
    backgroundColor: "rgba(24, 16, 7, 0.28)",
    paddingHorizontal: 7,
    paddingVertical: 5,
    marginBottom: 5,
  },
  bossMeterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  bossMeterLabel: {
    color: "#FFD991",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  bossMeterValue: {
    color: "#FFE8BF",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  bossMeterTrack: {
    flexDirection: "row",
    gap: 3,
  },
  bossMeterSegment: {
    flex: 1,
    height: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  bossMeterSegmentActive: {
    backgroundColor: "#FFB94A",
    borderColor: "#FFD28A",
  },
  bossMeterSegmentEmpty: {
    borderColor: "rgba(255, 208, 138, 0.12)",
    backgroundColor: "rgba(34, 20, 8, 0.28)",
    opacity: 0.45,
  },
  statusMeter: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(47, 70, 98, 0.18)",
    backgroundColor: "rgba(8, 14, 24, 0.28)",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  statusMeterLabel: {
    color: "#D4E6FB",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 3,
  },
  statusBarRow: {
    flexDirection: "row",
    gap: 4,
  },
  statusBar: {
    flex: 1,
    height: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  healthBar: {
    borderColor: "#A61B2E",
    backgroundColor: "#2B0C12",
  },
  healthBarActive: {
    backgroundColor: "#E2465A",
    borderColor: "#FF8A99",
  },
  shieldBar: {
    borderColor: "#165E9E",
    backgroundColor: "#091B31",
  },
  shieldBarActive: {
    backgroundColor: "#3EA8FF",
    borderColor: "#B0E1FF",
  },
  statusBarEmpty: {
    opacity: 0.35,
  },
  titleWrap: {
    alignItems: "center",
    marginBottom: 4,
    backgroundColor: "rgba(7, 13, 21, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  title: {
    color: "#F2F7FF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  subtitle: {
    color: "#9FC7FF",
    fontSize: 6,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginTop: 2,
  },
  hudActions: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 3,
  },
  menuReturnButton: {
    alignSelf: "flex-end",
    borderWidth: 1,
    borderColor: "rgba(137, 184, 231, 0.28)",
    backgroundColor: "rgba(12, 18, 33, 0.28)",
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginBottom: 0,
  },
  menuReturnButtonText: {
    color: "#DCE9F7",
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  playArea: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: PLAY_AREA_BOTTOM_PADDING,
    zIndex: 2,
  },
  playerDamageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 58, 82, 0.18)",
    zIndex: 3,
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4, 8, 16, 0.74)",
    paddingHorizontal: 28,
    zIndex: 5,
  },
  pauseTitle: {
    color: "#EDF6FF",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 2.6,
    textAlign: "center",
  },
  pauseText: {
    color: "#C6D8EC",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 22,
  },
  touchFlightZone: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  enemyLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  healthDropLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  enemyFrame: {
    position: "absolute",
    width: ENEMY_FRAME_WIDTH,
    height: ENEMY_FRAME_HEIGHT,
    marginLeft: -ENEMY_FRAME_WIDTH / 2,
    marginTop: -ENEMY_FRAME_HEIGHT / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  enemyGlow: {
    position: "absolute",
    bottom: 0,
    width: ENEMY_FRAME_WIDTH,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  enemyHitFlash: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    borderRadius: 28,
  },
  enemyGlowBoss: {
    opacity: 0.9,
    shadowColor: "#FFB86E",
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 10,
  },
  enemyGlowGrunt: {
    opacity: 0.88,
    shadowColor: "#FF5C78",
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  enemyShipImage: {
    width: ENEMY_FRAME_WIDTH,
    height: ENEMY_FRAME_HEIGHT,
  },
  asteroidShell: {
    width: ASTEROID_FRAME_SIZE,
    height: ASTEROID_FRAME_SIZE,
    borderRadius: 34,
    backgroundColor: "#7A6656",
    borderWidth: 3,
    borderColor: "#B7A08B",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#B48662",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  asteroidShadow: {
    position: "absolute",
    right: -8,
    bottom: -6,
    width: 48,
    height: 54,
    borderRadius: 24,
    backgroundColor: "rgba(55, 40, 31, 0.4)",
  },
  asteroidHighlight: {
    position: "absolute",
    top: 8,
    left: 10,
    width: 34,
    height: 16,
    borderRadius: 999,
    backgroundColor: "rgba(235, 215, 195, 0.32)",
    transform: [{ rotate: "-18deg" }],
  },
  asteroidRidge: {
    position: "absolute",
    top: 28,
    left: 8,
    width: 56,
    height: 18,
    borderRadius: 14,
    backgroundColor: "rgba(158, 128, 104, 0.34)",
    transform: [{ rotate: "-24deg" }],
  },
  asteroidFacetA: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 22,
    height: 16,
    borderRadius: 9,
    backgroundColor: "#A98A72",
    opacity: 0.72,
    transform: [{ rotate: "-18deg" }],
  },
  asteroidFacetB: {
    position: "absolute",
    right: 10,
    top: 18,
    width: 20,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#5F4B3D",
    opacity: 0.8,
    transform: [{ rotate: "24deg" }],
  },
  asteroidFacetC: {
    position: "absolute",
    left: 20,
    bottom: 12,
    width: 24,
    height: 18,
    borderRadius: 10,
    backgroundColor: "#5D4738",
    opacity: 0.74,
    transform: [{ rotate: "16deg" }],
  },
  asteroidCraterLarge: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "#564133",
    borderWidth: 1,
    borderColor: "rgba(176, 145, 120, 0.22)",
    opacity: 0.78,
    transform: [{ translateX: 10 }, { translateY: 6 }],
  },
  asteroidCraterMedium: {
    position: "absolute",
    right: 16,
    bottom: 18,
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: "#4C392D",
    borderWidth: 1,
    borderColor: "rgba(152, 126, 104, 0.16)",
    opacity: 0.78,
  },
  asteroidCraterSmall: {
    position: "absolute",
    left: 16,
    top: 20,
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#433126",
    opacity: 0.78,
  },
  enemyGlowRed: {
    backgroundColor: "#FF5870",
    shadowColor: "#FF5870",
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  enemyGlowPurple: {
    backgroundColor: "#B65DFF",
    shadowColor: "#B65DFF",
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  enemyGlowGreen: {
    backgroundColor: "#49F59B",
    shadowColor: "#49F59B",
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  enemyWingLeft: {
    position: "absolute",
    left: 6,
    bottom: 16,
    width: 22,
    height: 14,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 4,
    transform: [{ rotate: "-16deg" }],
  },
  enemyWingRight: {
    position: "absolute",
    right: 6,
    bottom: 16,
    width: 22,
    height: 14,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 4,
    transform: [{ rotate: "16deg" }],
  },
  enemyWingRed: {
    backgroundColor: "#EE4C64",
  },
  enemyWingPurple: {
    backgroundColor: "#A95CFF",
  },
  enemyWingGreen: {
    backgroundColor: "#42DE8E",
  },
  enemyHull: {
    position: "absolute",
    bottom: 14,
    width: 34,
    height: 18,
    borderRadius: 10,
    borderWidth: 2,
  },
  enemyHullRed: {
    backgroundColor: "#6F1827",
    borderColor: "#FF8FA1",
  },
  enemyHullPurple: {
    backgroundColor: "#43175E",
    borderColor: "#D1A4FF",
  },
  enemyHullGreen: {
    backgroundColor: "#133B28",
    borderColor: "#9CFFD0",
  },
  enemyDome: {
    position: "absolute",
    bottom: 22,
    width: 22,
    height: 14,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  enemyDomeRed: {
    backgroundColor: "#FF8FA1",
  },
  enemyDomePurple: {
    backgroundColor: "#D2A1FF",
  },
  enemyDomeGreen: {
    backgroundColor: "#9AFFC5",
  },
  enemyEyeLeft: {
    position: "absolute",
    bottom: 24,
    left: 28,
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  enemyEyeRight: {
    position: "absolute",
    bottom: 24,
    right: 28,
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  enemyEyeRed: {
    backgroundColor: "#FFF3F5",
  },
  enemyEyePurple: {
    backgroundColor: "#F7EDFF",
  },
  enemyEyeGreen: {
    backgroundColor: "#F0FFF6",
  },
  enemyFinLeft: {
    position: "absolute",
    left: 16,
    bottom: 6,
    width: 6,
    height: 14,
    borderRadius: 4,
  },
  enemyFinRight: {
    position: "absolute",
    right: 16,
    bottom: 6,
    width: 6,
    height: 14,
    borderRadius: 4,
  },
  bulletLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  enemyLaserLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  explosionLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  enemyLaserBeam: {
    position: "absolute",
    alignItems: "center",
    borderRadius: 999,
    overflow: "hidden",
  },
  enemyLaserBeamTelegraph: {
    backgroundColor: "rgba(255, 92, 122, 0.28)",
    borderWidth: 2,
    borderColor: "rgba(255, 186, 198, 0.68)",
  },
  enemyLaserBeamActive: {
    backgroundColor: "rgba(255, 42, 74, 0.56)",
    shadowColor: "#FF4A6F",
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 14,
  },
  enemyLaserBeamStageTwo: {
    backgroundColor: "rgba(255, 177, 86, 0.44)",
    shadowColor: "#FFD799",
    shadowOpacity: 0.95,
  },
  enemyLaserBeamStageThree: {
    backgroundColor: "rgba(157, 111, 255, 0.42)",
    shadowColor: "#BC95FF",
    shadowOpacity: 1,
  },
  enemyLaserAura: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },
  enemyLaserAuraTelegraph: {
    backgroundColor: "rgba(255, 120, 146, 0.16)",
  },
  enemyLaserAuraActive: {
    backgroundColor: "rgba(255, 82, 110, 0.24)",
  },
  enemyLaserAuraStageTwo: {
    backgroundColor: "rgba(255, 211, 150, 0.18)",
  },
  enemyLaserAuraStageThree: {
    backgroundColor: "rgba(193, 156, 255, 0.2)",
  },
  enemyLaserEmitter: {
    position: "absolute",
    top: 0,
    width: 122,
    height: 34,
    borderRadius: 999,
  },
  enemyLaserEmitterTelegraph: {
    backgroundColor: "rgba(255, 170, 186, 0.32)",
  },
  enemyLaserEmitterActive: {
    backgroundColor: "rgba(255, 126, 148, 0.66)",
    shadowColor: "#FF6E8C",
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
  },
  enemyLaserEmitterStageTwo: {
    backgroundColor: "rgba(255, 194, 118, 0.72)",
    shadowColor: "#FFD799",
  },
  enemyLaserEmitterStageThree: {
    backgroundColor: "rgba(180, 132, 255, 0.72)",
    shadowColor: "#C8A8FF",
  },
  enemyLaserCore: {
    width: 16,
    height: "100%",
    borderRadius: 999,
  },
  enemyLaserCoreTelegraph: {
    backgroundColor: "rgba(255, 226, 232, 0.62)",
  },
  enemyLaserCoreActive: {
    width: 24,
    backgroundColor: "#FFE7EB",
  },
  enemyLaserCoreStageTwo: {
    backgroundColor: "#FFF2D8",
  },
  enemyLaserCoreStageThree: {
    width: 22,
    backgroundColor: "#F4E8FF",
  },
  enemyLightningBolt: {
    position: "absolute",
    top: 0,
    left: "50%",
    width: 96,
    height: "100%",
    transform: [{ translateX: -48 }],
    overflow: "visible",
  },
  enemyLightningAura: {
    position: "absolute",
    top: 0,
    left: "50%",
    width: 34,
    height: "100%",
    marginLeft: -17,
    borderRadius: 999,
  },
  enemyLightningAuraTelegraph: {
    backgroundColor: "rgba(231, 212, 255, 0.12)",
  },
  enemyLightningAuraActive: {
    backgroundColor: "rgba(201, 168, 255, 0.18)",
    shadowColor: "#E6C6FF",
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
  },
  enemyLightningSegment: {
    position: "absolute",
    left: "50%",
    marginLeft: -4,
    borderRadius: 999,
  },
  enemyLightningSegmentTelegraph: {
    backgroundColor: "rgba(230, 210, 255, 0.42)",
  },
  enemyLightningSegmentActive: {
    backgroundColor: "#F9F0FF",
    shadowColor: "#FFFFFF",
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 10,
  },
  enemyLightningSpark: {
    position: "absolute",
    left: "50%",
    top: 0,
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 999,
  },
  enemyLightningSparkTelegraph: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  enemyLightningSparkActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#FFFFFF",
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 12,
  },
  bulletShell: {
    position: "absolute",
    width: BULLET_WIDTH,
    height: BULLET_HEIGHT,
    borderRadius: 999,
    backgroundColor: "#54D2FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#54D2FF",
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  pulseBulletShell: {
    backgroundColor: "#82B9FF",
    shadowColor: "#9FD5FF",
    shadowRadius: 14,
    elevation: 10,
  },
  heliosBeamShell: {
    overflow: "visible",
    alignItems: "center",
    justifyContent: "flex-start",
    shadowColor: "#FFF2B8",
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 16,
  },
  heliosBeamWash: {
    position: "absolute",
    left: 4,
    right: 4,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "rgba(255, 226, 142, 0.12)",
  },
  heliosBeamAura: {
    position: "absolute",
    left: 7,
    right: 7,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "rgba(255, 213, 120, 0.42)",
    shadowColor: "#FFE69C",
    shadowOpacity: 0.95,
    shadowRadius: 24,
    elevation: 14,
  },
  heliosBeamCore: {
    position: "absolute",
    left: "50%",
    top: 0,
    width: 12,
    height: "100%",
    marginLeft: -6,
    borderRadius: 999,
    backgroundColor: "#FFF7DE",
    shadowColor: "#FFFFFF",
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 18,
  },
  heliosBeamDischarge: {
    position: "absolute",
    left: "50%",
    bottom: 2,
    width: 42,
    height: 42,
    marginLeft: -21,
    borderRadius: 999,
    backgroundColor: "rgba(255, 225, 140, 0.32)",
    shadowColor: "#FFF0AE",
    shadowOpacity: 1,
    shadowRadius: 26,
    elevation: 18,
  },
  heliosBeamDischargeCore: {
    position: "absolute",
    left: "50%",
    bottom: 11,
    width: 18,
    height: 18,
    marginLeft: -9,
    borderRadius: 999,
    backgroundColor: "#FFFDF0",
    shadowColor: "#FFFFFF",
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 16,
  },
  heliosBeamEmitter: {
    position: "absolute",
    left: "50%",
    bottom: 6,
    width: 28,
    height: 28,
    marginLeft: -14,
    borderRadius: 999,
    backgroundColor: "rgba(255, 222, 132, 0.18)",
    shadowColor: "#FFE9A7",
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 14,
  },
  bulletCore: {
    width: 2,
    height: BULLET_HEIGHT - 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  missileSmokeTrail: {
    position: "absolute",
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(184, 190, 202, 0.76)",
    shadowColor: "#EEF2F6",
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  missileNoseFlare: {
    position: "absolute",
    right: 1,
    top: BULLET_HEIGHT / 2 - 4,
    width: 3,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#FFF4CA",
    shadowColor: "#FFF0B8",
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  pulseBulletCore: {
    width: 12,
    backgroundColor: "#EAF5FF",
    opacity: 0.92,
  },
  healthDropOrb: {
    position: "absolute",
    width: 30,
    height: 38,
    alignItems: "center",
    justifyContent: "flex-start",
    marginLeft: -15,
  },
  healthDropGlow: {
    position: "absolute",
    top: 6,
    left: 7,
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: "rgba(110, 255, 190, 0.16)",
    shadowColor: "#82FFC0",
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  healthDropCore: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#9BFFD2",
    backgroundColor: "rgba(23, 55, 42, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#82FFC0",
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 6,
  },
  healthDropText: {
    color: "#CCFFE9",
    fontSize: 14,
    fontWeight: "900",
    marginTop: -1,
  },
  healthDropTrail: {
    position: "absolute",
    width: 5,
    marginTop: 1,
    borderRadius: 999,
    backgroundColor: "rgba(130, 255, 192, 0.12)",
  },
  explosionBurst: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 10,
  },
  explosionCore: {
    borderRadius: 999,
    opacity: 0.9,
  },
  playerShipPixelRoot: {
    width: SHIP_FRAME_WIDTH,
    height: SHIP_FRAME_HEIGHT,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  playerShipPixelShadow: {
    position: "absolute",
    bottom: 10,
    width: 118,
    height: 14,
    borderRadius: 999,
    backgroundColor: "rgba(8, 14, 26, 0.55)",
  },
  playerShipPixelFrame: {
    position: "relative",
  },
  playerShipPixel: {
    position: "absolute",
    width: SHIP_PIXEL_SIZE,
    height: SHIP_PIXEL_SIZE,
  },
  playerShipFrame: {
    width: SHIP_FRAME_WIDTH,
    height: SHIP_FRAME_HEIGHT,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  playerShipShadow: {
    position: "absolute",
    bottom: 14,
    width: 104,
    height: 14,
    borderRadius: 999,
    backgroundColor: "rgba(8, 14, 24, 0.48)",
  },
  playerShipShadowDecorative: {
    opacity: 0.82,
  },
  playerShipDamageFlash: {
    position: "absolute",
    bottom: 20,
    width: 114,
    height: 86,
    borderRadius: 999,
    backgroundColor: "rgba(255, 88, 102, 0.38)",
    shadowColor: "#FF6F7E",
    shadowOpacity: 0.85,
    shadowRadius: 18,
    elevation: 8,
  },
  playerShipSvgImage: {
    width: SHIP_FRAME_WIDTH - 40,
    height: SHIP_FRAME_HEIGHT - 32,
  },
  playerShipImage: {
    width: SHIP_FRAME_WIDTH - 40,
    height: SHIP_FRAME_HEIGHT - 32,
  },
  playerEngineFlameCluster: {
    position: "absolute",
    bottom: -8,
    width: 38,
    height: 88,
    alignItems: "center",
    justifyContent: "flex-end",
    opacity: 0.86,
  },
  playerEngineFlameClusterBoosting: {
    bottom: -26,
    width: 56,
    height: 138,
    opacity: 1,
  },
  playerEngineFlameGlow: {
    position: "absolute",
    bottom: 6,
    width: 24,
    height: 18,
    borderRadius: 999,
    backgroundColor: "rgba(88, 198, 255, 0.42)",
    shadowColor: "#59C7FF",
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 5,
  },
  playerEngineFlameGlowBoosting: {
    bottom: 0,
    width: 36,
    height: 26,
    backgroundColor: "rgba(146, 228, 255, 0.68)",
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 9,
  },
  playerEngineFlameLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 28,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#57D3FF",
    transform: [{ rotate: "-14deg" }],
  },
  playerEngineFlameLeftBoosting: {
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 46,
    borderTopColor: "#A7EDFF",
    transform: [{ rotate: "-18deg" }],
  },
  playerEngineFlameCenter: {
    position: "absolute",
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 36,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#D7F8FF",
  },
  playerEngineFlameCenterBoosting: {
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 66,
    borderTopColor: "#FFFFFF",
  },
  playerEngineFlameRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 28,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#57D3FF",
    transform: [{ rotate: "14deg" }],
  },
  playerEngineFlameRightBoosting: {
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 46,
    borderTopColor: "#A7EDFF",
    transform: [{ rotate: "18deg" }],
  },
  playerWingShadow: {
    position: "absolute",
    bottom: 38,
    width: 64,
    height: 24,
    backgroundColor: "#2E394A",
    opacity: 0.45,
  },
  playerWingShadowLeft: {
    left: 20,
    transform: [{ skewY: "20deg" }],
  },
  playerWingShadowRight: {
    right: 20,
    transform: [{ skewY: "-20deg" }],
  },
  playerWing: {
    position: "absolute",
    bottom: 40,
    width: 70,
    height: 56,
    backgroundColor: "#8C8C8C",
    borderWidth: 2,
    borderColor: "#333333",
  },
  playerWingLeft: {
    left: 10,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 20,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    transform: [{ skewY: "26deg" }, { rotate: "-6deg" }],
  },
  playerWingRight: {
    right: 10,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 20,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    transform: [{ skewY: "-26deg" }, { rotate: "6deg" }],
  },
  playerWingDetail: {
    position: "absolute",
    bottom: 46,
    width: 9,
    height: 48,
    borderRadius: 2,
    backgroundColor: "rgba(170, 170, 170, 0.75)",
  },
  playerWingDetailLeft: {
    left: 44,
    transform: [{ rotate: "-4deg" }],
  },
  playerWingDetailRight: {
    right: 44,
    transform: [{ rotate: "4deg" }],
  },
  playerWingStripe: {
    position: "absolute",
    bottom: 64,
    width: 28,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#A5A5A5",
    opacity: 0.7,
  },
  playerWingStripeLeft: {
    left: 30,
    transform: [{ rotate: "-7deg" }],
  },
  playerWingStripeRight: {
    right: 30,
    transform: [{ rotate: "7deg" }],
  },
  playerCannon: {
    position: "absolute",
    bottom: 58,
    width: 10,
    height: 8,
    borderRadius: 2,
    backgroundColor: "#444444",
    borderWidth: 1,
    borderColor: "#222222",
  },
  playerCannonLeft: {
    left: 2,
  },
  playerCannonRight: {
    right: 2,
  },
  playerCannonBarrelLeft: {
    position: "absolute",
    left: -5,
    top: 3,
    width: 5,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#222222",
  },
  playerCannonBarrelRight: {
    position: "absolute",
    right: -5,
    top: 3,
    width: 5,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#222222",
  },
  playerBodyShadow: {
    position: "absolute",
    bottom: 34,
    width: 48,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#2F3947",
  },
  playerBody: {
    position: "absolute",
    bottom: 38,
    width: 44,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#B0B0B0",
    borderWidth: 2,
    borderColor: "#333333",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  playerBodyHighlight: {
    marginTop: 5,
    width: 20,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.42)",
  },
  playerCockpitFrame: {
    position: "absolute",
    bottom: 42,
    width: 28,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
  },
  playerCockpit: {
    width: 24,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4FC3F7",
  },
  playerCockpitReflection: {
    position: "absolute",
    top: 8,
    width: 8,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(234, 251, 255, 0.8)",
  },
  shipFrame: {
    width: SHIP_FRAME_WIDTH,
    height: SHIP_FRAME_HEIGHT,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  shipShadow: {
    position: "absolute",
    bottom: 10,
    width: 152,
    height: 20,
    borderRadius: 999,
    backgroundColor: "rgba(16, 24, 36, 0.46)",
  },
  leftWingShadow: {
    position: "absolute",
    left: 22,
    bottom: 26,
    width: 104,
    height: 18,
    backgroundColor: "#34465D",
    borderRadius: 12,
    transform: [{ rotate: "-11deg" }],
  },
  rightWingShadow: {
    position: "absolute",
    right: 22,
    bottom: 26,
    width: 104,
    height: 18,
    backgroundColor: "#34465D",
    borderRadius: 12,
    transform: [{ rotate: "11deg" }],
  },
  leftWingRear: {
    position: "absolute",
    left: 30,
    bottom: 38,
    width: 102,
    height: 16,
    backgroundColor: "#EEF3FA",
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 8,
    transform: [{ rotate: "-10deg" }],
  },
  rightWingRear: {
    position: "absolute",
    right: 30,
    bottom: 38,
    width: 102,
    height: 16,
    backgroundColor: "#F4F7FC",
    borderTopRightRadius: 30,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 8,
    transform: [{ rotate: "10deg" }],
  },
  leftWingFront: {
    position: "absolute",
    left: 42,
    bottom: 68,
    width: 108,
    height: 14,
    backgroundColor: "#FAFCFF",
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 6,
    transform: [{ rotate: "-6deg" }],
  },
  rightWingFront: {
    position: "absolute",
    right: 42,
    bottom: 68,
    width: 108,
    height: 14,
    backgroundColor: "#FAFCFF",
    borderTopRightRadius: 28,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 6,
    transform: [{ rotate: "6deg" }],
  },
  leftWingStripeUpper: {
    position: "absolute",
    left: 68,
    bottom: 74,
    width: 30,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#DA4352",
    transform: [{ rotate: "-6deg" }],
  },
  rightWingStripeUpper: {
    position: "absolute",
    right: 68,
    bottom: 74,
    width: 30,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#DA4352",
    transform: [{ rotate: "6deg" }],
  },
  leftWingStripeLower: {
    position: "absolute",
    left: 58,
    bottom: 50,
    width: 38,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#DA4352",
    transform: [{ rotate: "-10deg" }],
  },
  rightWingStripeLower: {
    position: "absolute",
    right: 58,
    bottom: 50,
    width: 38,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#DA4352",
    transform: [{ rotate: "10deg" }],
  },
  leftWingCannon: {
    position: "absolute",
    left: 14,
    bottom: 64,
    width: 6,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#D8E1EC",
    transform: [{ rotate: "-6deg" }],
  },
  rightWingCannon: {
    position: "absolute",
    right: 14,
    bottom: 64,
    width: 6,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#D8E1EC",
    transform: [{ rotate: "6deg" }],
  },
  leftEnginePod: {
    position: "absolute",
    left: 56,
    bottom: 28,
    width: 18,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#DDE5F0",
    borderWidth: 2,
    borderColor: "#F8FBFF",
  },
  rightEnginePod: {
    position: "absolute",
    right: 56,
    bottom: 28,
    width: 18,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#DDE5F0",
    borderWidth: 2,
    borderColor: "#F8FBFF",
  },
  leftEngineGlowStub: {
    position: "absolute",
    left: 59,
    bottom: 8,
    width: 12,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#94E9FF",
    opacity: 0.72,
  },
  rightEngineGlowStub: {
    position: "absolute",
    right: 59,
    bottom: 8,
    width: 12,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#94E9FF",
    opacity: 0.72,
  },
  rearEngineSection: {
    position: "absolute",
    bottom: 10,
    width: 106,
    height: 34,
    backgroundColor: "#8A9DB4",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 2,
    borderColor: "#D3DDEB",
  },
  engineVentLeft: {
    position: "absolute",
    bottom: 21,
    left: 76,
    width: 14,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#14324D",
  },
  engineVentCenter: {
    position: "absolute",
    bottom: 22,
    width: 20,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#1A4667",
  },
  engineVentRight: {
    position: "absolute",
    bottom: 21,
    right: 76,
    width: 14,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#14324D",
  },
  engineDeckPlate: {
    position: "absolute",
    bottom: 38,
    width: 66,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#B4C0D1",
  },
  engineGlowOuter: {
    position: "absolute",
    bottom: -18,
    width: 54,
    height: 60,
    borderRadius: 999,
    backgroundColor: "#1AB7FF",
    shadowColor: "#3BD6FF",
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 12,
  },
  engineGlowInner: {
    position: "absolute",
    bottom: -8,
    width: 28,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#E3FFFF",
    shadowColor: "#7DE8FF",
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 10,
  },
  centralBodyShadow: {
    position: "absolute",
    bottom: 30,
    width: 128,
    height: 62,
    backgroundColor: "#2E4157",
    borderRadius: 18,
  },
  centralBody: {
    position: "absolute",
    bottom: 40,
    width: 120,
    height: 64,
    backgroundColor: "#F6F8FC",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    overflow: "hidden",
  },
  bodyHighlight: {
    position: "absolute",
    top: 8,
    width: 72,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    opacity: 0.88,
  },
  bodyCenterStripe: {
    position: "absolute",
    top: 0,
    width: 14,
    height: 64,
    backgroundColor: "#DF4555",
    opacity: 0.96,
  },
  bodyRedPanel: {
    position: "absolute",
    bottom: 19,
    width: 64,
    height: 10,
    borderRadius: 6,
    backgroundColor: "#D9485A",
  },
  bodyPanel: {
    position: "absolute",
    bottom: 8,
    width: 82,
    height: 18,
    borderRadius: 8,
    backgroundColor: "#96A8BD",
  },
  bodyInset: {
    position: "absolute",
    top: 18,
    width: 74,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#E0E8F1",
    opacity: 0.7,
  },
  bodyChinPlate: {
    position: "absolute",
    bottom: 0,
    width: 40,
    height: 14,
    backgroundColor: "#CBD6E4",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  shipNoseSpine: {
    position: "absolute",
    top: 6,
    width: 18,
    height: 56,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  shipNoseBase: {
    position: "absolute",
    top: 20,
    width: 26,
    height: 58,
    borderRadius: 999,
    backgroundColor: "#F6FAFF",
  },
  shipNoseCheekLeft: {
    position: "absolute",
    top: 46,
    left: 92,
    width: 28,
    height: 12,
    borderRadius: 8,
    backgroundColor: "#E8EEF7",
    transform: [{ rotate: "-10deg" }],
  },
  shipNoseCheekRight: {
    position: "absolute",
    top: 46,
    right: 92,
    width: 28,
    height: 12,
    borderRadius: 8,
    backgroundColor: "#E8EEF7",
    transform: [{ rotate: "10deg" }],
  },
  shipNoseFrontLeft: {
    position: "absolute",
    top: 18,
    left: 102,
    width: 18,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "-12deg" }],
  },
  shipNoseFrontRight: {
    position: "absolute",
    top: 18,
    right: 102,
    width: 18,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "12deg" }],
  },
  shipNoseBridge: {
    position: "absolute",
    top: 56,
    width: 40,
    height: 16,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: "#E8EFF8",
  },
  shipNoseCap: {
    position: "absolute",
    top: 2,
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  shipNoseShine: {
    position: "absolute",
    top: 12,
    width: 10,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    opacity: 0.9,
  },
  cockpitFrame: {
    position: "absolute",
    top: 64,
    width: 50,
    height: 22,
    borderRadius: 12,
    backgroundColor: "#23364F",
    borderWidth: 2,
    borderColor: "#DDEFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cockpitGlass: {
    width: 38,
    height: 10,
    borderRadius: 8,
    backgroundColor: "#4D84C7",
  },
  cockpitReflection: {
    position: "absolute",
    top: 4,
    width: 14,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#F6FEFF",
    opacity: 0.95,
  },
  milkyWayBand: {
    position: "absolute",
    top: 78,
    left: -260,
    width: 980,
    height: 240,
    borderRadius: 999,
    backgroundColor: "rgba(96, 126, 226, 0.12)",
  },
  milkyWayCore: {
    position: "absolute",
    top: 112,
    left: -210,
    width: 920,
    height: 110,
    borderRadius: 999,
    backgroundColor: "rgba(244, 238, 255, 0.18)",
  },
  milkyWayDustLane: {
    position: "absolute",
    top: 146,
    left: -250,
    width: 950,
    height: 48,
    borderRadius: 999,
    backgroundColor: "rgba(34, 42, 92, 0.22)",
  },
  milkyWayBandEcho: {
    position: "absolute",
    top: 148,
    left: -280,
    width: 920,
    height: 176,
    borderRadius: 999,
    backgroundColor: "rgba(82, 112, 210, 0.1)",
  },
  milkyWayGlow: {
    position: "absolute",
    top: 104,
    left: -190,
    width: 860,
    height: 168,
    borderRadius: 999,
    backgroundColor: "rgba(222, 212, 255, 0.14)",
  },
  spaceHazeA: {
    position: "absolute",
    top: 166,
    left: -80,
    width: 280,
    height: 160,
    borderRadius: 999,
    backgroundColor: "rgba(48, 64, 138, 0.14)",
    transform: [{ rotate: "-8deg" }],
  },
  spaceHazeB: {
    position: "absolute",
    bottom: 178,
    right: -44,
    width: 290,
    height: 150,
    borderRadius: 999,
    backgroundColor: "rgba(116, 42, 126, 0.13)",
    transform: [{ rotate: "16deg" }],
  },
  spaceHazeC: {
    position: "absolute",
    top: 276,
    left: -24,
    width: 220,
    height: 108,
    borderRadius: 999,
    backgroundColor: "rgba(28, 94, 144, 0.11)",
    transform: [{ rotate: "-14deg" }],
  },
  spaceHazeD: {
    position: "absolute",
    bottom: 120,
    right: -60,
    width: 320,
    height: 130,
    borderRadius: 999,
    backgroundColor: "rgba(78, 42, 122, 0.11)",
    transform: [{ rotate: "10deg" }],
  },
  distantPlanet: {
    position: "absolute",
    top: 74,
    right: -26,
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#253A73",
    opacity: 0.62,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(154, 178, 255, 0.18)",
  },
  distantPlanetShadow: {
    position: "absolute",
    right: -10,
    bottom: -2,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(11, 19, 47, 0.42)",
  },
  distantPlanetRing: {
    position: "absolute",
    top: 28,
    left: -6,
    width: 92,
    height: 22,
    borderRadius: 999,
    backgroundColor: "rgba(110, 136, 226, 0.22)",
    transform: [{ rotate: "-18deg" }],
  },
  distantPlanetCap: {
    position: "absolute",
    top: 14,
    left: 18,
    width: 34,
    height: 18,
    borderRadius: 999,
    backgroundColor: "rgba(202, 221, 255, 0.18)",
    transform: [{ rotate: "-16deg" }],
  },
  distantPlanetGlow: {
    position: "absolute",
    top: 58,
    right: -40,
    width: 138,
    height: 138,
    borderRadius: 69,
    backgroundColor: "rgba(76, 105, 206, 0.08)",
  },
  distantMoon: {
    position: "absolute",
    top: 238,
    left: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(235, 241, 255, 0.58)",
  },
  asteroidClusterA: {
    position: "absolute",
    top: 166,
    left: 78,
    width: 16,
    height: 16,
    borderRadius: 5,
    backgroundColor: "rgba(117, 130, 150, 0.78)",
    transform: [{ rotate: "18deg" }],
  },
  asteroidClusterB: {
    position: "absolute",
    bottom: 236,
    right: 52,
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: "rgba(98, 113, 130, 0.8)",
    transform: [{ rotate: "-16deg" }],
  },
  asteroidClusterC: {
    position: "absolute",
    bottom: 214,
    right: 78,
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: "rgba(149, 159, 171, 0.72)",
    transform: [{ rotate: "22deg" }],
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4, 8, 16, 0.78)",
    paddingHorizontal: 28,
    zIndex: 4,
  },
  gameOverTitle: {
    color: "#FFE3E6",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 3,
    textAlign: "center",
  },
  gameOverText: {
    color: "#D3DDEA",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 22,
  },
  stageClearUnlockBanner: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(127, 240, 201, 0.34)",
    backgroundColor: "rgba(14, 42, 34, 0.92)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
    gap: 4,
  },
  stageClearUnlockEyebrow: {
    color: "#A8F5D1",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
  },
  stageClearUnlockText: {
    color: "#F1FFF8",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
  },
  gameOverPrimaryButton: {
    width: "100%",
    borderWidth: 2,
    borderColor: "#7FF5B5",
    backgroundColor: "#132118",
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 10,
  },
  gameOverPrimaryButtonText: {
    color: "#D8FFE8",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
  },
  gameOverSecondaryButton: {
    width: "100%",
    borderWidth: 2,
    borderColor: "#6980A3",
    backgroundColor: "#121A27",
    paddingVertical: 14,
    alignItems: "center",
  },
  gameOverSecondaryButtonText: {
    color: "#E5EDF7",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  controlsDock: {
    position: "absolute",
    left: SCREEN_HORIZONTAL_PADDING,
    right: SCREEN_HORIZONTAL_PADDING,
    bottom: SCREEN_BOTTOM_PADDING,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    zIndex: 7,
  },
  controlsDockSplit: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 10,
  },
  boostControl: {
    width: 72,
    height: 72,
    borderWidth: 1.5,
    borderColor: "#69C7FF",
    backgroundColor: "rgba(10, 18, 30, 0.9)",
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: "#69C7FF",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 7,
  },
  boostControlActive: {
    backgroundColor: "rgba(14, 28, 48, 0.98)",
    shadowColor: "#7FE0FF",
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 10,
  },
  boostLabel: {
    color: "#D9F2FF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  boostMeter: {
    width: 28,
    height: 28,
    borderWidth: 1.5,
    borderColor: "rgba(137, 197, 255, 0.95)",
    backgroundColor: "rgba(6, 12, 22, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
    borderRadius: 999,
  },
  boostMeterFill: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#59B8FF",
  },
  boostMeterFillActive: {
    width: 16,
    height: 16,
    backgroundColor: "#D7FAFF",
  },
  primaryControls: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  primaryControlsSplit: {
    flex: 0,
  },
  joystickCluster: {
    flex: 1,
    justifyContent: "flex-end",
  },
  swipeHintText: {
    color: "#C3DBEE",
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
    marginLeft: 6,
    textAlign: "left",
  },
  joystickBase: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: "rgba(205, 227, 255, 0.24)",
    backgroundColor: "rgba(11, 18, 28, 0.5)",
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
    overflow: "hidden",
  },
  joystickButton: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14, 22, 35, 0.56)",
    borderWidth: 1,
    borderColor: "rgba(160, 210, 255, 0.42)",
    opacity: 0.78,
  },
  joystickButtonLeft: {
    shadowColor: "#8FD4FF",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  joystickButtonRight: {
    shadowColor: "#8FD4FF",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  joystickCenterRail: {
    flex: 1,
    height: 2,
    marginHorizontal: 6,
    borderRadius: 999,
    backgroundColor: "rgba(168, 217, 255, 0.18)",
  },
  fireCluster: {
    width: 94,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    marginLeft: 0,
    marginBottom: 28,
  },
  fireHintText: {
    color: "#B7D7F2",
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.9,
    marginBottom: 3,
    textAlign: "right",
  },
  fireButton: {
    width: 72,
    height: 72,
    borderWidth: 1.5,
    borderColor: "#8ED4FF",
    backgroundColor: "#0D1824",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#61C8FF",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    borderRadius: 999,
  },
  fireButtonActive: {
    backgroundColor: "#16345A",
    borderColor: "#C5E6FF",
    shadowOpacity: 0.65,
    shadowRadius: 12,
    elevation: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  fireButtonText: {
    color: "#DDF6FF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    textAlign: "center",
  },
});
