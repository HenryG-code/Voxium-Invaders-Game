import { Image as ExpoImage } from 'expo-image';
import { View } from 'react-native';

import { PLAYER_SHIP_IMAGE, type AlienInvaderProps, type HeroShipProps, getEnemyCenterX, getEnemyCenterY, getEnemyFrameHeight, getEnemyFrameWidth, getEnemyModelImage } from '@/components/game/game-logic';

type GameActorStyles = Record<string, any>;

export function HeroShip({
  bankAngle,
  isBoosting,
  shipOffset = 0,
  shipLift = 0,
  scale = 1,
  decorative = false,
  styles,
}: HeroShipProps & { styles: GameActorStyles }) {
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
      {enemy.kind === 'asteroid' ? (
        <View style={styles.asteroidShell}>
          <View style={styles.asteroidShadow} />
          <View style={styles.asteroidHighlight} />
          <View style={styles.asteroidRidge} />
          <View style={styles.asteroidFacetA} />
          <View style={styles.asteroidFacetB} />
          <View style={styles.asteroidFacetC} />
          <View style={styles.asteroidCraterLarge} />
          <View style={styles.asteroidCraterMedium} />
          <View style={styles.asteroidCraterSmall} />
        </View>
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
