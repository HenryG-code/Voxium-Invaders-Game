import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const SCREEN_HORIZONTAL_PADDING = 18;
const SCREEN_TOP_PADDING = 56;
const SCREEN_BOTTOM_PADDING = 24;

const SHIP_STEP = 24;
const SHIP_FRAME_WIDTH = 244;
const SHIP_FRAME_HEIGHT = 150;
const SHIP_BOUNDING_WIDTH = 178;
const PLAY_AREA_PADDING = 22;
const PLAY_AREA_BOTTOM_PADDING = 18;

const FAR_STAR_COUNT = 18;
const MID_STAR_COUNT = 16;
const NEAR_STAR_COUNT = 14;
const FOREGROUND_STREAK_COUNT = 6;
const SPEED_LINE_COUNT = 6;

const NORMAL_TRAVEL_PER_MS = 0.00018;
const BOOST_TRAVEL_PER_MS = 0.00038;
const BULLET_SPEED_PX_PER_MS = 0.92;
const MOVE_SOUND_COOLDOWN_MS = 140;
const BULLET_WIDTH = 6;
const BULLET_HEIGHT = 24;
const ENEMY_FRAME_WIDTH = 70;
const ENEMY_FRAME_HEIGHT = 54;
const ENEMY_HITBOX_WIDTH = 40;
const ENEMY_HITBOX_HEIGHT = 28;

const INITIAL_LIVES = 3;

type GameState = 'menu' | 'playing' | 'gameOver';
type StarLayer = 'far' | 'mid' | 'near';
type EnemyPalette = 'red' | 'purple' | 'green';

type FlightStar = {
  id: number;
  baseX: number;
  size: number;
  opacity: number;
  speed: number;
  phaseOffset: number;
  layer: StarLayer;
};

type ForegroundStreak = {
  id: number;
  baseX: number;
  speed: number;
  length: number;
  phaseOffset: number;
};

type Bullet = {
  id: number;
  x: number;
  y: number;
};

type Enemy = {
  id: number;
  x: number;
  y: number;
  speed: number;
  drift: number;
  scale: number;
  palette: EnemyPalette;
  wobblePhase: number;
};

type SceneState = {
  elapsedMs: number;
  travel: number;
  bullets: Bullet[];
  enemies: Enemy[];
  lives: number;
};

type HeroShipProps = {
  bankAngle: number;
  isBoosting: boolean;
  shipOffset?: number;
  shipLift?: number;
  scale?: number;
  decorative?: boolean;
};

type AlienInvaderProps = {
  enemy: Enemy;
  elapsedMs: number;
  contentWidth: number;
};

function spreadFromCenter() {
  const raw = Math.random() * 2 - 1;
  return Math.sign(raw) * Math.pow(Math.abs(raw), 1.4);
}

function createStars(count: number, layer: StarLayer, startId: number): FlightStar[] {
  const settings = {
    far: { size: 1.6, opacity: 0.35, speedMin: 0.42, speedMax: 0.58 },
    mid: { size: 2.2, opacity: 0.55, speedMin: 0.72, speedMax: 0.94 },
    near: { size: 3, opacity: 0.85, speedMin: 1.08, speedMax: 1.32 },
  };

  const layerSettings = settings[layer];

  return Array.from({ length: count }, (_, index) => ({
    id: startId + index,
    baseX: spreadFromCenter(),
    size: layerSettings.size + Math.random() * 0.9,
    opacity: layerSettings.opacity + Math.random() * 0.1,
    speed:
      layerSettings.speedMin +
      Math.random() * (layerSettings.speedMax - layerSettings.speedMin),
    phaseOffset: Math.random(),
    layer,
  }));
}

function createForegroundStreaks(count: number): ForegroundStreak[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    baseX: (Math.random() * 2 - 1) * 0.32,
    speed: 1.1 + Math.random() * 0.4,
    length: 40 + Math.random() * 46,
    phaseOffset: Math.random(),
  }));
}

function createEnemy(id: number, contentWidth: number): Enemy {
  const maxSpawnOffset = Math.max(40, contentWidth / 2 - 42);
  const palettes: EnemyPalette[] = ['red', 'purple', 'green'];

  return {
    id,
    x: (Math.random() * 2 - 1) * maxSpawnOffset,
    y: -88,
    speed: 0.048 + Math.random() * 0.05,
    drift: (Math.random() * 2 - 1) * 0.012,
    scale: 0.9 + Math.random() * 0.28,
    palette: palettes[Math.floor(Math.random() * palettes.length)],
    wobblePhase: Math.random() * Math.PI * 2,
  };
}

function getEnemyCenterX(enemy: Enemy, elapsedMs: number) {
  return enemy.x + Math.sin(elapsedMs / 420 + enemy.wobblePhase) * 4;
}

function HeroShip({
  bankAngle,
  isBoosting,
  shipOffset = 0,
  shipLift = 0,
  scale = 1,
  decorative = false,
}: HeroShipProps) {
  const engineGlowOpacity = isBoosting ? 1 : decorative ? 0.76 : 0.58;
  const engineGlowScale = isBoosting ? 1.9 : decorative ? 1.2 : 1;
  const accelerationScale = isBoosting ? 1.03 : 1;

  return (
    <View
      style={[
        styles.shipFrame,
        {
          transform: [
            { translateX: shipOffset },
            { translateY: shipLift },
            { rotate: `${bankAngle}deg` },
            { scaleX: scale * accelerationScale },
            { scaleY: scale * (isBoosting ? 1.02 : 1) },
          ],
        },
      ]}>
      <View style={styles.shipShadow} />
      <View
        style={[
          styles.engineGlowOuter,
          {
            opacity: engineGlowOpacity * 0.8,
            transform: [{ scaleX: engineGlowScale }, { scaleY: engineGlowScale * 1.2 }],
          },
        ]}
      />
      <View
        style={[
          styles.engineGlowInner,
          {
            opacity: engineGlowOpacity,
            transform: [{ scaleX: engineGlowScale }, { scaleY: engineGlowScale }],
          },
        ]}
      />

      <View style={styles.leftWingShadow} />
      <View style={styles.rightWingShadow} />
      <View style={styles.leftWingRear} />
      <View style={styles.rightWingRear} />
      <View style={styles.leftWingFront} />
      <View style={styles.rightWingFront} />
      <View style={styles.leftWingStripeUpper} />
      <View style={styles.rightWingStripeUpper} />
      <View style={styles.leftWingStripeLower} />
      <View style={styles.rightWingStripeLower} />
      <View style={styles.leftWingCannon} />
      <View style={styles.rightWingCannon} />
      <View style={styles.leftEnginePod} />
      <View style={styles.rightEnginePod} />
      <View style={styles.leftEngineGlowStub} />
      <View style={styles.rightEngineGlowStub} />

      <View style={styles.rearEngineSection} />
      <View style={styles.engineVentLeft} />
      <View style={styles.engineVentCenter} />
      <View style={styles.engineVentRight} />
      <View style={styles.engineDeckPlate} />

      <View style={styles.centralBodyShadow} />
      <View style={styles.centralBody}>
        <View style={styles.bodyHighlight} />
        <View style={styles.bodyCenterStripe} />
        <View style={styles.bodyRedPanel} />
        <View style={styles.bodyPanel} />
        <View style={styles.bodyInset} />
        <View style={styles.bodyChinPlate} />
      </View>

      <View style={styles.shipNoseSpine} />
      <View style={styles.shipNoseBase} />
      <View style={styles.shipNoseCheekLeft} />
      <View style={styles.shipNoseCheekRight} />
      <View style={styles.shipNoseFrontLeft} />
      <View style={styles.shipNoseFrontRight} />
      <View style={styles.shipNoseBridge} />
      <View style={styles.shipNoseCap} />
      <View style={styles.shipNoseShine} />

      <View style={styles.cockpitFrame}>
        <View style={styles.cockpitGlass} />
        <View style={styles.cockpitReflection} />
      </View>
    </View>
  );
}

function AlienInvader({ enemy, elapsedMs, contentWidth }: AlienInvaderProps) {
  const paletteStyles = {
    red: {
      hull: styles.enemyHullRed,
      dome: styles.enemyDomeRed,
      wing: styles.enemyWingRed,
      eye: styles.enemyEyeRed,
      glow: styles.enemyGlowRed,
    },
    purple: {
      hull: styles.enemyHullPurple,
      dome: styles.enemyDomePurple,
      wing: styles.enemyWingPurple,
      eye: styles.enemyEyePurple,
      glow: styles.enemyGlowPurple,
    },
    green: {
      hull: styles.enemyHullGreen,
      dome: styles.enemyDomeGreen,
      wing: styles.enemyWingGreen,
      eye: styles.enemyEyeGreen,
      glow: styles.enemyGlowGreen,
    },
  };

  const palette = paletteStyles[enemy.palette];
  const centerX = getEnemyCenterX(enemy, elapsedMs);

  return (
    <View
      style={[
        styles.enemyFrame,
        {
          left: contentWidth / 2 + centerX - ENEMY_FRAME_WIDTH / 2,
          top: enemy.y - ENEMY_FRAME_HEIGHT / 2,
          transform: [{ scale: enemy.scale }],
        },
      ]}>
      <View style={[styles.enemyGlow, palette.glow]} />
      <View style={[styles.enemyWingLeft, palette.wing]} />
      <View style={[styles.enemyWingRight, palette.wing]} />
      <View style={[styles.enemyHull, palette.hull]} />
      <View style={[styles.enemyDome, palette.dome]} />
      <View style={[styles.enemyEyeLeft, palette.eye]} />
      <View style={[styles.enemyEyeRight, palette.eye]} />
      <View style={[styles.enemyFinLeft, palette.wing]} />
      <View style={[styles.enemyFinRight, palette.wing]} />
    </View>
  );
}

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [shipOffset, setShipOffset] = useState(0);
  const [isBoosting, setIsBoosting] = useState(false);
  const [playAreaHeight, setPlayAreaHeight] = useState(0);
  const [scene, setScene] = useState<SceneState>({
    elapsedMs: 0,
    travel: 0,
    bullets: [],
    enemies: [],
    lives: INITIAL_LIVES,
  });

  const boostRef = useRef(isBoosting);
  const gameStateRef = useRef<GameState>(gameState);
  const playAreaHeightRef = useRef(playAreaHeight);
  const contentWidthRef = useRef(Math.max(0, width - SCREEN_HORIZONTAL_PADDING * 2));
  const heightRef = useRef(height);
  const lastMoveAtRef = useRef(0);
  const lastMoveDirectionRef = useRef<0 | -1 | 1>(0);
  const lastMoveSoundAtRef = useRef(0);
  const bulletIdRef = useRef(0);
  const enemyIdRef = useRef(0);
  const enemySpawnClockRef = useRef(0);
  const nextEnemySpawnMsRef = useRef(850);

  const firePlayer = useAudioPlayer(require('../../assets/sounds/blaster1.wav'));
  const boostPlayer = useAudioPlayer(require('../../assets/sounds/Boost.wav'));
  const movePlayer = useAudioPlayer(require('../../assets/sounds/move.wav'));
  const destroyPlayer = useAudioPlayer(require('../../assets/sounds/Destroy1.wav'));

  const maxShipOffset = Math.max(
    0,
    width / 2 - SHIP_BOUNDING_WIDTH / 2 - PLAY_AREA_PADDING
  );
  const contentWidth = Math.max(0, width - SCREEN_HORIZONTAL_PADDING * 2);

  const stars = useMemo(
    () => [
      ...createStars(FAR_STAR_COUNT, 'far', 0),
      ...createStars(MID_STAR_COUNT, 'mid', 100),
      ...createStars(NEAR_STAR_COUNT, 'near', 200),
    ],
    []
  );

  const foregroundStreaks = useMemo(
    () => createForegroundStreaks(FOREGROUND_STREAK_COUNT),
    []
  );

  useEffect(() => {
    boostRef.current = isBoosting;
  }, [isBoosting]);

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
      Math.max(-maxShipOffset, Math.min(maxShipOffset, currentOffset))
    );
  }, [maxShipOffset]);

  useEffect(() => {
    firePlayer.volume = 0.55;
    boostPlayer.volume = 0.4;
    movePlayer.volume = 0.28;
    destroyPlayer.volume = 0.38;
  }, [boostPlayer, destroyPlayer, firePlayer, movePlayer]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
  }, [destroyPlayer]);

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
        enemySpawnClockRef.current += deltaMs;

        const spawnedEnemies: Enemy[] = [];
        let shouldPlayDestroySound = false;

        while (enemySpawnClockRef.current >= nextEnemySpawnMsRef.current) {
          enemySpawnClockRef.current -= nextEnemySpawnMsRef.current;
          spawnedEnemies.push(createEnemy(enemyIdRef.current++, contentWidthRef.current));
          nextEnemySpawnMsRef.current = 1500 + Math.random() * 900;
        }

        setScene((currentScene) => {
          const activePlayAreaHeight =
            playAreaHeightRef.current || Math.max(260, heightRef.current * 0.52);

          const advancedEnemies = currentScene.enemies
            .map((enemy) => ({
              ...enemy,
              x: enemy.x + enemy.drift * deltaMs,
              y: enemy.y + enemy.speed * deltaMs,
            }));

          const survivingBullets: Bullet[] = [];
          const survivingEnemies: Enemy[] = [];
          const hitEnemyIds = new Set<number>();

          for (const bullet of currentScene.bullets) {
            const nextBullet = {
              ...bullet,
              y: bullet.y - deltaMs * BULLET_SPEED_PX_PER_MS,
            };

            if (nextBullet.y + BULLET_HEIGHT <= -40) {
              continue;
            }

            const bulletCenterY = nextBullet.y + BULLET_HEIGHT / 2;
            let didHitEnemy = false;

            for (const enemy of advancedEnemies) {
              if (hitEnemyIds.has(enemy.id)) {
                continue;
              }

              const enemyCenterX = getEnemyCenterX(enemy, currentScene.elapsedMs + deltaMs);
              const enemyHalfWidth = (ENEMY_HITBOX_WIDTH * enemy.scale) / 2;
              const enemyHalfHeight = (ENEMY_HITBOX_HEIGHT * enemy.scale) / 2;
              const bulletHitX =
                Math.abs(nextBullet.x - enemyCenterX) <= enemyHalfWidth + BULLET_WIDTH / 2;
              const bulletHitY =
                Math.abs(bulletCenterY - enemy.y) <= enemyHalfHeight + BULLET_HEIGHT / 2;

              if (bulletHitX && bulletHitY) {
                hitEnemyIds.add(enemy.id);
                didHitEnemy = true;
                shouldPlayDestroySound = true;
                break;
              }
            }

            if (!didHitEnemy) {
              survivingBullets.push(nextBullet);
            }
          }

          let passedEnemyCount = 0;

          for (const enemy of advancedEnemies) {
            if (hitEnemyIds.has(enemy.id)) {
              continue;
            }

            if (enemy.y > activePlayAreaHeight + ENEMY_FRAME_HEIGHT) {
              passedEnemyCount += 1;
              continue;
            }

            survivingEnemies.push(enemy);
          }

          const lifeLoss = Math.min(1, passedEnemyCount);

          return {
            elapsedMs: currentScene.elapsedMs + deltaMs,
            travel:
              currentScene.travel +
              deltaMs * (boostRef.current ? BOOST_TRAVEL_PER_MS : NORMAL_TRAVEL_PER_MS),
            bullets: survivingBullets,
            enemies: [...survivingEnemies, ...spawnedEnemies.slice(0, Math.max(0, 4 - survivingEnemies.length))],
            lives: Math.max(0, currentScene.lives - lifeLoss),
          };
        });

        if (shouldPlayDestroySound) {
          void playSoundSafely(destroyPlayer);
        }
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [destroyPlayer]);

  useEffect(() => {
    if (gameState === 'playing' && scene.lives <= 0) {
      setGameState('gameOver');
      setIsBoosting(false);
      void resetSoundSafely(boostPlayer);
    }
  }, [boostPlayer, destroyPlayer, gameState, scene.lives]);

  const playSoundSafely = async (player: ReturnType<typeof useAudioPlayer>) => {
    try {
      await player.seekTo(0);
      player.play();
    } catch {
      try {
        player.play();
      } catch {}
    }
  };

  const resetSoundSafely = async (player: ReturnType<typeof useAudioPlayer>) => {
    try {
      player.pause();
      await player.seekTo(0);
    } catch {}
  };

  const resetRunState = () => {
    setIsBoosting(false);
    setShipOffset(0);
    lastMoveAtRef.current = 0;
    lastMoveDirectionRef.current = 0;
    lastMoveSoundAtRef.current = 0;
    bulletIdRef.current = 0;
    enemyIdRef.current = 0;
    enemySpawnClockRef.current = 0;
    nextEnemySpawnMsRef.current = 1500;
    setScene({
      elapsedMs: 0,
      travel: 0,
      bullets: [],
      enemies: [],
      lives: INITIAL_LIVES,
    });
  };

  const startGame = () => {
    resetRunState();
    setGameState('playing');
  };

  const returnToMenu = () => {
    setGameState('menu');
    resetRunState();
    void resetSoundSafely(boostPlayer);
  };

  const moveShip = (direction: -1 | 1) => {
    if (gameState !== 'playing') {
      return;
    }

    lastMoveAtRef.current = scene.elapsedMs;
    lastMoveDirectionRef.current = direction;

    let didMove = false;

    setShipOffset((currentOffset) => {
      const nextOffset = Math.max(
        -maxShipOffset,
        Math.min(maxShipOffset, currentOffset + direction * SHIP_STEP)
      );
      didMove = nextOffset !== currentOffset;
      return nextOffset;
    });

    if (didMove && scene.elapsedMs - lastMoveSoundAtRef.current > MOVE_SOUND_COOLDOWN_MS) {
      lastMoveSoundAtRef.current = scene.elapsedMs;
      void playSoundSafely(movePlayer);
    }
  };

  const handleFire = () => {
    if (gameState !== 'playing') {
      return;
    }

    const activePlayAreaHeight = playAreaHeight || Math.max(260, height * 0.52);
    const currentShipLift = boostRef.current ? -16 : 0;
    const bulletStartY =
      activePlayAreaHeight - PLAY_AREA_BOTTOM_PADDING - SHIP_FRAME_HEIGHT + 4 + currentShipLift;

    const newBullet: Bullet = {
      id: bulletIdRef.current++,
      x: shipOffset,
      y: bulletStartY,
    };

    setScene((currentScene) => ({
      ...currentScene,
      bullets: [...currentScene.bullets, newBullet],
    }));

    void playSoundSafely(firePlayer);
  };

  const handleBoostStart = () => {
    if (gameState !== 'playing' || boostRef.current) {
      return;
    }

    setIsBoosting(true);
    void playSoundSafely(boostPlayer);
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

  const isManeuvering = scene.elapsedMs - lastMoveAtRef.current < 220;
  const bankProgress = Math.max(0, 1 - (scene.elapsedMs - lastMoveAtRef.current) / 220);
  const shipBank = lastMoveDirectionRef.current * bankProgress * 9;
  const motionIntensity = isBoosting ? 1 : isManeuvering ? 0.45 : 0.14;
  const shipLift = isBoosting ? -16 : 0;
  const travelAmount = gameState === 'playing' ? scene.travel : 0;

  return (
    <View style={styles.screen}>
      <View style={styles.spaceLayer} pointerEvents="none">
        <View
          style={[
            styles.milkyWayBand,
            {
              transform: [
                { translateX: gameState === 'playing' ? travelAmount * -14 : 0 },
                { rotate: '-18deg' },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.milkyWayGlow,
            {
              transform: [
                { translateX: gameState === 'playing' ? travelAmount * -10 : 0 },
                { rotate: '-18deg' },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.spaceHazeA,
            { transform: [{ translateX: gameState === 'playing' ? travelAmount * -8 : 0 }] },
          ]}
        />
        <View
          style={[
            styles.spaceHazeB,
            { transform: [{ translateX: gameState === 'playing' ? travelAmount * 6 : 0 }] },
          ]}
        />
        <View
          style={[
            styles.distantPlanet,
            { transform: [{ translateX: gameState === 'playing' ? travelAmount * -5 : 0 }] },
          ]}
        />
        <View style={styles.distantPlanetGlow} />
        <View
          style={[
            styles.distantMoon,
            { transform: [{ translateX: gameState === 'playing' ? travelAmount * -3 : 0 }] },
          ]}
        />
        <View
          style={[
            styles.asteroidClusterA,
            { transform: [{ translateX: gameState === 'playing' ? travelAmount * 4 : 0 }] },
          ]}
        />
        <View
          style={[
            styles.asteroidClusterB,
            { transform: [{ translateX: gameState === 'playing' ? travelAmount * 6 : 0 }] },
          ]}
        />
        <View
          style={[
            styles.asteroidClusterC,
            { transform: [{ translateX: gameState === 'playing' ? travelAmount * 3 : 0 }] },
          ]}
        />

        {stars.map((star) => {
          const progress = (travelAmount * star.speed + star.phaseOffset) % 1;
          const easedProgress = Math.pow(progress, 1.45);
          const outwardSpread = width * (0.08 + easedProgress * 0.48);
          const x = width / 2 + star.baseX * outwardSpread;
          const y = height * 0.18 + easedProgress * height * 0.68;
          const size = star.size * (0.75 + easedProgress * 1.55);
          const opacity = Math.min(1, star.opacity * (0.45 + easedProgress));

          return (
            <View
              key={star.id}
              style={[
                styles.star,
                star.layer === 'near' && styles.nearStar,
                {
                  left: x,
                  top: y,
                  width: size,
                  height: size,
                  opacity,
                  transform: [{ translateX: -size / 2 }, { translateY: -size / 2 }],
                },
              ]}
            />
          );
        })}

        {gameState === 'playing' &&
          foregroundStreaks.map((streak) => {
            const progress = (scene.travel * streak.speed + streak.phaseOffset) % 1;

            if (progress < 0.58) {
              return null;
            }

            const visibleProgress = (progress - 0.58) / 0.42;
            const x = width / 2 + streak.baseX * width * (0.3 + visibleProgress * 0.44);
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

        {gameState === 'playing' &&
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

      {gameState === 'menu' ? (
        <View style={styles.menuScreen}>
          <View style={styles.menuDecorPlanetLarge} />
          <View style={styles.menuDecorPlanetRing} />
          <View style={styles.menuDecorPlanetSmall} />
          <View style={styles.menuDecorNebulaA} />
          <View style={styles.menuDecorNebulaB} />
          <View style={styles.menuDecorAsteroidA} />
          <View style={styles.menuDecorAsteroidB} />
          <View style={styles.menuDecorAsteroidC} />

          <View style={styles.menuHeader}>
            <Text style={styles.menuEyebrow}>ARCADE FLIGHT SYSTEM</Text>
            <Text style={styles.menuTitle}>VOXIUM</Text>
            <Text style={styles.menuTitle}>INVADERS</Text>
            <Text style={styles.menuBlurb}>
              Pilot the rebel striker through deep-space assault lanes.
            </Text>
          </View>

          <View style={styles.menuActions}>
            <Pressable
              style={styles.menuStartButton}
              onPress={startGame}
              android_disableSound>
              <Text style={styles.menuStartButtonText}>START GAME</Text>
            </Pressable>
            <Pressable
              style={styles.menuSecondaryButton}
              onPress={() => {}}
              android_disableSound>
              <Text style={styles.menuSecondaryButtonText}>OPTIONS</Text>
            </Pressable>
            <Pressable
              style={styles.menuSecondaryButton}
              onPress={() => {}}
              android_disableSound>
              <Text style={styles.menuSecondaryButtonText}>HIGH SCORES</Text>
            </Pressable>
            <Pressable
              style={styles.menuSecondaryButton}
              onPress={() => {}}
              android_disableSound>
              <Text style={styles.menuSecondaryButtonText}>CREDITS</Text>
            </Pressable>
          </View>

          <View style={styles.menuShipStage}>
            <HeroShip bankAngle={-4} isBoosting={false} scale={1.32} decorative />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.hud}>
            <Text style={styles.hudText}>SCORE 0000</Text>
            <Text style={styles.hudText}>LIVES {scene.lives}</Text>
          </View>

          <View style={styles.titleWrap}>
            <Text style={styles.title}>VOXIUM INVADERS</Text>
            <Text style={styles.subtitle}>
              {gameState === 'gameOver' ? 'SIGNAL LOST' : 'FLIGHT VECTOR ENGAGED'}
            </Text>
          </View>

          <Pressable
            style={styles.menuReturnButton}
            onPress={returnToMenu}
            android_disableSound>
            <Text style={styles.menuReturnButtonText}>MENU</Text>
          </Pressable>

          <View style={styles.playArea} onLayout={handlePlayAreaLayout}>
            <View style={styles.enemyLayer} pointerEvents="none">
              {scene.enemies.map((enemy) => (
                <AlienInvader
                  key={enemy.id}
                  enemy={enemy}
                  elapsedMs={scene.elapsedMs}
                  contentWidth={contentWidth}
                />
              ))}
            </View>

            <View style={styles.bulletLayer} pointerEvents="none">
              {scene.bullets.map((bullet) => (
                <View
                  key={bullet.id}
                  style={[
                    styles.bulletShell,
                    {
                      left: contentWidth / 2 + bullet.x - BULLET_WIDTH / 2,
                      top: bullet.y,
                    },
                  ]}>
                  <View style={styles.bulletCore} />
                </View>
              ))}
            </View>

            <HeroShip
              bankAngle={shipBank}
              isBoosting={isBoosting}
              shipOffset={shipOffset}
              shipLift={shipLift}
            />

            {gameState === 'gameOver' && (
              <View style={styles.gameOverOverlay}>
                <Text style={styles.gameOverTitle}>GAME OVER</Text>
                <Text style={styles.gameOverText}>The invaders broke through your flight lane.</Text>
                <Pressable
                  style={styles.gameOverPrimaryButton}
                  onPress={startGame}
                  android_disableSound>
                  <Text style={styles.gameOverPrimaryButtonText}>RESTART</Text>
                </Pressable>
                <Pressable
                  style={styles.gameOverSecondaryButton}
                  onPress={returnToMenu}
                  android_disableSound>
                  <Text style={styles.gameOverSecondaryButtonText}>MAIN MENU</Text>
                </Pressable>
              </View>
            )}
          </View>

          {gameState === 'playing' && (
            <View style={styles.controlsDock}>
              <Pressable
                style={[styles.boostControl, isBoosting && styles.boostControlActive]}
                onPressIn={handleBoostStart}
                onPressOut={handleBoostEnd}
                onPress={() => {}}
                android_disableSound>
                <Text style={styles.boostLabel}>BOOST</Text>
                <View style={styles.boostMeter}>
                  <View
                    style={[styles.boostMeterFill, isBoosting && styles.boostMeterFillActive]}
                  />
                </View>
              </Pressable>

              <View style={styles.primaryControls}>
                <Pressable
                  style={styles.button}
                  onPress={() => moveShip(-1)}
                  android_disableSound>
                  <Text style={styles.buttonText}>LEFT</Text>
                </Pressable>

                <Pressable
                  style={styles.fireButton}
                  onPress={handleFire}
                  android_disableSound>
                  <Text style={styles.fireButtonText}>FIRE</Text>
                </Pressable>

                <Pressable
                  style={styles.button}
                  onPress={() => moveShip(1)}
                  android_disableSound>
                  <Text style={styles.buttonText}>RIGHT</Text>
                </Pressable>
              </View>
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
    backgroundColor: '#000000',
    paddingTop: SCREEN_TOP_PADDING,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingBottom: SCREEN_BOTTOM_PADDING,
    overflow: 'hidden',
  },
  spaceLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
  },
  nearStar: {
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.85,
    shadowRadius: 4,
    elevation: 4,
  },
  foregroundStreak: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#EAF7FF',
    borderRadius: 999,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  speedLine: {
    position: 'absolute',
    width: 1,
    backgroundColor: '#9FD8FF',
    borderRadius: 999,
  },
  menuScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 24,
    paddingBottom: 12,
  },
  menuHeader: {
    alignItems: 'center',
    zIndex: 2,
  },
  menuEyebrow: {
    color: '#9ECFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
  },
  menuTitle: {
    color: '#F2F7FF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: '#5DC8FF',
    textShadowRadius: 10,
    lineHeight: 40,
  },
  menuBlurb: {
    color: '#C8D8EA',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 14,
    maxWidth: 260,
    lineHeight: 18,
  },
  menuActions: {
    width: '100%',
    gap: 10,
    zIndex: 2,
  },
  menuStartButton: {
    borderWidth: 2,
    borderColor: '#80F7B6',
    backgroundColor: '#142118',
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#80F7B6',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  menuStartButtonText: {
    color: '#D9FFE9',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  menuSecondaryButton: {
    borderWidth: 2,
    borderColor: '#4E6480',
    backgroundColor: '#101622',
    paddingVertical: 14,
    alignItems: 'center',
  },
  menuSecondaryButtonText: {
    color: '#DFE7F0',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  menuShipStage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 12,
    zIndex: 2,
  },
  menuDecorPlanetLarge: {
    position: 'absolute',
    top: 86,
    right: -26,
    width: 112,
    height: 112,
    borderRadius: 999,
    backgroundColor: '#273F76',
    opacity: 0.55,
  },
  menuDecorPlanetRing: {
    position: 'absolute',
    top: 126,
    right: -42,
    width: 150,
    height: 28,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#90B8FF',
    opacity: 0.45,
    transform: [{ rotate: '-14deg' }],
  },
  menuDecorPlanetSmall: {
    position: 'absolute',
    top: 240,
    left: 10,
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#7D2E4D',
    opacity: 0.7,
  },
  menuDecorNebulaA: {
    position: 'absolute',
    top: 180,
    left: -30,
    width: 180,
    height: 110,
    borderRadius: 999,
    backgroundColor: '#243970',
    opacity: 0.18,
    transform: [{ rotate: '-10deg' }],
  },
  menuDecorNebulaB: {
    position: 'absolute',
    top: 330,
    right: -20,
    width: 170,
    height: 96,
    borderRadius: 999,
    backgroundColor: '#5D1849',
    opacity: 0.16,
    transform: [{ rotate: '18deg' }],
  },
  menuDecorAsteroidA: {
    position: 'absolute',
    top: 154,
    left: 82,
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#69778D',
    transform: [{ rotate: '22deg' }],
    opacity: 0.8,
  },
  menuDecorAsteroidB: {
    position: 'absolute',
    top: 418,
    right: 48,
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: '#5E6F81',
    transform: [{ rotate: '-16deg' }],
    opacity: 0.75,
  },
  menuDecorAsteroidC: {
    position: 'absolute',
    bottom: 210,
    left: 30,
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: '#8697A6',
    transform: [{ rotate: '14deg' }],
    opacity: 0.8,
  },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    zIndex: 2,
  },
  hudText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: 18,
    zIndex: 2,
  },
  title: {
    color: '#F2F7FF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    color: '#9FC7FF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 6,
  },
  menuReturnButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#89B8E7',
    backgroundColor: '#0C1421',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
    zIndex: 2,
  },
  menuReturnButtonText: {
    color: '#DCE9F7',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  playArea: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: PLAY_AREA_BOTTOM_PADDING,
    zIndex: 2,
  },
  enemyLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  enemyFrame: {
    position: 'absolute',
    width: 70,
    height: 54,
    marginLeft: -35,
    marginTop: -27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enemyGlow: {
    position: 'absolute',
    bottom: 8,
    width: 40,
    height: 18,
    borderRadius: 999,
    opacity: 0.55,
  },
  enemyGlowRed: {
    backgroundColor: '#FF5870',
    shadowColor: '#FF5870',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  enemyGlowPurple: {
    backgroundColor: '#B65DFF',
    shadowColor: '#B65DFF',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  enemyGlowGreen: {
    backgroundColor: '#49F59B',
    shadowColor: '#49F59B',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  enemyWingLeft: {
    position: 'absolute',
    left: 6,
    bottom: 16,
    width: 22,
    height: 14,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 4,
    transform: [{ rotate: '-16deg' }],
  },
  enemyWingRight: {
    position: 'absolute',
    right: 6,
    bottom: 16,
    width: 22,
    height: 14,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 4,
    transform: [{ rotate: '16deg' }],
  },
  enemyWingRed: {
    backgroundColor: '#EE4C64',
  },
  enemyWingPurple: {
    backgroundColor: '#A95CFF',
  },
  enemyWingGreen: {
    backgroundColor: '#42DE8E',
  },
  enemyHull: {
    position: 'absolute',
    bottom: 14,
    width: 34,
    height: 18,
    borderRadius: 10,
    borderWidth: 2,
  },
  enemyHullRed: {
    backgroundColor: '#6F1827',
    borderColor: '#FF8FA1',
  },
  enemyHullPurple: {
    backgroundColor: '#43175E',
    borderColor: '#D1A4FF',
  },
  enemyHullGreen: {
    backgroundColor: '#133B28',
    borderColor: '#9CFFD0',
  },
  enemyDome: {
    position: 'absolute',
    bottom: 22,
    width: 22,
    height: 14,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  enemyDomeRed: {
    backgroundColor: '#FF8FA1',
  },
  enemyDomePurple: {
    backgroundColor: '#D2A1FF',
  },
  enemyDomeGreen: {
    backgroundColor: '#9AFFC5',
  },
  enemyEyeLeft: {
    position: 'absolute',
    bottom: 24,
    left: 28,
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  enemyEyeRight: {
    position: 'absolute',
    bottom: 24,
    right: 28,
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  enemyEyeRed: {
    backgroundColor: '#FFF3F5',
  },
  enemyEyePurple: {
    backgroundColor: '#F7EDFF',
  },
  enemyEyeGreen: {
    backgroundColor: '#F0FFF6',
  },
  enemyFinLeft: {
    position: 'absolute',
    left: 16,
    bottom: 6,
    width: 6,
    height: 14,
    borderRadius: 4,
  },
  enemyFinRight: {
    position: 'absolute',
    right: 16,
    bottom: 6,
    width: 6,
    height: 14,
    borderRadius: 4,
  },
  bulletLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  bulletShell: {
    position: 'absolute',
    width: BULLET_WIDTH,
    height: BULLET_HEIGHT,
    borderRadius: 999,
    backgroundColor: '#54D2FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#54D2FF',
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  bulletCore: {
    width: 2,
    height: BULLET_HEIGHT - 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  shipFrame: {
    width: SHIP_FRAME_WIDTH,
    height: SHIP_FRAME_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  shipShadow: {
    position: 'absolute',
    bottom: 10,
    width: 152,
    height: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(16, 24, 36, 0.46)',
  },
  leftWingShadow: {
    position: 'absolute',
    left: 22,
    bottom: 26,
    width: 104,
    height: 18,
    backgroundColor: '#34465D',
    borderRadius: 12,
    transform: [{ rotate: '-11deg' }],
  },
  rightWingShadow: {
    position: 'absolute',
    right: 22,
    bottom: 26,
    width: 104,
    height: 18,
    backgroundColor: '#34465D',
    borderRadius: 12,
    transform: [{ rotate: '11deg' }],
  },
  leftWingRear: {
    position: 'absolute',
    left: 30,
    bottom: 38,
    width: 102,
    height: 16,
    backgroundColor: '#EEF3FA',
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 8,
    transform: [{ rotate: '-10deg' }],
  },
  rightWingRear: {
    position: 'absolute',
    right: 30,
    bottom: 38,
    width: 102,
    height: 16,
    backgroundColor: '#F4F7FC',
    borderTopRightRadius: 30,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 8,
    transform: [{ rotate: '10deg' }],
  },
  leftWingFront: {
    position: 'absolute',
    left: 42,
    bottom: 68,
    width: 108,
    height: 14,
    backgroundColor: '#FAFCFF',
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 6,
    transform: [{ rotate: '-6deg' }],
  },
  rightWingFront: {
    position: 'absolute',
    right: 42,
    bottom: 68,
    width: 108,
    height: 14,
    backgroundColor: '#FAFCFF',
    borderTopRightRadius: 28,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 6,
    transform: [{ rotate: '6deg' }],
  },
  leftWingStripeUpper: {
    position: 'absolute',
    left: 68,
    bottom: 74,
    width: 30,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#DA4352',
    transform: [{ rotate: '-6deg' }],
  },
  rightWingStripeUpper: {
    position: 'absolute',
    right: 68,
    bottom: 74,
    width: 30,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#DA4352',
    transform: [{ rotate: '6deg' }],
  },
  leftWingStripeLower: {
    position: 'absolute',
    left: 58,
    bottom: 50,
    width: 38,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#DA4352',
    transform: [{ rotate: '-10deg' }],
  },
  rightWingStripeLower: {
    position: 'absolute',
    right: 58,
    bottom: 50,
    width: 38,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#DA4352',
    transform: [{ rotate: '10deg' }],
  },
  leftWingCannon: {
    position: 'absolute',
    left: 14,
    bottom: 64,
    width: 6,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#D8E1EC',
    transform: [{ rotate: '-6deg' }],
  },
  rightWingCannon: {
    position: 'absolute',
    right: 14,
    bottom: 64,
    width: 6,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#D8E1EC',
    transform: [{ rotate: '6deg' }],
  },
  leftEnginePod: {
    position: 'absolute',
    left: 56,
    bottom: 28,
    width: 18,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#DDE5F0',
    borderWidth: 2,
    borderColor: '#F8FBFF',
  },
  rightEnginePod: {
    position: 'absolute',
    right: 56,
    bottom: 28,
    width: 18,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#DDE5F0',
    borderWidth: 2,
    borderColor: '#F8FBFF',
  },
  leftEngineGlowStub: {
    position: 'absolute',
    left: 59,
    bottom: 8,
    width: 12,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#94E9FF',
    opacity: 0.72,
  },
  rightEngineGlowStub: {
    position: 'absolute',
    right: 59,
    bottom: 8,
    width: 12,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#94E9FF',
    opacity: 0.72,
  },
  rearEngineSection: {
    position: 'absolute',
    bottom: 10,
    width: 106,
    height: 34,
    backgroundColor: '#8A9DB4',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 2,
    borderColor: '#D3DDEB',
  },
  engineVentLeft: {
    position: 'absolute',
    bottom: 21,
    left: 76,
    width: 14,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#14324D',
  },
  engineVentCenter: {
    position: 'absolute',
    bottom: 22,
    width: 20,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#1A4667',
  },
  engineVentRight: {
    position: 'absolute',
    bottom: 21,
    right: 76,
    width: 14,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#14324D',
  },
  engineDeckPlate: {
    position: 'absolute',
    bottom: 38,
    width: 66,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#B4C0D1',
  },
  engineGlowOuter: {
    position: 'absolute',
    bottom: -18,
    width: 54,
    height: 60,
    borderRadius: 999,
    backgroundColor: '#1AB7FF',
    shadowColor: '#3BD6FF',
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 12,
  },
  engineGlowInner: {
    position: 'absolute',
    bottom: -8,
    width: 28,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#E3FFFF',
    shadowColor: '#7DE8FF',
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 10,
  },
  centralBodyShadow: {
    position: 'absolute',
    bottom: 30,
    width: 128,
    height: 62,
    backgroundColor: '#2E4157',
    borderRadius: 18,
  },
  centralBody: {
    position: 'absolute',
    bottom: 40,
    width: 120,
    height: 64,
    backgroundColor: '#F6F8FC',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bodyHighlight: {
    position: 'absolute',
    top: 8,
    width: 72,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    opacity: 0.88,
  },
  bodyCenterStripe: {
    position: 'absolute',
    top: 0,
    width: 14,
    height: 64,
    backgroundColor: '#DF4555',
    opacity: 0.96,
  },
  bodyRedPanel: {
    position: 'absolute',
    bottom: 19,
    width: 64,
    height: 10,
    borderRadius: 6,
    backgroundColor: '#D9485A',
  },
  bodyPanel: {
    position: 'absolute',
    bottom: 8,
    width: 82,
    height: 18,
    borderRadius: 8,
    backgroundColor: '#96A8BD',
  },
  bodyInset: {
    position: 'absolute',
    top: 18,
    width: 74,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E0E8F1',
    opacity: 0.7,
  },
  bodyChinPlate: {
    position: 'absolute',
    bottom: 0,
    width: 40,
    height: 14,
    backgroundColor: '#CBD6E4',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  shipNoseSpine: {
    position: 'absolute',
    top: 6,
    width: 18,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  shipNoseBase: {
    position: 'absolute',
    top: 20,
    width: 26,
    height: 58,
    borderRadius: 999,
    backgroundColor: '#F6FAFF',
  },
  shipNoseCheekLeft: {
    position: 'absolute',
    top: 46,
    left: 92,
    width: 28,
    height: 12,
    borderRadius: 8,
    backgroundColor: '#E8EEF7',
    transform: [{ rotate: '-10deg' }],
  },
  shipNoseCheekRight: {
    position: 'absolute',
    top: 46,
    right: 92,
    width: 28,
    height: 12,
    borderRadius: 8,
    backgroundColor: '#E8EEF7',
    transform: [{ rotate: '10deg' }],
  },
  shipNoseFrontLeft: {
    position: 'absolute',
    top: 18,
    left: 102,
    width: 18,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-12deg' }],
  },
  shipNoseFrontRight: {
    position: 'absolute',
    top: 18,
    right: 102,
    width: 18,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '12deg' }],
  },
  shipNoseBridge: {
    position: 'absolute',
    top: 56,
    width: 40,
    height: 16,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: '#E8EFF8',
  },
  shipNoseCap: {
    position: 'absolute',
    top: 2,
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  shipNoseShine: {
    position: 'absolute',
    top: 12,
    width: 10,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  cockpitFrame: {
    position: 'absolute',
    top: 64,
    width: 50,
    height: 22,
    borderRadius: 12,
    backgroundColor: '#23364F',
    borderWidth: 2,
    borderColor: '#DDEFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cockpitGlass: {
    width: 38,
    height: 10,
    borderRadius: 8,
    backgroundColor: '#4D84C7',
  },
  cockpitReflection: {
    position: 'absolute',
    top: 4,
    width: 14,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#F6FEFF',
    opacity: 0.95,
  },
  milkyWayBand: {
    position: 'absolute',
    top: 102,
    left: -120,
    width: 620,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(112, 132, 224, 0.055)',
  },
  milkyWayGlow: {
    position: 'absolute',
    top: 138,
    left: -84,
    width: 580,
    height: 90,
    borderRadius: 999,
    backgroundColor: 'rgba(196, 160, 255, 0.045)',
  },
  spaceHazeA: {
    position: 'absolute',
    top: 186,
    left: -60,
    width: 250,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(48, 64, 138, 0.09)',
    transform: [{ rotate: '-8deg' }],
  },
  spaceHazeB: {
    position: 'absolute',
    bottom: 184,
    right: -34,
    width: 260,
    height: 130,
    borderRadius: 999,
    backgroundColor: 'rgba(116, 42, 126, 0.085)',
    transform: [{ rotate: '16deg' }],
  },
  distantPlanet: {
    position: 'absolute',
    top: 74,
    right: -26,
    width: 104,
    height: 104,
    borderRadius: 999,
    backgroundColor: '#253A73',
    opacity: 0.54,
  },
  distantPlanetGlow: {
    position: 'absolute',
    top: 58,
    right: -40,
    width: 138,
    height: 138,
    borderRadius: 999,
    backgroundColor: 'rgba(76, 105, 206, 0.08)',
  },
  distantMoon: {
    position: 'absolute',
    top: 238,
    left: 14,
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(235, 241, 255, 0.58)',
  },
  asteroidClusterA: {
    position: 'absolute',
    top: 166,
    left: 78,
    width: 16,
    height: 16,
    borderRadius: 5,
    backgroundColor: 'rgba(117, 130, 150, 0.78)',
    transform: [{ rotate: '18deg' }],
  },
  asteroidClusterB: {
    position: 'absolute',
    bottom: 236,
    right: 52,
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(98, 113, 130, 0.8)',
    transform: [{ rotate: '-16deg' }],
  },
  asteroidClusterC: {
    position: 'absolute',
    bottom: 214,
    right: 78,
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: 'rgba(149, 159, 171, 0.72)',
    transform: [{ rotate: '22deg' }],
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4, 8, 16, 0.78)',
    paddingHorizontal: 28,
    zIndex: 4,
  },
  gameOverTitle: {
    color: '#FFE3E6',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
  },
  gameOverText: {
    color: '#D3DDEA',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 22,
  },
  gameOverPrimaryButton: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#7FF5B5',
    backgroundColor: '#132118',
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  gameOverPrimaryButtonText: {
    color: '#D8FFE8',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  gameOverSecondaryButton: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#6980A3',
    backgroundColor: '#121A27',
    paddingVertical: 14,
    alignItems: 'center',
  },
  gameOverSecondaryButtonText: {
    color: '#E5EDF7',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  controlsDock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    zIndex: 3,
  },
  boostControl: {
    width: 86,
    minHeight: 92,
    borderWidth: 2,
    borderColor: '#70FFB8',
    backgroundColor: '#101A12',
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  boostControlActive: {
    backgroundColor: '#173025',
    shadowColor: '#70FFB8',
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 10,
  },
  boostLabel: {
    color: '#C8FFD6',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  boostMeter: {
    width: 18,
    height: 44,
    borderWidth: 2,
    borderColor: '#8CEAC1',
    backgroundColor: '#07120B',
    justifyContent: 'flex-end',
    padding: 2,
  },
  boostMeterFill: {
    height: 10,
    backgroundColor: '#3F8D5F',
  },
  boostMeterFillActive: {
    height: 34,
    backgroundColor: '#8BFFD1',
  },
  primaryControls: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#111111',
    paddingVertical: 15,
    alignItems: 'center',
  },
  fireButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#8ED4FF',
    backgroundColor: '#0D1824',
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#61C8FF',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  fireButtonText: {
    color: '#DDF6FF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
