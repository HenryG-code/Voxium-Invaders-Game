import { ImageSourcePropType } from 'react-native';

export const SCREEN_HORIZONTAL_PADDING = 18;
export const SCREEN_TOP_PADDING = 56;
export const SCREEN_BOTTOM_PADDING = 24;

export const SHIP_STEP = 24;
export const SHIP_FRAME_WIDTH = 138;
export const SHIP_FRAME_HEIGHT = 138;
export const SHIP_BOUNDING_WIDTH = 104;
export const SHIP_MUZZLE_OFFSET = 12;
export const SHIP_PIXEL_SIZE = 4;
const WARDEN_SHIP_IMAGE = require('../../assets/images/Warden.png') as ImageSourcePropType;
const RAPTOR_SHIP_IMAGE = require('../../assets/images/Raptor.png') as ImageSourcePropType;
const VIPER_SHIP_IMAGE = require('../../assets/images/Viper.png') as ImageSourcePropType;
const TEMPEST_SHIP_IMAGE = require('../../assets/images/Tempest.png') as ImageSourcePropType;
const HELIOS_SHIP_IMAGE = require('../../assets/images/Helios.png') as ImageSourcePropType;
const BASTION_SHIP_IMAGE = require('../../assets/images/Bastion.png') as ImageSourcePropType;
const ATLAS_SHIP_IMAGE = require('../../assets/images/Atlas.png') as ImageSourcePropType;
const NOVA_SHIP_IMAGE = require('../../assets/images/Nova.png') as ImageSourcePropType;
const BOSS_STAGE_TWO_MODEL_IMAGE = require('../../assets/images/Boss2.png') as ImageSourcePropType;
export const PLAYER_SHIP_IMAGE = WARDEN_SHIP_IMAGE;
export const ENEMY_MODEL_IMAGE = require('../../assets/images/Enemy1.png') as ImageSourcePropType;
export const ENEMY_STAGE_TWO_MODEL_IMAGE = require('../../assets/images/Enemy2.png') as ImageSourcePropType;
export const PLAY_AREA_PADDING = 22;
export const PLAY_AREA_BOTTOM_PADDING = 18;

export const BOSS_STAGE = 1;
export const BOSS_HP = 18;

export const FAR_STAR_COUNT = 36;
export const MID_STAR_COUNT = 32;
export const NEAR_STAR_COUNT = 28;
export const FOREGROUND_STREAK_COUNT = 6;
export const SPEED_LINE_COUNT = 6;

export const NORMAL_TRAVEL_PER_MS = 0.00018;
export const BOOST_TRAVEL_PER_MS = 0.00038;
export const BULLET_SPEED_PX_PER_MS = 0.92;
export const MOVE_SOUND_COOLDOWN_MS = 140;
export const FIRE_COOLDOWN_MS = 130;
export const PULSE_FIRE_COOLDOWN_MS = 250;
export const PULSE_CHARGE_MS = 320;
export const MAX_ACTIVE_BULLETS = 20;
export const COLLISION_BIN_WIDTH = 64;
export const BULLET_WIDTH = 6;
export const BULLET_HEIGHT = 24;
export const PULSE_BULLET_WIDTH = 48;
export const PULSE_BULLET_HEIGHT = 38;
export const PULSE_BULLET_SPEED_PX_PER_MS = 0.8;
export const MISSILE_BULLET_WIDTH = 10;
export const MISSILE_BULLET_HEIGHT = 24;
export const NEEDLE_BULLET_WIDTH = 4;
export const NEEDLE_BULLET_HEIGHT = 30;
export const ELECTRIC_ORB_BULLET_WIDTH = 18;
export const ELECTRIC_ORB_BULLET_HEIGHT = 18;
export const BEAM_BULLET_WIDTH = 18;
export const BEAM_BULLET_HEIGHT = 132;
export const PLASMA_PELLET_BULLET_WIDTH = 12;
export const PLASMA_PELLET_BULLET_HEIGHT = 12;
export const SEEKER_POD_BULLET_WIDTH = 16;
export const SEEKER_POD_BULLET_HEIGHT = 22;
export const NOVA_PULSE_BULLET_WIDTH = 8;
export const NOVA_PULSE_BULLET_HEIGHT = 28;
export const ENEMY_FRAME_WIDTH = 126;
export const ENEMY_FRAME_HEIGHT = 69;
export const ASTEROID_FRAME_SIZE = 84;
export const TOUCH_CONTROL_HEIGHT = 120;
export const SHIP_COLLISION_HEIGHT = 30;
export const MAX_SHIELD_POINTS = 3;
export const EXPLOSION_DURATION_MS = 420;
export const INITIAL_LIVES = 5;
export const BOSS_SPAWN_KILL_THRESHOLD_STAGE_1 = 10;
export const BOSS_SPAWN_KILL_THRESHOLD_STAGE_2 = 14;

export type GameState = 'menu' | 'playing' | 'paused' | 'stageClear' | 'gameOver';
export type StarLayer = 'far' | 'mid' | 'near';
export type MenuPanel = 'main' | 'options' | 'hangar' | 'credits' | 'records';
export type ControlLayout = 'classic' | 'split';
export type EnemyKind = 'grunt' | 'boss' | 'asteroid';
export type BulletKind =
  | 'standard'
  | 'pulse'
  | 'missile'
  | 'needle'
  | 'electricOrb'
  | 'beam'
  | 'plasmaPellet'
  | 'seekerPod'
  | 'novaPulse';
export type EnemyVisualVariant = 'enemy1' | 'enemy2' | 'boss2';

export type FlightStar = {
  id: number;
  baseX: number;
  size: number;
  opacity: number;
  speed: number;
  phaseOffset: number;
  layer: StarLayer;
};

export type ForegroundStreak = {
  id: number;
  baseX: number;
  speed: number;
  length: number;
  phaseOffset: number;
};

export type Bullet = {
  id: number;
  x: number;
  y: number;
  kind: BulletKind;
  vx?: number;
  damage?: number;
  ageMs?: number;
  maxAgeMs?: number;
  pierce?: number;
};

export type Enemy = {
  id: number;
  x: number;
  y: number;
  speed: number;
  drift: number;
  scale: number;
  wobblePhase: number;
  kind: EnemyKind;
  modelVariant: EnemyVisualVariant;
  hp: number;
  fireClockMs: number;
  fireCooldownMs: number;
  hitFlashMs: number;
};

export type Explosion = {
  id: number;
  x: number;
  y: number;
  size: number;
  ageMs: number;
  maxAgeMs: number;
  color: string;
};

export type BossLaser = {
  id: number;
  x: number;
  y: number;
  telegraphMs: number;
  activeMs: number;
  maxTelegraphMs: number;
  maxActiveMs: number;
  width: number;
  hasHitPlayer: boolean;
};

export type SceneState = {
  elapsedMs: number;
  travel: number;
  score: number;
  playerHp: number;
  playerShield: number;
  playerDamageFlashMs: number;
  stage: number;
  stageKills: number;
  bossDefeated: boolean;
  bullets: Bullet[];
  enemies: Enemy[];
  bossLasers: BossLaser[];
  explosions: Explosion[];
  lives: number;
};

export type HeroShipProps = {
  bankAngle: number;
  isBoosting: boolean;
  shipOffset?: number;
  shipLift?: number;
  scale?: number;
  decorative?: boolean;
  damageFlashMs?: number;
  modelKey?: string;
};

export type AlienInvaderProps = {
  enemy: Enemy;
  elapsedMs: number;
  contentWidth: number;
};

export type EnemyCollisionCandidate = {
  enemy: Enemy;
  centerX: number;
  centerY: number;
  halfWidth: number;
  halfHeight: number;
};

export const CREDITS_BLOCK_TEXT = `=== VOXIUM INVADERS ===

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
  switch (kind) {
    case 'pulse':
      return PULSE_BULLET_WIDTH;
    case 'missile':
      return MISSILE_BULLET_WIDTH;
    case 'needle':
      return NEEDLE_BULLET_WIDTH;
    case 'electricOrb':
      return ELECTRIC_ORB_BULLET_WIDTH;
    case 'beam':
      return BEAM_BULLET_WIDTH;
    case 'plasmaPellet':
      return PLASMA_PELLET_BULLET_WIDTH;
    case 'seekerPod':
      return SEEKER_POD_BULLET_WIDTH;
    case 'novaPulse':
      return NOVA_PULSE_BULLET_WIDTH;
    case 'standard':
    default:
      return BULLET_WIDTH;
  }
}

function getBulletHeight(kind: BulletKind) {
  switch (kind) {
    case 'pulse':
      return PULSE_BULLET_HEIGHT;
    case 'missile':
      return MISSILE_BULLET_HEIGHT;
    case 'needle':
      return NEEDLE_BULLET_HEIGHT;
    case 'electricOrb':
      return ELECTRIC_ORB_BULLET_HEIGHT;
    case 'beam':
      return BEAM_BULLET_HEIGHT;
    case 'plasmaPellet':
      return PLASMA_PELLET_BULLET_HEIGHT;
    case 'seekerPod':
      return SEEKER_POD_BULLET_HEIGHT;
    case 'novaPulse':
      return NOVA_PULSE_BULLET_HEIGHT;
    case 'standard':
    default:
      return BULLET_HEIGHT;
  }
}

function getBulletSpeed(kind: BulletKind) {
  switch (kind) {
    case 'pulse':
      return PULSE_BULLET_SPEED_PX_PER_MS;
    case 'missile':
      return 0.62;
    case 'needle':
      return 1.28;
    case 'electricOrb':
      return 0.72;
    case 'beam':
      return 1.18;
    case 'plasmaPellet':
      return 0.8;
    case 'seekerPod':
      return 0.56;
    case 'novaPulse':
      return 1.04;
    case 'standard':
    default:
      return BULLET_SPEED_PX_PER_MS;
  }
}

function getBulletDamage(kind: BulletKind) {
  switch (kind) {
    case 'pulse':
      return 2;
    case 'missile':
      return 1.35;
    case 'needle':
      return 0.85;
    case 'electricOrb':
      return 1.15;
    case 'beam':
      return 0.7;
    case 'plasmaPellet':
      return 0.6;
    case 'seekerPod':
      return 1.4;
    case 'novaPulse':
      return 1.05;
    case 'standard':
    default:
      return 1;
  }
}

function getEnemyFrameWidth(kind: EnemyKind) {
  return kind === 'asteroid' ? ASTEROID_FRAME_SIZE : ENEMY_FRAME_WIDTH;
}

function getEnemyFrameHeight(kind: EnemyKind) {
  return kind === 'asteroid' ? ASTEROID_FRAME_SIZE : ENEMY_FRAME_HEIGHT;
}

function getEnemyScore(kind: EnemyKind) {
  if (kind === 'boss') {
    return 1000;
  }

  return kind === 'asteroid' ? 150 : 100;
}

function getEnemyDamage(kind: EnemyKind) {
  if (kind === 'boss') {
    return 2;
  }

  return 1;
}

function getEnemyModelImage(variant: EnemyVisualVariant) {
  if (variant === 'enemy2') {
    return ENEMY_STAGE_TWO_MODEL_IMAGE;
  }

  if (variant === 'boss2') {
    return BOSS_STAGE_TWO_MODEL_IMAGE;
  }

  return ENEMY_MODEL_IMAGE;
}

function getShipModelImage(modelKey?: string) {
  switch (modelKey) {
    case 'Raptor':
      return RAPTOR_SHIP_IMAGE;
    case 'Viper':
      return VIPER_SHIP_IMAGE;
    case 'Tempest':
      return TEMPEST_SHIP_IMAGE;
    case 'Helios':
      return HELIOS_SHIP_IMAGE;
    case 'Bastion':
      return BASTION_SHIP_IMAGE;
    case 'Atlas':
      return ATLAS_SHIP_IMAGE;
    case 'Nova':
      return NOVA_SHIP_IMAGE;
    case 'Warden':
    default:
      return WARDEN_SHIP_IMAGE;
  }
}

function createExplosion(
  id: number,
  x: number,
  y: number,
  kind: EnemyKind,
): Explosion {
  if (kind === 'boss') {
    return {
      id,
      x,
      y,
      size: 116,
      ageMs: 0,
      maxAgeMs: EXPLOSION_DURATION_MS + 160,
      color: '#FFE184',
    };
  }

  if (kind === 'asteroid') {
    return {
      id,
      x,
      y,
      size: 68,
      ageMs: 0,
      maxAgeMs: EXPLOSION_DURATION_MS,
      color: '#F4B979',
    };
  }

  return {
    id,
    x,
    y,
    size: 54,
    ageMs: 0,
    maxAgeMs: EXPLOSION_DURATION_MS,
    color: '#7BE7FF',
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
  kind: EnemyKind = 'grunt',
  stage = 1,
): Enemy {
  const maxSpawnOffset = Math.max(40, contentWidth / 2 - 42);

  return {
    id,
    kind,
    x:
      kind === 'boss'
        ? 0
        : kind === 'asteroid'
          ? (Math.random() * 2 - 1) * (maxSpawnOffset * 1.1)
          : (Math.random() * 2 - 1) * maxSpawnOffset,
    y:
      kind === 'boss'
        ? stage >= 2
          ? 164
          : 176
        : kind === 'asteroid'
          ? 8
          : 10,
    speed:
      kind === 'boss'
        ? 0.012
        : kind === 'asteroid'
          ? 0.062 + Math.random() * 0.04
          : 0.048 + Math.random() * 0.05,
    drift:
      kind === 'boss'
        ? 0
        : kind === 'asteroid'
          ? (Math.random() * 2 - 1) * 0.022
          : (Math.random() * 2 - 1) * 0.012,
    scale:
      kind === 'boss'
        ? (stage >= 2 ? 1.72 : 1.62)
        : kind === 'asteroid'
          ? 0.82 + Math.random() * 0.4
          : 0.9 + Math.random() * 0.28,
    wobblePhase: Math.random() * Math.PI * 2,
    modelVariant:
      kind === 'boss'
        ? stage >= 2
          ? 'boss2'
          : 'enemy1'
        : kind === 'grunt' && stage >= 2
          ? 'enemy2'
          : 'enemy1',
    hp: kind === 'boss' ? BOSS_HP : stage >= 2 ? 2 : kind === 'asteroid' ? 2 : 1,
    fireClockMs: Math.random() * 800,
    fireCooldownMs:
      kind === 'boss'
        ? 1400
        : stage >= 2
          ? 1900 + Math.random() * 800
          : 2600 + Math.random() * 1100,
    hitFlashMs: 0,
  };
}

function getEnemyCenterX(enemy: Enemy, elapsedMs: number) {
  const wobble =
    enemy.kind === 'boss' ? 10 : enemy.kind === 'asteroid' ? 2 : 4;
  return enemy.x + Math.sin(elapsedMs / 420 + enemy.wobblePhase) * wobble;
}

function getEnemyCenterY(enemy: Enemy, elapsedMs: number) {
  const sway =
    enemy.kind === 'boss' ? 5 : enemy.kind === 'asteroid' ? 1.5 : 3;
  return enemy.y + Math.cos(elapsedMs / 560 + enemy.wobblePhase * 0.8) * sway;
}

export {
  clamp,
  getBulletWidth,
  getBulletHeight,
  getBulletSpeed,
  getBulletDamage,
  getEnemyFrameWidth,
  getEnemyFrameHeight,
  getEnemyScore,
  getEnemyDamage,
  getEnemyModelImage,
  getShipModelImage,
  createExplosion,
  applyPlayerDamage,
  spreadFromCenter,
  createStars,
  createForegroundStreaks,
  createEnemy,
  getEnemyCenterX,
  getEnemyCenterY,
};
