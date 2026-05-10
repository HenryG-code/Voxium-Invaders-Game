import type { EnemyKind } from '@/components/game/game-logic';

export function getBossSpawnThreshold(stage: number) {
  if (stage >= 3) {
    return 0;
  }

  return stage >= 2 ? 14 : 10;
}

export function getNextEnemySpawnDelay(stage: number) {
  return stage >= 2
    ? 1650 + Math.random() * 800
    : 1750 + Math.random() * 900;
}

export function getMaxHostiles(stage: number) {
  return stage >= 2 ? 5 : 4;
}

export function getStageSpawnKind(stage: number): EnemyKind {
  return stage >= 2 && Math.random() < 0.38 ? 'asteroid' : 'grunt';
}

export function getStageHudSubtitle(stage: number) {
  if (stage >= 3) {
    return 'FINAL BOSS';
  }

  return stage === 2 ? 'ASTEROIDS LIVE' : 'BOSS INBOUND';
}

export function getStageClearTitle(stage: number) {
  if (stage >= 3) {
    return 'FINAL STAGE COMPLETE';
  }

  return stage === 2 ? 'STAGE 2 COMPLETE' : 'STAGE 1 COMPLETE';
}

export function getStageClearMessage(stage: number) {
  if (stage >= 3) {
    return 'Boss 3 is down. The invasion line is broken. Return to the menu or start over.';
  }

  return stage === 1
    ? 'The boss is down. Shields restored by 3. Continue to stage 2.'
    : 'Stage 2 cleared. Continue to stage 3 or return to the menu.';
}

export function getStageClearPrimaryLabel(stage: number) {
  if (stage >= 3) {
    return 'MAIN MENU';
  }

  return stage === 1 ? 'CONTINUE TO STAGE 2' : 'CONTINUE TO STAGE 3';
}

export function getStageClearSecondaryLabel(stage: number) {
  return stage >= 3 ? 'RESTART RUN' : 'MAIN MENU';
}
