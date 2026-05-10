import { useEffect } from 'react';
import type { AudioPlayer } from 'expo-audio';

import {
  applyPlayerDamage,
  BOOST_TRAVEL_PER_MS,
  BOSS_STAGE,
  BULLET_HEIGHT,
  BULLET_WIDTH,
  MAX_ACTIVE_BULLETS,
  MAX_SHIELD_POINTS,
  NORMAL_TRAVEL_PER_MS,
  PLAY_AREA_BOTTOM_PADDING,
  SHIP_BOUNDING_WIDTH,
  SHIP_FRAME_HEIGHT,
  SHIP_COLLISION_HEIGHT,
  createEnemy,
  createExplosion,
  type BossLaser,
  type Bullet,
  type BulletKind,
  type Enemy,
  type EnemyCollisionCandidate,
  type EnemyKind,
  type GameState,
  type SceneState,
  clamp,
  getBulletDamage,
  getBulletHeight,
  getBulletSpeed,
  getBulletWidth,
  getEnemyDamage,
  getEnemyFrameHeight,
  getEnemyFrameWidth,
  getEnemyScore,
  getEnemyCenterX,
  getEnemyCenterY,
} from '@/components/game/game-logic';
import {
  advanceBossLasers,
  createBossLaser,
  doesBossLaserHitShip,
  getBossLaserOriginY,
  getStageEnemySpawnKind,
  getStageMaxHostiles,
  shouldLaunchBossLaser,
} from '@/components/game/game-enemy-system';
import { getBossSpawnThreshold, getNextEnemySpawnDelay } from '@/components/game/game-stage';
import { playSoundSafely, resetSoundSafely } from '@/components/game/game-audio';

type MutableNumberRef = { current: number };
type MutableBooleanRef = { current: boolean };
type MutableGameStateRef = { current: GameState };
type MutableSceneRef = { current: SceneState };

type UseGameLoopArgs = {
  bossLaserIdRef: MutableNumberRef;
  explosionIdRef: MutableNumberRef;
  bossPlayer: AudioPlayer;
  boostPlayer: AudioPlayer;
  boostRef: MutableBooleanRef;
  bulletIdRef: MutableNumberRef;
  contentWidthRef: MutableNumberRef;
  destroyPlayer: AudioPlayer;
  enemyIdRef: MutableNumberRef;
  enemySpawnClockRef: MutableNumberRef;
  fireHoldStartAtRef: MutableNumberRef;
  firePlayer: AudioPlayer;
  gameState: GameState;
  gameStateRef: MutableGameStateRef;
  heightRef: MutableNumberRef;
  isFireHeldRef: MutableBooleanRef;
  isSfxEnabledRef: MutableBooleanRef;
  lastFireAtRef: MutableNumberRef;
  maxShipOffset: number;
  nextEnemySpawnMsRef: MutableNumberRef;
  bossSpawnedRef: MutableBooleanRef;
  playAreaHeightRef: MutableNumberRef;
  pulseChargeMs: number;
  pulseModeRef: MutableBooleanRef;
  pulsePlayer: AudioPlayer;
  scene: SceneState;
  sceneRef: MutableSceneRef;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  setIsBoosting: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFireHeld: React.Dispatch<React.SetStateAction<boolean>>;
  setLastRunScore: React.Dispatch<React.SetStateAction<number>>;
  setScene: React.Dispatch<React.SetStateAction<SceneState>>;
  shipOffsetRef: MutableNumberRef;
  standardFireCooldownMs: number;
  wavePlayer: AudioPlayer;
};

export function useGameLoop({
  bossLaserIdRef,
  explosionIdRef,
  bossPlayer,
  boostPlayer,
  boostRef,
  bulletIdRef,
  contentWidthRef,
  destroyPlayer,
  enemyIdRef,
  enemySpawnClockRef,
  fireHoldStartAtRef,
  firePlayer,
  gameState,
  gameStateRef,
  heightRef,
  isFireHeldRef,
  isSfxEnabledRef,
  lastFireAtRef,
  maxShipOffset,
  nextEnemySpawnMsRef,
  bossSpawnedRef,
  playAreaHeightRef,
  pulseChargeMs,
  pulseModeRef,
  pulsePlayer,
  scene,
  sceneRef,
  setGameState,
  setIsBoosting,
  setIsFireHeld,
  setLastRunScore,
  setScene,
  shipOffsetRef,
  standardFireCooldownMs,
  wavePlayer,
}: UseGameLoopArgs) {
  useEffect(() => {
    let frameId = 0;
    let previousTime = 0;

    const animate = (time: number) => {
      if (!previousTime) {
        previousTime = time;
      }

      const deltaMs = Math.min(34, time - previousTime);
      previousTime = time;

      if (gameStateRef.current === 'playing') {
        let shouldPlayDestroySound = false;
        let shouldPlayPulseSound = false;
        let shouldPlayWaveSound = false;
        let shouldPlayBossSound = false;
        let shouldEnterStageClear = false;
        enemySpawnClockRef.current += deltaMs;

        setScene((currentScene) => {
          const activePlayAreaHeight =
            playAreaHeightRef.current || Math.max(260, heightRef.current * 0.52);
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
          const spawnedBullets: Bullet[] = [];
          const spawnedBossLasers: BossLaser[] = [];
          const nextElapsedMs = currentScene.elapsedMs + deltaMs;
          let nextScore = currentScene.score || 0;
          let nextPlayerHp = currentScene.playerHp ?? 5;
          let nextPlayerShield = currentScene.playerShield || 0;
          let nextPlayerDamageFlashMs = Math.max(
            0,
            (currentScene.playerDamageFlashMs || 0) - deltaMs,
          );
          let nextStageKills = currentScene.stageKills || 0;
          let bossDefeated = currentScene.bossDefeated || false;
          const bossSpawnThreshold = getBossSpawnThreshold(currentStage);
          const bossAlreadyActive = currentScene.enemies.some(
            (enemy) => enemy.kind === 'boss',
          );
          let shouldSpawnBoss =
            !bossSpawnedRef.current &&
            !bossAlreadyActive &&
            nextStageKills >= bossSpawnThreshold;
          const shipCenterY =
            activePlayAreaHeight -
            PLAY_AREA_BOTTOM_PADDING -
            SHIP_FRAME_HEIGHT / 2 +
            (boostRef.current ? -16 : 0);

          const queueExplosion = (x: number, y: number, kind: EnemyKind) => {
            nextExplosions.push(
              createExplosion(explosionIdRef.current++, x, y, kind),
            );
          };

          const queuePlayerShot = (kind: BulletKind) => {
            const cooldown = kind === 'pulse' ? pulseChargeMs : standardFireCooldownMs;

            if (nextElapsedMs - lastFireAtRef.current < cooldown) {
              return false;
            }

            if (
              currentScene.bullets.length + spawnedBullets.length >= MAX_ACTIVE_BULLETS
            ) {
              return false;
            }

            const bulletHeight = getBulletHeight(kind);
            const currentShipLift = boostRef.current ? -16 : 0;
            const bulletStartY =
              activePlayAreaHeight -
              PLAY_AREA_BOTTOM_PADDING -
              SHIP_FRAME_HEIGHT +
              12 +
              currentShipLift -
              Math.max(0, bulletHeight - BULLET_HEIGHT) / 2;

            spawnedBullets.push({
              id: bulletIdRef.current++,
              x: shipOffsetRef.current,
              y: bulletStartY,
              kind,
            });
            lastFireAtRef.current = nextElapsedMs;
            return true;
          };

          if (isFireHeldRef.current) {
            const heldDuration = nextElapsedMs - fireHoldStartAtRef.current;

            if (heldDuration >= pulseChargeMs) {
              pulseModeRef.current = true;
            }

            if (pulseModeRef.current && queuePlayerShot('pulse')) {
              shouldPlayPulseSound = true;
            }
          }

          while (enemySpawnClockRef.current >= nextEnemySpawnMsRef.current) {
            enemySpawnClockRef.current -= nextEnemySpawnMsRef.current;

            if (shouldSpawnBoss) {
              spawnedEnemies.push(
                createEnemy(
                  enemyIdRef.current++,
                  contentWidthRef.current,
                  'boss',
                  currentStage,
                ),
              );
              bossSpawnedRef.current = true;
              shouldSpawnBoss = false;
              shouldPlayBossSound = true;
              break;
            } else {
              const activeHostileCount = currentScene.enemies.filter(
                (enemy) => enemy.kind !== 'boss',
              ).length;
              const pendingHostileCount = spawnedEnemies.filter(
                (enemy) => enemy.kind !== 'boss',
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
                shouldPlayWaveSound = true;
              }
            }

            nextEnemySpawnMsRef.current = getNextEnemySpawnDelay(currentStage);
          }

          for (const enemy of currentScene.enemies) {
            const advancedEnemy: Enemy = {
              ...enemy,
              x: enemy.x + enemy.drift * deltaMs,
              y: enemy.y + enemy.speed * deltaMs,
              fireClockMs: enemy.fireClockMs + deltaMs,
            };

            if (
              shouldLaunchBossLaser(
                advancedEnemy,
                currentStage,
                advancedEnemy.fireClockMs,
              )
            ) {
              spawnedBossLasers.push(
                createBossLaser(
                  bossLaserIdRef.current++,
                  clamp(shipOffsetRef.current, -maxShipOffset, maxShipOffset),
                  getBossLaserOriginY(advancedEnemy, nextElapsedMs),
                ),
              );
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
              (centerX - halfWidth) / 64,
            );
            const endBin = Math.floor((centerX + halfWidth) / 64);

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
            advancedEnemies.push({
              ...enemy,
              fireClockMs: enemy.fireClockMs + deltaMs,
            });
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
            shouldPlayDestroySound = true;
            nextScore += getEnemyScore(enemy.kind);

            if (enemy.kind === 'boss') {
              bossDefeated = true;
              shouldEnterStageClear = true;
              nextPlayerShield = Math.min(MAX_SHIELD_POINTS, nextPlayerShield + MAX_SHIELD_POINTS);
            } else {
              nextStageKills += 1;
            }

            queueExplosion(candidate.centerX, candidate.centerY, enemy.kind);
          };

          for (const bullet of currentScene.bullets) {
            const bulletWidth = getBulletWidth(bullet.kind);
            const bulletHeight = getBulletHeight(bullet.kind);
            const nextBullet = {
              ...bullet,
              y: bullet.y - deltaMs * getBulletSpeed(bullet.kind),
            };

            if (nextBullet.y + bulletHeight <= -40) {
              continue;
            }

            const bulletCenterY = nextBullet.y + bulletHeight / 2;
            let didHitEnemy = false;
            const bulletBin = Math.floor(nextBullet.x / 64);
            const checkedEnemyIds = new Set<number>();
            const collisionCandidates = [
              ...(collisionBins.get(bulletBin - 1) ?? []),
              ...(collisionBins.get(bulletBin) ?? []),
              ...(collisionBins.get(bulletBin + 1) ?? []),
            ];
            const impactedCandidates: EnemyCollisionCandidate[] = [];

            for (const candidate of collisionCandidates) {
              const enemy = candidate.enemy;
              if (hitEnemyIds.has(enemy.id) || checkedEnemyIds.has(enemy.id)) {
                continue;
              }

              checkedEnemyIds.add(enemy.id);

              const bulletHitX =
                Math.abs(nextBullet.x - candidate.centerX) <=
                candidate.halfWidth + bulletWidth / 2 + (bullet.kind === 'pulse' ? 26 : 0);
              const bulletHitY =
                Math.abs(bulletCenterY - candidate.centerY) <=
                candidate.halfHeight + bulletHeight / 2 + (bullet.kind === 'pulse' ? 18 : 0);

              if (bulletHitX && bulletHitY) {
                impactedCandidates.push(candidate);
                if (bullet.kind !== 'pulse') {
                  break;
                }
              }
            }

            if (impactedCandidates.length > 0) {
              didHitEnemy = true;
              const bulletDamage = getBulletDamage(bullet.kind);

              for (const candidate of impactedCandidates) {
                if (hitEnemyIds.has(candidate.enemy.id)) {
                  continue;
                }

                if (candidate.enemy.hp > bulletDamage) {
                  candidate.enemy.hp -= bulletDamage;
                } else {
                  resolveEnemyKill(candidate);
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
              shouldPlayDestroySound = true;
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

            const damageResult = applyPlayerDamage(nextPlayerShield, nextPlayerHp, 1);
            nextPlayerShield = damageResult.playerShield;
            nextPlayerHp = damageResult.playerHp;
            nextPlayerDamageFlashMs = 240;
            laser.hasHitPlayer = true;
          }

          if (shouldEnterStageClear) {
            return {
              ...currentScene,
              elapsedMs: nextElapsedMs,
              travel:
                currentScene.travel +
                deltaMs * (boostRef.current ? BOOST_TRAVEL_PER_MS : NORMAL_TRAVEL_PER_MS),
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
              explosions: nextExplosions,
              lives: nextPlayerHp,
            };
          }

          return {
            ...currentScene,
            elapsedMs: nextElapsedMs,
            travel:
              currentScene.travel +
              deltaMs * (boostRef.current ? BOOST_TRAVEL_PER_MS : NORMAL_TRAVEL_PER_MS),
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
            explosions: nextExplosions,
            lives: nextPlayerHp,
          };
        });

        if (shouldPlayDestroySound) {
          void playSoundSafely(destroyPlayer, isSfxEnabledRef.current);
        }

        if (shouldPlayPulseSound) {
          void resetSoundSafely(firePlayer);
          void playSoundSafely(pulsePlayer, isSfxEnabledRef.current);
        }

        if (shouldPlayWaveSound) {
          void playSoundSafely(wavePlayer, isSfxEnabledRef.current);
        }

        if (shouldPlayBossSound) {
          void playSoundSafely(bossPlayer, isSfxEnabledRef.current);
        }
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [
    bossLaserIdRef,
    bossPlayer,
    boostPlayer,
    boostRef,
    bulletIdRef,
    contentWidthRef,
    destroyPlayer,
    enemyIdRef,
    enemySpawnClockRef,
    fireHoldStartAtRef,
    firePlayer,
    gameState,
    gameStateRef,
    heightRef,
    isFireHeldRef,
    isSfxEnabledRef,
    lastFireAtRef,
    maxShipOffset,
    nextEnemySpawnMsRef,
    playAreaHeightRef,
    pulseChargeMs,
    pulseModeRef,
    pulsePlayer,
    scene,
    sceneRef,
    setIsBoosting,
    setIsFireHeld,
    setLastRunScore,
    setScene,
    shipOffsetRef,
    standardFireCooldownMs,
    wavePlayer,
  ]);

  useEffect(() => {
    if (gameState === 'playing' && scene.playerHp <= 0) {
      setLastRunScore(scene.score);
      setIsBoosting(false);
      setIsFireHeld(false);
      setGameState('gameOver');
      void resetSoundSafely(boostPlayer);
      void resetSoundSafely(pulsePlayer);
    }
  }, [
    boostPlayer,
    gameState,
    pulsePlayer,
    scene.playerHp,
    scene.score,
    setGameState,
    setIsBoosting,
    setIsFireHeld,
    setLastRunScore,
  ]);

  useEffect(() => {
    if (gameState === 'playing' && scene.bossDefeated) {
      setLastRunScore(scene.score);
      setIsBoosting(false);
      setIsFireHeld(false);
      setGameState('stageClear');
      void resetSoundSafely(boostPlayer);
    }
  }, [
    boostPlayer,
    gameState,
    scene.bossDefeated,
    scene.score,
    setGameState,
    setIsBoosting,
    setIsFireHeld,
    setLastRunScore,
  ]);
}
