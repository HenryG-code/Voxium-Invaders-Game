import { Pressable, Text, View } from 'react-native';

import {
  BOSS_HP,
  type GameState,
  type SceneState,
} from '@/components/game/game-logic';

type GameStyles = Record<string, any>;

type GameHUDProps = {
  gameState: GameState;
  playerHpMax: number;
  playerShieldMax: number;
  scene: SceneState;
  highScoreDisplay: string;
  onTogglePause: () => void;
  onReturnToMenu: () => void;
  styles: GameStyles;
};

export function GameHUD({
  gameState,
  playerHpMax,
  playerShieldMax,
  scene,
  highScoreDisplay,
  onTogglePause,
  onReturnToMenu,
  styles,
}: GameHUDProps) {
  const bossEnemy = scene.enemies.find((enemy) => enemy.kind === 'boss') ?? null;
  const bossHealth = bossEnemy?.hp ?? 0;
  const bossHealthFlash = Math.min(1, (bossEnemy?.hitFlashMs ?? 0) / 180);

  return (
    <View style={styles.hudOverlay} pointerEvents="box-none">
      <View style={styles.hud}>
        <View style={styles.hudBlock}>
          <Text style={styles.hudText}>SCORE {String(scene.score).padStart(4, '0')}</Text>
          <Text style={styles.hudSubtext}>HI {highScoreDisplay}</Text>
        </View>
        <View style={styles.hudBlockRight}>
          <Text style={styles.hudText}>STAGE {scene.stage}</Text>
          <Text style={styles.hudSubtext}>
            {scene.stage === 2 ? 'ASTEROIDS LIVE' : 'BOSS INBOUND'}
          </Text>
        </View>
      </View>

      {bossEnemy ? (
        <View style={styles.bossMeterSection}>
          <View style={styles.bossMeterHeader}>
            <Text style={styles.bossMeterLabel}>BOSS CORE</Text>
            <Text style={styles.bossMeterValue}>
              {bossHealth}/{BOSS_HP}
            </Text>
          </View>
          <View style={styles.bossMeterTrack}>
            {Array.from({ length: BOSS_HP }, (_, index) => (
              <View
                key={`boss-${index}`}
                style={[
                  styles.bossMeterSegment,
                  index < bossHealth
                    ? styles.bossMeterSegmentActive
                    : styles.bossMeterSegmentEmpty,
                  index < bossHealth && bossHealthFlash > 0
                    ? {
                        shadowColor: '#FFCF7A',
                        shadowOpacity: bossHealthFlash * 0.85,
                        shadowRadius: 6,
                        elevation: 3,
                      }
                    : null,
                ]}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.statusMeters}>
        <View style={styles.statusMeter}>
          <Text style={styles.statusMeterLabel}>HULL</Text>
          <View style={styles.statusBarRow}>
            {Array.from({ length: playerHpMax }, (_, index) => (
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

        {playerShieldMax > 0 ? (
          <View style={styles.statusMeter}>
            <Text style={styles.statusMeterLabel}>SHIELD</Text>
            <View style={styles.statusBarRow}>
              {Array.from({ length: playerShieldMax }, (_, index) => (
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
        ) : null}
      </View>

      <View style={styles.titleWrap}>
        <Text style={styles.title}>VOXIUM INVADERS</Text>
        <Text style={styles.subtitle}>
          {gameState === 'gameOver' ? 'SIGNAL LOST' : 'FLIGHT VECTOR ENGAGED'}
        </Text>
      </View>

      <View style={styles.hudActions}>
        <Pressable
          style={styles.menuReturnButton}
          onPress={onTogglePause}
          android_disableSound
        >
          <Text style={styles.menuReturnButtonText}>
            {gameState === 'paused' ? 'RESUME' : 'PAUSE'}
          </Text>
        </Pressable>
        <Pressable
          style={styles.menuReturnButton}
          onPress={onReturnToMenu}
          android_disableSound
        >
          <Text style={styles.menuReturnButtonText}>MENU</Text>
        </Pressable>
      </View>
    </View>
  );
}
