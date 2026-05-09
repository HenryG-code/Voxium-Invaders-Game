import type { EnemyKind } from '@/components/game/game-logic';

export function getBossSpawnThreshold(stage: number) {
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
  return stage === 2 ? 'ASTEROIDS LIVE' : 'BOSS INBOUND';
}

export function getStageClearTitle(stage: number) {
  return stage === 1 ? 'STAGE 1 COMPLETE' : 'STAGE 2 COMPLETE';
}

export function getStageClearMessage(stage: number) {
  return stage === 1
    ? 'The boss is down. Shields restored by 3. Continue to stage 2.'
    : 'Stage 2 cleared. Return to the menu or restart the run.';
}

export function getStageClearPrimaryLabel(stage: number) {
  return stage === 1 ? 'CONTINUE TO STAGE 2' : 'MAIN MENU';
}

export function getStageClearSecondaryLabel(stage: number) {
  return stage === 1 ? 'MAIN MENU' : 'RESTART RUN';
}
