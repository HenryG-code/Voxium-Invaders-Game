import { Image as ExpoImage } from 'expo-image';
import { View } from 'react-native';

import {
  type AlienInvaderProps,
  type HeroShipProps,
  getEnemyCenterX,
  getEnemyCenterY,
  getEnemyFrameHeight,
  getEnemyFrameWidth,
  getEnemyModelImage,
  getShipModelImage,
} from '@/components/game/game-logic';

type GameActorStyles = Record<string, any>;

export function HeroShip({
  bankAngle,
  isBoosting,
  shipOffset = 0,
  shipLift = 0,
  scale = 1,
  decorative = false,
  damageFlashMs = 0,
  modelKey = 'Warden',
  styles,
}: HeroShipProps & { styles: GameActorStyles }) {
  const accelerationScale = isBoosting ? 1.02 : 1;
  const modelScale = decorative ? 1.04 : 1;
  const damageFlashOpacity = Math.min(1, damageFlashMs / 220);

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
      {damageFlashOpacity > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.playerShipDamageFlash,
            {
              opacity: damageFlashOpacity,
            },
          ]}
        />
      ) : null}
      <ExpoImage
        source={getShipModelImage(modelKey)}
        contentFit="contain"
        style={styles.playerShipSvgImage}
      />
    </View>
  );
}

export function AlienInvader({
  enemy,
  elapsedMs,
  contentWidth,
  styles,
}: AlienInvaderProps & { styles: GameActorStyles }) {
  const centerX = getEnemyCenterX(enemy, elapsedMs);
  const centerY = getEnemyCenterY(enemy, elapsedMs);
  const frameWidth = getEnemyFrameWidth(enemy.kind);
  const frameHeight = getEnemyFrameHeight(enemy.kind);
  const asteroidSpin = `${(elapsedMs / 16 + enemy.wobblePhase * 28) % 360}deg`;
  const hitFlashOpacity = Math.min(1, (enemy.hitFlashMs ?? 0) / 180);

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
            enemy.kind === 'asteroid'
              ? [{ scale: enemy.scale }, { rotate: asteroidSpin }]
              : [{ scale: enemy.scale }],
        },
      ]}
    >
      {hitFlashOpacity > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.enemyHitFlash,
            {
              opacity: hitFlashOpacity,
              backgroundColor:
                enemy.kind === 'boss'
                  ? 'rgba(255, 201, 108, 0.42)'
                  : enemy.kind === 'asteroid'
                    ? 'rgba(255, 248, 232, 0.36)'
                    : 'rgba(255, 255, 255, 0.34)',
            },
          ]}
        />
      ) : null}

      {enemy.kind === 'asteroid' ? (
        <ExpoImage
          source={getEnemyModelImage(enemy.modelVariant)}
          contentFit="contain"
          style={[
            styles.enemyShipImage,
            {
              width: frameWidth,
              height: frameHeight,
              transform: [{ rotate: asteroidSpin }],
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.enemyGlow,
            enemy.kind === 'boss'
              ? styles.enemyGlowBoss
              : styles.enemyGlowGrunt,
          ]}
        >
          <ExpoImage
            source={getEnemyModelImage(enemy.modelVariant)}
            contentFit="contain"
            style={styles.enemyShipImage}
          />
        </View>
      )}
    </View>
  );
}
