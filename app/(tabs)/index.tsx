import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import Constants from "expo-constants";
import { Image as ExpoImage } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

const SCREEN_HORIZONTAL_PADDING = 18;
const SCREEN_TOP_PADDING = 56;
const SCREEN_BOTTOM_PADDING = 24;

const SHIP_STEP = 24;
const SHIP_FRAME_WIDTH = 200;
const SHIP_FRAME_HEIGHT = 200;
const SHIP_BOUNDING_WIDTH = 160;
const SHIP_MUZZLE_OFFSET = 18;
const SHIP_PIXEL_SIZE = 4;
const PLAYER_SHIP_IMAGE = require("../../assets/images/playerShip.png");
const ENEMY_MODEL_IMAGE = require("../../assets/images/Enemy1.png");
const PLAY_AREA_PADDING = 22;
const PLAY_AREA_BOTTOM_PADDING = 18;

const BOSS_STAGE = 1;
const BOSS_HP = 18;

const FAR_STAR_COUNT = 36;
const MID_STAR_COUNT = 32;
const NEAR_STAR_COUNT = 28;
const FOREGROUND_STREAK_COUNT = 6;
const SPEED_LINE_COUNT = 6;

const NORMAL_TRAVEL_PER_MS = 0.00018;
const BOOST_TRAVEL_PER_MS = 0.00038;
const BULLET_SPEED_PX_PER_MS = 0.92;
const MOVE_SOUND_COOLDOWN_MS = 140;
const FIRE_COOLDOWN_MS = 130;
const PULSE_FIRE_COOLDOWN_MS = 380;
const PULSE_CHARGE_MS = 320;
const MAX_ACTIVE_BULLETS = 10;
const COLLISION_BIN_WIDTH = 64;
const BULLET_WIDTH = 6;
const BULLET_HEIGHT = 24;
const PULSE_BULLET_WIDTH = 34;
const PULSE_BULLET_HEIGHT = 30;
const PULSE_BULLET_SPEED_PX_PER_MS = 0.8;
const ENEMY_FRAME_WIDTH = 126;
const ENEMY_FRAME_HEIGHT = 69;
const ASTEROID_FRAME_SIZE = 84;
const TOUCH_CONTROL_HEIGHT = 120;
const SHIP_COLLISION_HEIGHT = 30;
const MAX_SHIELD_POINTS = 3;
const EXPLOSION_DURATION_MS = 420;

const INITIAL_LIVES = 5;

type GameState = "menu" | "playing" | "stageClear" | "gameOver";
type StarLayer = "far" | "mid" | "near";
type MenuPanel = "main" | "options" | "hangar" | "credits" | "records";
type ControlLayout = "classic" | "split";
type EnemyKind = "grunt" | "boss" | "asteroid";
type BulletKind = "standard" | "pulse";

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
  kind: BulletKind;
};

type Enemy = {
  id: number;
  x: number;
  y: number;
  speed: number;
  drift: number;
  scale: number;
  wobblePhase: number;
  kind: EnemyKind;
  hp: number;
  fireClockMs: number;
  fireCooldownMs: number;
};

type SceneState = {
  elapsedMs: number;
  travel: number;
  score: number;
  playerHp: number;
  playerShield: number;
  stage: number;
  stageKills: number;
  bossDefeated: boolean;
  bullets: Bullet[];
  enemies: Enemy[];
  explosions: Explosion[];
  lives: number;
};

type Explosion = {
  id: number;
  x: number;
  y: number;
  size: number;
  ageMs: number;
  maxAgeMs: number;
  color: string;
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

type EnemyCollisionCandidate = {
  enemy: Enemy;
  centerX: number;
  centerY: number;
  halfWidth: number;
  halfHeight: number;
};

const BOSS_SPAWN_KILL_THRESHOLD_STAGE_1 = 10;
const BOSS_SPAWN_KILL_THRESHOLD_STAGE_2 = 14;
const CREDITS_BLOCK_TEXT = `=== VOXIUM INVADERS ===

A retro space shooter prototype

CREATED BY
Henry Oosthuizen

GAME DESIGN & DEVELOPMENT
Henry Oosthuizen

ASSETS, SOUNDS & GAME MODELS
Christian Jooste

BUILT WITH
React Native
Expo
TypeScript

TOOLS & SUPPORT
OpenAI Codex
ChatGPT
Visual Studio Code
Android Studio

VISUAL STYLE
Retro arcade space combat
Deep-space environments
Hero fighter concept and gameplay direction

SPECIAL THANKS
Friends, testers, and early supporters

VERSION
Prototype v1.0

THANK YOU FOR PLAYING
The Voxium Sector still needs you...`;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getBulletWidth(kind: BulletKind) {
  return kind === "pulse" ? PULSE_BULLET_WIDTH : BULLET_WIDTH;
}

function getBulletHeight(kind: BulletKind) {
  return kind === "pulse" ? PULSE_BULLET_HEIGHT : BULLET_HEIGHT;
}

function getBulletSpeed(kind: BulletKind) {
  return kind === "pulse" ? PULSE_BULLET_SPEED_PX_PER_MS : BULLET_SPEED_PX_PER_MS;
}

function getBulletDamage(kind: BulletKind) {
  return kind === "pulse" ? 2 : 1;
}

function getEnemyFrameWidth(kind: EnemyKind) {
  return kind === "asteroid" ? ASTEROID_FRAME_SIZE : ENEMY_FRAME_WIDTH;
}

function getEnemyFrameHeight(kind: EnemyKind) {
  return kind === "asteroid" ? ASTEROID_FRAME_SIZE : ENEMY_FRAME_HEIGHT;
}

function getEnemyScore(kind: EnemyKind) {
  if (kind === "boss") {
    return 1000;
  }

  return kind === "asteroid" ? 150 : 100;
}

function getEnemyDamage(kind: EnemyKind) {
  if (kind === "boss") {
    return 2;
  }

  return 1;
}

function createExplosion(
  id: number,
  x: number,
  y: number,
  kind: EnemyKind,
): Explosion {
  if (kind === "boss") {
    return {
      id,
      x,
      y,
      size: 116,
      ageMs: 0,
      maxAgeMs: EXPLOSION_DURATION_MS + 160,
      color: "#FFE184",
    };
  }

  if (kind === "asteroid") {
    return {
      id,
      x,
      y,
      size: 68,
      ageMs: 0,
      maxAgeMs: EXPLOSION_DURATION_MS,
      color: "#F4B979",
    };
  }

  return {
    id,
    x,
    y,
    size: 54,
    ageMs: 0,
    maxAgeMs: EXPLOSION_DURATION_MS,
    color: "#7BE7FF",
  };
}

function applyPlayerDamage(
  playerShield: number,
  playerHp: number,
  damage: number,
) {
  let nextShield = playerShield;
  let nextHp = playerHp;
  let remainingDamage = damage;

  if (nextShield > 0) {
    const absorbed = Math.min(nextShield, remainingDamage);
    nextShield -= absorbed;
    remainingDamage -= absorbed;
  }

  if (remainingDamage > 0) {
    nextHp = Math.max(0, nextHp - remainingDamage);
  }

  return {
    playerShield: nextShield,
    playerHp: nextHp,
  };
}

function spreadFromCenter() {
  const raw = Math.random() * 2 - 1;
  return Math.sign(raw) * Math.pow(Math.abs(raw), 1.4);
}

function createStars(
  count: number,
  layer: StarLayer,
  startId: number,
): FlightStar[] {
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

function createEnemy(
  id: number,
  contentWidth: number,
  kind: EnemyKind = "grunt",
  stage = 1,
): Enemy {
  const maxSpawnOffset = Math.max(40, contentWidth / 2 - 42);

  return {
    id,
    kind,
    x:
      kind === "boss"
        ? 0
        : kind === "asteroid"
          ? (Math.random() * 2 - 1) * (maxSpawnOffset * 1.1)
          : (Math.random() * 2 - 1) * maxSpawnOffset,
    y: kind === "boss" ? (stage >= 2 ? 76 : 86) : kind === "asteroid" ? -104 : -88,
    speed:
      kind === "boss"
        ? 0.012
        : kind === "asteroid"
          ? 0.062 + Math.random() * 0.04
          : 0.048 + Math.random() * 0.05,
    drift:
      kind === "boss"
        ? 0
        : kind === "asteroid"
          ? (Math.random() * 2 - 1) * 0.022
          : (Math.random() * 2 - 1) * 0.012,
    scale:
      kind === "boss"
        ? (stage >= 2 ? 1.72 : 1.62)
        : kind === "asteroid"
          ? 0.82 + Math.random() * 0.4
          : 0.9 + Math.random() * 0.28,
    wobblePhase: Math.random() * Math.PI * 2,
    hp: kind === "boss" ? BOSS_HP : kind === "asteroid" ? 2 : 1,
    fireClockMs: Math.random() * 800,
    fireCooldownMs:
      kind === "boss"
        ? 1400
        : stage >= 2
          ? 1900 + Math.random() * 800
          : 2600 + Math.random() * 1100,
  };
}

function getEnemyCenterX(enemy: Enemy, elapsedMs: number) {
  const wobble =
    enemy.kind === "boss" ? 10 : enemy.kind === "asteroid" ? 2 : 4;
  return enemy.x + Math.sin(elapsedMs / 420 + enemy.wobblePhase) * wobble;
}

function getEnemyCenterY(enemy: Enemy, elapsedMs: number) {
  const sway =
    enemy.kind === "boss" ? 5 : enemy.kind === "asteroid" ? 1.5 : 3;
  return enemy.y + Math.cos(elapsedMs / 560 + enemy.wobblePhase * 0.8) * sway;
}

function HeroShip({
  bankAngle,
  isBoosting,
  shipOffset = 0,
  shipLift = 0,
  scale = 1,
  decorative = false,
}: HeroShipProps) {
  const accelerationScale = isBoosting ? 1.02 : 1;
  const modelScale = decorative ? 1.04 : 1;

  return (
    <View
      style={[
        styles.playerShipFrame,
        {
          transform: [
            { translateX: shipOffset },
            { translateY: shipLift },
            { rotate: `${bankAngle}deg` },
            { scaleX: scale * modelScale * accelerationScale },
            { scaleY: scale * modelScale * (isBoosting ? 1.02 : 1) },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.playerShipShadow,
          decorative && styles.playerShipShadowDecorative,
        ]}
      />
      <ExpoImage
        source={PLAYER_SHIP_IMAGE}
        contentFit="contain"
        style={styles.playerShipSvgImage}
      />
    </View>
  );
}

function AlienInvader({ enemy, elapsedMs, contentWidth }: AlienInvaderProps) {
  const centerX = getEnemyCenterX(enemy, elapsedMs);
  const centerY = getEnemyCenterY(enemy, elapsedMs);
  const frameWidth = getEnemyFrameWidth(enemy.kind);
  const frameHeight = getEnemyFrameHeight(enemy.kind);
  const asteroidSpin = `${(elapsedMs / 16 + enemy.wobblePhase * 28) % 360}deg`;

  return (
    <View
      style={[
        styles.enemyFrame,
        {
          left: contentWidth / 2 + centerX - frameWidth / 2,
          top: centerY - frameHeight / 2,
          width: frameWidth,
          height: frameHeight,
          marginLeft: 0,
          marginTop: 0,
          transform:
            enemy.kind === "asteroid"
              ? [{ scale: enemy.scale }, { rotate: asteroidSpin }]
              : [{ scale: enemy.scale }],
        },
      ]}
    >
      {enemy.kind === "asteroid" ? (
        <View style={styles.asteroidShell}>
          <View style={styles.asteroidFacetA} />
          <View style={styles.asteroidFacetB} />
          <View style={styles.asteroidFacetC} />
          <View style={styles.asteroidCraterLarge} />
          <View style={styles.asteroidCraterSmall} />
        </View>
      ) : (
        <>
          <View
            style={[
              styles.enemyGlow,
              enemy.kind === "boss"
                ? styles.enemyGlowBoss
                : styles.enemyGlowGrunt,
            ]}
          />
          <ExpoImage
            source={ENEMY_MODEL_IMAGE}
            contentFit="contain"
            style={styles.enemyShipImage}
          />
        </>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const [gameState, setGameState] = useState<GameState>("menu");
  const [menuPanel, setMenuPanel] = useState<MenuPanel>("main");
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [isSfxEnabled, setIsSfxEnabled] = useState(true);
  const [controlLayout, setControlLayout] = useState<ControlLayout>("classic");
  const [highScore, setHighScore] = useState(0);
  const [lastRunScore, setLastRunScore] = useState(0);
  const [shipOffset, setShipOffset] = useState(0);
  const [isBoosting, setIsBoosting] = useState(false);
  const [isFireHeld, setIsFireHeld] = useState(false);
  const [playAreaHeight, setPlayAreaHeight] = useState(0);
  const [scene, setScene] = useState<SceneState>({
    elapsedMs: 0,
    travel: 0,
    score: 0,
    playerHp: INITIAL_LIVES,
    playerShield: 0,
    stage: BOSS_STAGE,
    stageKills: 0,
    bossDefeated: false,
    bullets: [],
    enemies: [],
    explosions: [],
    lives: INITIAL_LIVES,
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
  const enemySpawnClockRef = useRef(0);
  const nextEnemySpawnMsRef = useRef(1200);
  const bossSpawnedRef = useRef(false);
  const isFireHeldRef = useRef(false);
  const pulseModeRef = useRef(false);
  const fireHoldStartAtRef = useRef(0);

  const firePlayer = useAudioPlayer(
    require("../../assets/sounds/Blaster1.wav"),
  );
  const pulsePlayer = useAudioPlayer(
    require("../../assets/sounds/Pulseattack.wav"),
  );
  const boostPlayer = useAudioPlayer(require("../../assets/sounds/Boost.wav"));
  const movePlayer = useAudioPlayer(require("../../assets/sounds/Move.wav"));
  const destroyPlayer = useAudioPlayer(
    require("../../assets/sounds/Destroy1.wav"),
  );
  const menuMusicPlayer = useAudioPlayer(
    require("../../assets/sounds/Mainmenusong.mp3"),
  );
  const stageMusicPlayer = useAudioPlayer(
    require("../../assets/sounds/Stage1song.mp3"),
  );

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
  const appVersion = Constants.expoConfig?.version ?? "0.1.9";

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
  }, [maxShipOffset]);

  useEffect(() => {
    firePlayer.volume = 0.55;
    pulsePlayer.volume = 0.45;
    boostPlayer.volume = 0.4;
    movePlayer.volume = 0.28;
    destroyPlayer.volume = 0.38;
    menuMusicPlayer.volume = 0.22;
    stageMusicPlayer.volume = 0.12;
    menuMusicPlayer.loop = true;
    stageMusicPlayer.loop = true;
  }, [
    boostPlayer,
    destroyPlayer,
    firePlayer,
    menuMusicPlayer,
    movePlayer,
    pulsePlayer,
    stageMusicPlayer,
  ]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
    }).catch(() => {});
  }, [destroyPlayer]);

  useEffect(() => {
    if (!isMusicEnabled) {
      void resetSoundSafely(menuMusicPlayer);
      void resetSoundSafely(stageMusicPlayer);
      return;
    }

    if (gameState === "menu") {
      void resetSoundSafely(stageMusicPlayer);
      void playSoundSafely(menuMusicPlayer, false);
      return;
    }

    void resetSoundSafely(menuMusicPlayer);
    void playSoundSafely(stageMusicPlayer, false);
  }, [gameState, isMusicEnabled, menuMusicPlayer, stageMusicPlayer]);

  useEffect(() => {
    if (!isSfxEnabled) {
      void resetSoundSafely(boostPlayer);
      void resetSoundSafely(movePlayer);
      void resetSoundSafely(firePlayer);
      void resetSoundSafely(pulsePlayer);
      void resetSoundSafely(destroyPlayer);
    }
  }, [
    boostPlayer,
    destroyPlayer,
    firePlayer,
    isSfxEnabled,
    movePlayer,
    pulsePlayer,
  ]);

  useEffect(() => {
    if (scene.score > highScore) {
      setHighScore(scene.score);
    }
  }, [highScore, scene.score]);

  useEffect(() => {
    let frameId = 0;
    let previousTime = 0;

    const animate = (time: number) => {
      if (!previousTime) {
        previousTime = time;
      }

      const deltaMs = Math.min(34, time - previousTime);
      previousTime = time;

      if (gameStateRef.current === "playing") {
        let shouldPlayDestroySound = false;
        let shouldPlayPulseSound = false;
        let shouldEnterStageClear = false;
        enemySpawnClockRef.current += deltaMs;

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
          const spawnedBullets: Bullet[] = [];
          const nextElapsedMs = currentScene.elapsedMs + deltaMs;
          let nextScore = currentScene.score || 0;
          let nextPlayerHp = currentScene.playerHp ?? INITIAL_LIVES;
          let nextPlayerShield = currentScene.playerShield || 0;
          let nextStageKills = currentScene.stageKills || 0;
          let bossDefeated = currentScene.bossDefeated || false;
          const bossSpawnThreshold =
            currentStage >= 2
              ? BOSS_SPAWN_KILL_THRESHOLD_STAGE_2
              : BOSS_SPAWN_KILL_THRESHOLD_STAGE_1;
          const bossAlreadyActive = currentScene.enemies.some(
            (enemy) => enemy.kind === "boss",
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

          const queueExplosion = (
            x: number,
            y: number,
            kind: EnemyKind,
          ) => {
            nextExplosions.push(
              createExplosion(explosionIdRef.current++, x, y, kind),
            );
          };

          const queuePlayerShot = (kind: BulletKind) => {
            const cooldown =
              kind === "pulse" ? PULSE_FIRE_COOLDOWN_MS : FIRE_COOLDOWN_MS;

            if (nextElapsedMs - lastFireAtRef.current < cooldown) {
              return false;
            }

            if (
              currentScene.bullets.length + spawnedBullets.length >=
              MAX_ACTIVE_BULLETS
            ) {
              return false;
            }

            const bulletHeight = getBulletHeight(kind);
            const currentShipLift = boostRef.current ? -16 : 0;
            const bulletStartY =
              activePlayAreaHeight -
              PLAY_AREA_BOTTOM_PADDING -
              SHIP_FRAME_HEIGHT +
              SHIP_MUZZLE_OFFSET +
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

            if (heldDuration >= PULSE_CHARGE_MS) {
              pulseModeRef.current = true;
            }

            if (pulseModeRef.current && queuePlayerShot("pulse")) {
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
              const maxHostiles = currentStage >= 2 ? 5 : 4;
              const spawnKind: EnemyKind =
                currentStage >= 2 && Math.random() < 0.38
                  ? "asteroid"
                  : "grunt";

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

            nextEnemySpawnMsRef.current =
              currentStage >= 2 ? 1650 + Math.random() * 800 : 1750 + Math.random() * 900;
          }

          for (const enemy of currentScene.enemies) {
            const advancedEnemy: Enemy = {
              ...enemy,
              x: enemy.x + enemy.drift * deltaMs,
              y: enemy.y + enemy.speed * deltaMs,
              fireClockMs: enemy.fireClockMs + deltaMs,
            };

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
            shouldPlayDestroySound = true;
            nextScore += getEnemyScore(enemy.kind);

            if (enemy.kind === "boss") {
              bossDefeated = true;
              shouldEnterStageClear = true;
              nextPlayerShield = clamp(
                nextPlayerShield + MAX_SHIELD_POINTS,
                0,
                MAX_SHIELD_POINTS,
              );
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

              const bulletHitX =
                Math.abs(nextBullet.x - candidate.centerX) <=
                candidate.halfWidth +
                  bulletWidth / 2 +
                  (bullet.kind === "pulse" ? 18 : 0);
              const bulletHitY =
                Math.abs(bulletCenterY - candidate.centerY) <=
                candidate.halfHeight +
                  bulletHeight / 2 +
                  (bullet.kind === "pulse" ? 10 : 0);

              if (bulletHitX && bulletHitY) {
                impactedCandidates.push(candidate);
                if (bullet.kind !== "pulse") {
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
              continue;
            }

            survivingEnemies.push(enemy);
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
              stage: currentStage,
              stageKills: nextStageKills,
              bossDefeated,
              bullets: [],
              enemies: [],
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
            stage: currentStage,
            stageKills: nextStageKills,
            bossDefeated,
            bullets: [...survivingBullets, ...spawnedBullets],
            enemies: survivingEnemies,
            explosions: nextExplosions,
            lives: nextPlayerHp,
          };
        });

        if (shouldPlayDestroySound) {
          void playSoundSafely(destroyPlayer);
        }

        if (shouldPlayPulseSound) {
          void playSoundSafely(pulsePlayer);
        }

      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [destroyPlayer, pulsePlayer]);

  useEffect(() => {
    if (gameState === "playing" && scene.playerHp <= 0) {
      setLastRunScore(scene.score);
      setGameState("gameOver");
      setIsBoosting(false);
      void resetSoundSafely(boostPlayer);
      void resetSoundSafely(pulsePlayer);
    }
  }, [boostPlayer, gameState, pulsePlayer, scene.playerHp, scene.score]);

  useEffect(() => {
    if (gameState === "playing" && scene.bossDefeated) {
      setLastRunScore(scene.score);
      setIsBoosting(false);
      setIsFireHeld(false);
      isFireHeldRef.current = false;
      pulseModeRef.current = false;
      fireHoldStartAtRef.current = 0;
      void resetSoundSafely(boostPlayer);
      setGameState("stageClear");
    }
  }, [boostPlayer, gameState, scene.bossDefeated, scene.score]);

  const playSoundSafely = async (
    player: ReturnType<typeof useAudioPlayer>,
    respectSfxSetting = true,
  ) => {
    if (respectSfxSetting && !isSfxEnabledRef.current) {
      return;
    }

    try {
      await player.seekTo(0);
      player.play();
    } catch {
      try {
        player.play();
      } catch {}
    }
  };

  const resetSoundSafely = async (
    player: ReturnType<typeof useAudioPlayer>,
  ) => {
    try {
      player.pause();
      await player.seekTo(0);
    } catch {}
  };

  const resetRunState = () => {
    setIsBoosting(false);
    setIsFireHeld(false);
    setShipOffset(0);
    lastMoveAtRef.current = 0;
    lastMoveDirectionRef.current = 0;
    lastMoveSoundAtRef.current = 0;
    lastFireAtRef.current = -FIRE_COOLDOWN_MS;
    bulletIdRef.current = 0;
    enemyIdRef.current = 0;
    explosionIdRef.current = 0;
    enemySpawnClockRef.current = 0;
    nextEnemySpawnMsRef.current = 1200;
    bossSpawnedRef.current = false;
    isFireHeldRef.current = false;
    pulseModeRef.current = false;
    fireHoldStartAtRef.current = 0;
    setScene({
      elapsedMs: 0,
      travel: 0,
      score: 0,
      playerHp: INITIAL_LIVES,
      playerShield: 0,
      stage: BOSS_STAGE,
      stageKills: 0,
      bossDefeated: false,
      bullets: [],
      enemies: [],
      explosions: [],
      lives: INITIAL_LIVES,
    });
  };

  const startGame = () => {
    resetRunState();
    setGameState("playing");
  };

  const continueToStageTwo = () => {
    if (gameState !== "stageClear" || scene.stage !== 1) {
      return;
    }

    setScene((currentScene) => ({
      ...currentScene,
      stage: 2,
      stageKills: 0,
      bossDefeated: false,
      bullets: [],
      enemies: [],
      explosions: [],
    }));
    enemySpawnClockRef.current = 0;
    nextEnemySpawnMsRef.current = 1100;
    bossSpawnedRef.current = false;
    isFireHeldRef.current = false;
    pulseModeRef.current = false;
    fireHoldStartAtRef.current = 0;
    setIsFireHeld(false);
    setGameState("playing");
  };

  const returnToMenuFromStageClear = () => {
    setLastRunScore(scene.score);
    setGameState("menu");
    setMenuPanel("main");
    resetRunState();
    void resetSoundSafely(boostPlayer);
  };

  const returnToMenu = () => {
    setLastRunScore(scene.score);
    setGameState("menu");
    setMenuPanel("main");
    resetRunState();
    void resetSoundSafely(boostPlayer);
  };

  const spawnPlayerShot = (kind: BulletKind) => {
    if (gameStateRef.current !== "playing") {
      return false;
    }

    const currentScene = sceneRef.current;
    const cooldown =
      kind === "pulse" ? PULSE_FIRE_COOLDOWN_MS : FIRE_COOLDOWN_MS;

    if (currentScene.elapsedMs - lastFireAtRef.current < cooldown) {
      return false;
    }

    if (currentScene.bullets.length >= MAX_ACTIVE_BULLETS) {
      return false;
    }

    const activePlayAreaHeight =
      playAreaHeightRef.current || Math.max(260, heightRef.current * 0.52);
    const currentShipLift = boostRef.current ? -16 : 0;
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
    if (gameStateRef.current !== "playing") {
      return;
    }

    let didMove = false;
    let direction: 0 | -1 | 1 = 0;

    setShipOffset((currentOffset) => {
      const nextOffset = clamp(targetOffset, -maxShipOffset, maxShipOffset);
      didMove = nextOffset !== currentOffset;
      direction =
        nextOffset === currentOffset ? 0 : nextOffset > currentOffset ? 1 : -1;
      return nextOffset;
    });

    if (
      didMove &&
      sceneRef.current.elapsedMs - lastMoveSoundAtRef.current >
        MOVE_SOUND_COOLDOWN_MS
    ) {
      lastMoveAtRef.current = sceneRef.current.elapsedMs;
      lastMoveDirectionRef.current = direction;
      lastMoveSoundAtRef.current = sceneRef.current.elapsedMs;
      void playSoundSafely(movePlayer);
    } else if (didMove) {
      lastMoveAtRef.current = sceneRef.current.elapsedMs;
      lastMoveDirectionRef.current = direction;
    }
  };

  const moveShip = (direction: -1 | 1) => {
    moveShipToOffset(shipOffsetRef.current + direction * SHIP_STEP);
  };

  const handleTouchMoveShip = (event: GestureResponderEvent) => {
    if (gameStateRef.current !== "playing") {
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

    if (spawnPlayerShot("standard")) {
      void playSoundSafely(firePlayer);
    }
  };

  const handleFirePressOut = () => {
    isFireHeldRef.current = false;
    pulseModeRef.current = false;
    fireHoldStartAtRef.current = 0;
    setIsFireHeld(false);
  };

  const handleBoostStart = () => {
    if (gameState !== "playing" || boostRef.current) {
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
  const shipBank = lastMoveDirectionRef.current * bankProgress * 9;
  const motionIntensity = isBoosting ? 1 : isManeuvering ? 0.45 : 0.14;
  const shipLift = isBoosting ? -16 : 0;
  const travelAmount = gameState === "playing" ? scene.travel : 0;
  const scoreDisplay = String(scene.score).padStart(4, "0");
  const highScoreDisplay = String(highScore).padStart(4, "0");
  const lastRunDisplay = String(lastRunScore).padStart(4, "0");

  return (
    <View style={styles.screen}>
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
        />
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
            />
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
        <View style={styles.menuScreen}>
          <View style={styles.menuDecorPlanetLarge} />
          <View style={styles.menuDecorPlanetRing} />
          <View style={styles.menuDecorPlanetSmall} />
          <View style={styles.menuDecorNebulaA} />
          <View style={styles.menuDecorNebulaB} />
          <View style={styles.menuDecorAsteroidA} />
          <View style={styles.menuDecorAsteroidB} />
          <View style={styles.menuDecorAsteroidC} />

          {menuPanel === "main" ? (
            <>
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
                  android_disableSound
                >
                  <Text style={styles.menuStartButtonText}>START GAME</Text>
                </Pressable>
                <Pressable
                  style={styles.menuSecondaryButton}
                  onPress={() => setMenuPanel("options")}
                  android_disableSound
                >
                  <Text style={styles.menuSecondaryButtonText}>OPTIONS</Text>
                </Pressable>
                <Pressable
                  style={styles.menuSecondaryButton}
                  onPress={() => setMenuPanel("hangar")}
                  android_disableSound
                >
                  <Text style={styles.menuSecondaryButtonText}>
                    SHIP HANGAR
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.menuSecondaryButton}
                  onPress={() => setMenuPanel("credits")}
                  android_disableSound
                >
                  <Text style={styles.menuSecondaryButtonText}>CREDITS</Text>
                </Pressable>
                <Pressable
                  style={styles.menuSecondaryButton}
                  onPress={() => setMenuPanel("records")}
                  android_disableSound
                >
                  <Text style={styles.menuSecondaryButtonText}>HIGH SCORE</Text>
                </Pressable>
              </View>

              <View style={styles.menuShipStage}>
                <HeroShip
                  bankAngle={-4}
                  isBoosting={false}
                  scale={1.08}
                  decorative
                />
              </View>
            </>
          ) : menuPanel === "options" ? (
            <View style={styles.menuPanel}>
              <Text style={styles.menuPanelTitle}>OPTIONS</Text>
              <Pressable
                style={styles.menuSecondaryButton}
                onPress={() => setIsMusicEnabled((current) => !current)}
                android_disableSound
              >
                <Text style={styles.menuSecondaryButtonText}>
                  MUSIC: {isMusicEnabled ? "ON" : "OFF"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.menuSecondaryButton}
                onPress={() => setIsSfxEnabled((current) => !current)}
                android_disableSound
              >
                <Text style={styles.menuSecondaryButtonText}>
                  SOUND EFFECTS: {isSfxEnabled ? "ON" : "OFF"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.menuSecondaryButton}
                onPress={toggleControlLayout}
                android_disableSound
              >
                <Text style={styles.menuSecondaryButtonText}>
                  CONTROL LAYOUT:{" "}
                  {controlLayout === "classic" ? "CLASSIC" : "SPLIT"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.menuBackButton}
                onPress={() => setMenuPanel("main")}
                android_disableSound
              >
                <Text style={styles.menuBackButtonText}>BACK</Text>
              </Pressable>
            </View>
          ) : menuPanel === "hangar" ? (
            <View style={styles.menuPanel}>
              <Text style={styles.menuPanelTitle}>SHIP HANGAR</Text>
              <Text style={styles.menuPanelBody}>COMING SOON</Text>
              <Pressable
                style={styles.menuBackButton}
                onPress={() => setMenuPanel("main")}
                android_disableSound
              >
                <Text style={styles.menuBackButtonText}>BACK</Text>
              </Pressable>
            </View>
          ) : menuPanel === "records" ? (
            <View style={styles.menuPanel}>
              <Text style={styles.menuPanelTitle}>HIGH SCORE</Text>
              <Text style={styles.menuPanelBody}>BEST RUN {highScoreDisplay}</Text>
              <Text style={styles.menuPanelBody}>LAST RUN {lastRunDisplay}</Text>
              <Pressable
                style={styles.menuBackButton}
                onPress={() => setMenuPanel("main")}
                android_disableSound
              >
                <Text style={styles.menuBackButtonText}>BACK</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.menuPanel}>
              <Text style={styles.menuPanelTitle}>CREDITS</Text>
              <ScrollView
                style={styles.creditsScroll}
                contentContainerStyle={styles.creditsScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.creditsBlockCard}>
                  <Text style={styles.creditsBlockText}>
                    {CREDITS_BLOCK_TEXT}
                  </Text>
                </View>
              </ScrollView>
              <Pressable
                style={styles.menuBackButton}
                onPress={() => setMenuPanel("main")}
                android_disableSound
              >
                <Text style={styles.menuBackButtonText}>BACK</Text>
              </Pressable>
            </View>
          )}
          <Text style={styles.versionFooter}>v{appVersion}</Text>
        </View>
      ) : (
        <>
          <View style={styles.hud}>
            <View style={styles.hudBlock}>
              <Text style={styles.hudText}>SCORE {scoreDisplay}</Text>
              <Text style={styles.hudSubtext}>HI {highScoreDisplay}</Text>
            </View>
            <View style={styles.hudBlockRight}>
              <Text style={styles.hudText}>STAGE {scene.stage}</Text>
              <Text style={styles.hudSubtext}>
                {scene.stage === 2 ? "ASTEROIDS LIVE" : "BOSS INBOUND"}
              </Text>
            </View>
          </View>

          <View style={styles.statusMeters}>
            <View style={styles.statusMeter}>
              <Text style={styles.statusMeterLabel}>HULL</Text>
              <View style={styles.statusBarRow}>
                {Array.from({ length: INITIAL_LIVES }, (_, index) => (
                  <View
                    key={`hp-${index}`}
                    style={[
                      styles.statusBar,
                      styles.healthBar,
                      index < scene.playerHp
                        ? styles.healthBarActive
                        : styles.statusBarEmpty,
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.statusMeter}>
              <Text style={styles.statusMeterLabel}>SHIELD</Text>
              <View style={styles.statusBarRow}>
                {Array.from({ length: MAX_SHIELD_POINTS }, (_, index) => (
                  <View
                    key={`shield-${index}`}
                    style={[
                      styles.statusBar,
                      styles.shieldBar,
                      index < scene.playerShield
                        ? styles.shieldBarActive
                        : styles.statusBarEmpty,
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.titleWrap}>
            <Text style={styles.title}>VOXIUM INVADERS</Text>
            <Text style={styles.subtitle}>
              {gameState === "gameOver" ? "SIGNAL LOST" : "FLIGHT VECTOR ENGAGED"}
            </Text>
          </View>

          <Pressable
            style={styles.menuReturnButton}
            onPress={returnToMenu}
            android_disableSound
          >
            <Text style={styles.menuReturnButtonText}>MENU</Text>
          </Pressable>

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
                />
              ))}
            </View>

            <View style={styles.bulletLayer} pointerEvents="none">
              {scene.bullets.map((bullet) => (
                <View
                  key={bullet.id}
                  style={[
                    styles.bulletShell,
                    bullet.kind === "pulse" && styles.pulseBulletShell,
                    {
                      left:
                        contentWidth / 2 +
                        bullet.x -
                        getBulletWidth(bullet.kind) / 2,
                      top: bullet.y,
                      width: getBulletWidth(bullet.kind),
                      height: getBulletHeight(bullet.kind),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.bulletCore,
                      bullet.kind === "pulse" && styles.pulseBulletCore,
                      {
                        height: getBulletHeight(bullet.kind) - 6,
                      },
                    ]}
                  />
                </View>
              ))}
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
              shipOffset={shipOffset}
              shipLift={shipLift}
            />

            {gameState === "gameOver" && (
              <View style={styles.gameOverOverlay}>
                <Text style={styles.gameOverTitle}>GAME OVER</Text>
                <Text style={styles.gameOverText}>
                  The invaders broke through your flight lane.
                </Text>
                <Pressable
                  style={styles.gameOverPrimaryButton}
                  onPress={startGame}
                  android_disableSound
                >
                  <Text style={styles.gameOverPrimaryButtonText}>RESTART</Text>
                </Pressable>
                <Pressable
                  style={styles.gameOverSecondaryButton}
                  onPress={returnToMenu}
                  android_disableSound
                >
                  <Text style={styles.gameOverSecondaryButtonText}>
                    MAIN MENU
                  </Text>
                </Pressable>
              </View>
            )}

            {gameState === "stageClear" && (
              <View style={styles.gameOverOverlay}>
                <Text style={styles.gameOverTitle}>
                  {scene.stage === 1 ? "STAGE 1 COMPLETE" : "STAGE 2 COMPLETE"}
                </Text>
                <Text style={styles.gameOverText}>
                  {scene.stage === 1
                    ? "The boss is down. Shields restored by 3. Continue to stage 2."
                    : "Stage 2 cleared. Return to the menu or restart the run."}
                </Text>
                {scene.stage === 1 ? (
                  <>
                    <Pressable
                      style={styles.gameOverPrimaryButton}
                      onPress={continueToStageTwo}
                      android_disableSound
                    >
                      <Text style={styles.gameOverPrimaryButtonText}>
                        CONTINUE TO STAGE 2
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.gameOverSecondaryButton}
                      onPress={returnToMenuFromStageClear}
                      android_disableSound
                    >
                      <Text style={styles.gameOverSecondaryButtonText}>
                        MAIN MENU
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      style={styles.gameOverPrimaryButton}
                      onPress={returnToMenuFromStageClear}
                      android_disableSound
                    >
                      <Text style={styles.gameOverPrimaryButtonText}>
                        MAIN MENU
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.gameOverSecondaryButton}
                      onPress={startGame}
                      android_disableSound
                    >
                      <Text style={styles.gameOverSecondaryButtonText}>
                        RESTART RUN
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}
          </View>

          {gameState === "playing" && (
            <View
              style={[
                styles.controlsDock,
                controlLayout === "split" && styles.controlsDockSplit,
              ]}
            >
              <Pressable
                style={[
                  styles.boostControl,
                  isBoosting && styles.boostControlActive,
                ]}
                onPressIn={handleBoostStart}
                onPressOut={handleBoostEnd}
                onPress={() => {}}
                android_disableSound
              >
                <Text style={styles.boostLabel}>BOOST</Text>
                <View style={styles.boostMeter}>
                  <View
                    style={[
                      styles.boostMeterFill,
                      isBoosting && styles.boostMeterFillActive,
                    ]}
                  />
                </View>
              </Pressable>

              <View
                style={[
                  styles.primaryControls,
                  controlLayout === "split" && styles.primaryControlsSplit,
                ]}
              >
                <Pressable
                  style={styles.button}
                  onPress={() => moveShip(-1)}
                  android_disableSound
                >
                  <Text style={styles.buttonText}>LEFT</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.fireButton,
                    isFireHeld && styles.fireButtonActive,
                  ]}
                  onPressIn={handleFirePressIn}
                  onPressOut={handleFirePressOut}
                  onPress={() => {}}
                  android_disableSound
                >
                  <Text style={styles.fireButtonText}>
                    {isFireHeld ? "PULSE" : "FIRE"}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.button}
                  onPress={() => moveShip(1)}
                  android_disableSound
                >
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
    backgroundColor: "#000000",
    paddingTop: SCREEN_TOP_PADDING,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingBottom: SCREEN_BOTTOM_PADDING,
    overflow: "hidden",
  },
  spaceLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
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
    paddingTop: 24,
    paddingBottom: 12,
  },
  menuHeader: {
    alignItems: "center",
    zIndex: 2,
  },
  menuEyebrow: {
    color: "#9ECFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 12,
  },
  menuTitle: {
    color: "#F2F7FF",
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 4,
    textAlign: "center",
    textShadowColor: "#5DC8FF",
    textShadowRadius: 10,
    lineHeight: 40,
  },
  menuBlurb: {
    color: "#C8D8EA",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 14,
    maxWidth: 260,
    lineHeight: 18,
  },
  menuActions: {
    width: "100%",
    gap: 10,
    zIndex: 2,
  },
  menuStartButton: {
    borderWidth: 2,
    borderColor: "#80F7B6",
    backgroundColor: "#142118",
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#80F7B6",
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  menuStartButtonText: {
    color: "#D9FFE9",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
  },
  menuSecondaryButton: {
    borderWidth: 2,
    borderColor: "#4E6480",
    backgroundColor: "#101622",
    paddingVertical: 14,
    alignItems: "center",
  },
  menuSecondaryButtonText: {
    color: "#DFE7F0",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  menuShipStage: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 12,
    zIndex: 2,
  },
  menuPanel: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
    gap: 12,
    zIndex: 2,
  },
  menuPanelTitle: {
    color: "#F0F7FF",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2.5,
    textAlign: "center",
    marginBottom: 8,
  },
  menuPanelBody: {
    color: "#C7D4E5",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  menuBackButton: {
    borderWidth: 2,
    borderColor: "#7D95B5",
    backgroundColor: "#141D2D",
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  menuBackButtonText: {
    color: "#EBF2FB",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  versionFooter: {
    position: "absolute",
    left: 2,
    bottom: 0,
    color: "#8FA5BF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
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
    borderRadius: 16,
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
  hud: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    zIndex: 2,
  },
  hudBlock: {
    gap: 3,
  },
  hudBlockRight: {
    gap: 3,
    alignItems: "flex-end",
  },
  hudText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  hudSubtext: {
    color: "#96BFEA",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.3,
  },
  statusMeters: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
    zIndex: 2,
  },
  statusMeter: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#2F4662",
    backgroundColor: "rgba(8, 14, 24, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusMeterLabel: {
    color: "#D4E6FB",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  statusBarRow: {
    flexDirection: "row",
    gap: 6,
  },
  statusBar: {
    flex: 1,
    height: 12,
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
    marginBottom: 18,
    zIndex: 2,
  },
  title: {
    color: "#F2F7FF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 2,
    textAlign: "center",
  },
  subtitle: {
    color: "#9FC7FF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 6,
  },
  menuReturnButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#89B8E7",
    backgroundColor: "#0C1421",
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
    zIndex: 2,
  },
  menuReturnButtonText: {
    color: "#DCE9F7",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  playArea: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: PLAY_AREA_BOTTOM_PADDING,
    zIndex: 2,
  },
  touchFlightZone: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: TOUCH_CONTROL_HEIGHT,
    zIndex: 1,
  },
  enemyLayer: {
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
    bottom: 4,
    width: ENEMY_FRAME_WIDTH,
    height: 16,
    borderRadius: 999,
    opacity: 0.55,
  },
  enemyGlowBoss: {
    backgroundColor: "#FFB86E",
    shadowColor: "#FFB86E",
    shadowOpacity: 0.95,
    shadowRadius: 18,
    elevation: 12,
  },
  enemyGlowGrunt: {
    backgroundColor: "#FF5C78",
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
    borderRadius: 28,
    backgroundColor: "#8D6C54",
    borderWidth: 3,
    borderColor: "#C8AA8C",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E3A671",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  asteroidFacetA: {
    position: "absolute",
    top: 10,
    left: 12,
    width: 24,
    height: 18,
    borderRadius: 10,
    backgroundColor: "#B98D6C",
    opacity: 0.75,
    transform: [{ rotate: "-16deg" }],
  },
  asteroidFacetB: {
    position: "absolute",
    right: 10,
    top: 20,
    width: 18,
    height: 14,
    borderRadius: 8,
    backgroundColor: "#6F533F",
    opacity: 0.8,
    transform: [{ rotate: "22deg" }],
  },
  asteroidFacetC: {
    position: "absolute",
    left: 18,
    bottom: 12,
    width: 22,
    height: 16,
    borderRadius: 10,
    backgroundColor: "#6B4C38",
    opacity: 0.7,
    transform: [{ rotate: "14deg" }],
  },
  asteroidCraterLarge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#5E4434",
    opacity: 0.7,
    transform: [{ translateX: 8 }, { translateY: 4 }],
  },
  asteroidCraterSmall: {
    position: "absolute",
    left: 18,
    top: 18,
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#4C372A",
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
  explosionLayer: {
    ...StyleSheet.absoluteFillObject,
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
  bulletCore: {
    width: 2,
    height: BULLET_HEIGHT - 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  pulseBulletCore: {
    width: 12,
    backgroundColor: "#EAF5FF",
    opacity: 0.92,
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
    bottom: 18,
    width: 132,
    height: 18,
    borderRadius: 999,
    backgroundColor: "rgba(8, 14, 24, 0.48)",
  },
  playerShipShadowDecorative: {
    opacity: 0.82,
  },
  playerShipSvgImage: {
    width: SHIP_FRAME_WIDTH - 18,
    height: SHIP_FRAME_HEIGHT - 4,
  },
  playerShipImage: {
    width: SHIP_FRAME_WIDTH - 18,
    height: SHIP_FRAME_HEIGHT - 4,
  },
  playerEngineGlowOuter: {
    position: "absolute",
    bottom: 18,
    width: 56,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#2FA4FF",
    shadowColor: "#38B2FF",
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 10,
  },
  playerEngineGlowInner: {
    position: "absolute",
    bottom: 24,
    width: 26,
    height: 20,
    borderRadius: 999,
    backgroundColor: "#D2F4FF",
    shadowColor: "#A2EDFF",
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 8,
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
    top: 84,
    left: -180,
    width: 760,
    height: 190,
    borderRadius: 999,
    backgroundColor: "rgba(126, 150, 248, 0.09)",
  },
  milkyWayBandEcho: {
    position: "absolute",
    top: 130,
    left: -210,
    width: 760,
    height: 140,
    borderRadius: 999,
    backgroundColor: "rgba(82, 110, 216, 0.05)",
  },
  milkyWayGlow: {
    position: "absolute",
    top: 130,
    left: -120,
    width: 680,
    height: 124,
    borderRadius: 999,
    backgroundColor: "rgba(206, 176, 255, 0.08)",
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
    borderRadius: 999,
    backgroundColor: "#253A73",
    opacity: 0.54,
  },
  distantPlanetGlow: {
    position: "absolute",
    top: 58,
    right: -40,
    width: 138,
    height: 138,
    borderRadius: 999,
    backgroundColor: "rgba(76, 105, 206, 0.08)",
  },
  distantMoon: {
    position: "absolute",
    top: 238,
    left: 14,
    width: 34,
    height: 34,
    borderRadius: 999,
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
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    zIndex: 3,
  },
  controlsDockSplit: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 10,
  },
  boostControl: {
    width: 86,
    minHeight: 92,
    borderWidth: 2,
    borderColor: "#70FFB8",
    backgroundColor: "#101A12",
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  boostControlActive: {
    backgroundColor: "#173025",
    shadowColor: "#70FFB8",
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 10,
  },
  boostLabel: {
    color: "#C8FFD6",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
  },
  boostMeter: {
    width: 18,
    height: 44,
    borderWidth: 2,
    borderColor: "#8CEAC1",
    backgroundColor: "#07120B",
    justifyContent: "flex-end",
    padding: 2,
  },
  boostMeterFill: {
    height: 10,
    backgroundColor: "#3F8D5F",
  },
  boostMeterFillActive: {
    height: 34,
    backgroundColor: "#8BFFD1",
  },
  primaryControls: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  primaryControlsSplit: {
    flex: 0,
  },
  button: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "#111111",
    paddingVertical: 15,
    alignItems: "center",
  },
  fireButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#8ED4FF",
    backgroundColor: "#0D1824",
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: "#61C8FF",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
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
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
