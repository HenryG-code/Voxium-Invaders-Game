import {
  getEnemyCenterY,
  getEnemyFrameHeight,
  type BossLaser,
  type Enemy,
  type EnemyKind,
} from '@/components/game/game-logic';

export function createBossLaser(
  id: number,
  x: number,
  y: number,
): BossLaser {
  return {
    id,
    x,
    y,
    telegraphMs: 0,
    activeMs: 0,
    maxTelegraphMs: 340,
    maxActiveMs: 520,
    width: 68,
    hasHitPlayer: false,
  };
}

export function advanceBossLasers(
  bossLasers: BossLaser[],
  deltaMs: number,
): BossLaser[] {
  return bossLasers
    .map((laser) => {
      if (laser.telegraphMs < laser.maxTelegraphMs) {
        return {
          ...laser,
          telegraphMs: Math.min(laser.maxTelegraphMs, laser.telegraphMs + deltaMs),
        };
      }

      return {
        ...laser,
        activeMs: laser.activeMs + deltaMs,
      };
    })
    .filter((laser) => laser.activeMs < laser.maxActiveMs);
}

export function shouldLaunchBossLaser(
  enemy: Enemy,
  stage: number,
  fireClockMs: number,
): boolean {
  return enemy.kind === 'boss' && stage === 1 && fireClockMs >= enemy.fireCooldownMs;
}

export function getBossLaserOriginY(enemy: Enemy, elapsedMs: number) {
  const bossCenterY = getEnemyCenterY(enemy, elapsedMs);
  const bossFrameHeight = getEnemyFrameHeight(enemy.kind) * enemy.scale;

  return bossCenterY + bossFrameHeight * 0.28;
}

export function doesBossLaserHitShip(
  laser: BossLaser,
  shipOffset: number,
  shipCenterY: number,
  shipBoundingWidth: number,
): boolean {
  if (laser.telegraphMs < laser.maxTelegraphMs || laser.hasHitPlayer) {
    return false;
  }

  const shipInsideLaser =
    Math.abs(shipOffset - laser.x) <= shipBoundingWidth / 2 + laser.width / 2 - 2;
  const laserCoversShipY = shipCenterY >= laser.y;

  return shipInsideLaser && laserCoversShipY;
}

export function getStageEnemySpawnKind(stage: number): EnemyKind {
  return stage >= 2 && Math.random() < 0.38 ? 'asteroid' : 'grunt';
}

export function getStageMaxHostiles(stage: number) {
  return stage >= 2 ? 5 : 4;
}

export function getBossLaserSpawnConfig() {
  return {
    maxTelegraphMs: 340,
    maxActiveMs: 520,
    width: 68,
  };
}
