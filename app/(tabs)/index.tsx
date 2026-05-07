import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const SHIP_STEP = 24;
const SHIP_WIDTH = 54;
const PLAY_AREA_PADDING = 18;

const FAR_STAR_COUNT = 18;
const MID_STAR_COUNT = 16;
const NEAR_STAR_COUNT = 14;
const FOREGROUND_STREAK_COUNT = 6;
const SPEED_LINE_COUNT = 6;

const NORMAL_TRAVEL_PER_MS = 0.00018;
const BOOST_TRAVEL_PER_MS = 0.00038;

type StarLayer = 'far' | 'mid' | 'near';

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

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const [shipOffset, setShipOffset] = useState(0);
  const [isBoosting, setIsBoosting] = useState(false);
  const [animation, setAnimation] = useState({ elapsedMs: 0, travel: 0 });

  const boostRef = useRef(isBoosting);
  const lastMoveAtRef = useRef(0);

  const firePlayer = useAudioPlayer(require('../../assets/sounds/random.wav'));

  const maxShipOffset = Math.max(0, width / 2 - SHIP_WIDTH / 2 - PLAY_AREA_PADDING);

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
    setShipOffset((currentOffset) =>
      Math.max(-maxShipOffset, Math.min(maxShipOffset, currentOffset))
    );
  }, [maxShipOffset]);

  useEffect(() => {
    firePlayer.volume = 0.55;
  }, [firePlayer]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    });
  }, []);

  useEffect(() => {
    let frameId = 0;
    let previousTime = 0;

    const animate = (time: number) => {
      if (!previousTime) {
        previousTime = time;
      }

      const deltaMs = Math.min(34, time - previousTime);
      previousTime = time;

      setAnimation((currentAnimation) => ({
        elapsedMs: currentAnimation.elapsedMs + deltaMs,
        travel:
          currentAnimation.travel +
          deltaMs * (boostRef.current ? BOOST_TRAVEL_PER_MS : NORMAL_TRAVEL_PER_MS),
      }));

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, []);

  const moveShip = (direction: -1 | 1) => {
    lastMoveAtRef.current = animation.elapsedMs;

    setShipOffset((currentOffset) => {
      const nextOffset = currentOffset + direction * SHIP_STEP;
      return Math.max(-maxShipOffset, Math.min(maxShipOffset, nextOffset));
    });
  };

  const handleFire = async () => {
    try {
      await firePlayer.seekTo(0);
      firePlayer.play();
    } catch {
      firePlayer.play();
    }
  };

  const isManeuvering = animation.elapsedMs - lastMoveAtRef.current < 180;
  const motionIntensity = isBoosting ? 1 : isManeuvering ? 0.45 : 0.14;
  const shipLift = isBoosting ? -12 : 0;
  const engineGlowOpacity = isBoosting ? 1 : 0.6;
  const engineGlowScale = isBoosting ? 1.35 : 1;

  return (
    <View style={styles.screen}>
      <View style={styles.spaceLayer} pointerEvents="none">
        {stars.map((star) => {
          const progress = (animation.travel * star.speed + star.phaseOffset) % 1;
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

        {foregroundStreaks.map((streak) => {
          const progress = (animation.travel * streak.speed + streak.phaseOffset) % 1;

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

        {Array.from({ length: SPEED_LINE_COUNT }, (_, index) => {
          const lineOffset = index - (SPEED_LINE_COUNT - 1) / 2;
          const lineHeight = 54 + index * 16;
          const sway = Math.sin(animation.elapsedMs / 140 + index) * 8;

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

      <View style={styles.hud}>
        <Text style={styles.hudText}>SCORE 0000</Text>
        <Text style={styles.hudText}>LIVES 3</Text>
      </View>

      <View style={styles.titleWrap}>
        <Text style={styles.title}>VOXIUM INVADERS</Text>
        <Text style={styles.subtitle}>FLIGHT VECTOR ENGAGED</Text>
      </View>

      <View style={styles.playArea}>
        <View
          style={[
            styles.shipWrap,
            {
              transform: [{ translateX: shipOffset }, { translateY: shipLift }],
            },
          ]}>
          <Text style={styles.shipWing}>/</Text>

          <View style={styles.shipBody}>
            <View style={styles.shipCockpit} />
            <Text style={styles.shipCore}>A</Text>
            <View
              style={[
                styles.engineGlow,
                {
                  opacity: engineGlowOpacity,
                  transform: [{ scaleX: engineGlowScale }, { scaleY: engineGlowScale }],
                },
              ]}
            />
          </View>

          <Text style={styles.shipWing}>{'\\'}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.button} onPress={() => moveShip(-1)}>
          <Text style={styles.buttonText}>LEFT</Text>
        </Pressable>

        <Pressable style={styles.fireButton} onPress={handleFire}>
          <Text style={styles.fireButtonText}>FIRE</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={() => moveShip(1)}>
          <Text style={styles.buttonText}>RIGHT</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.boostButton, isBoosting && styles.boostButtonActive]}
          onPressIn={() => setIsBoosting(true)}
          onPressOut={() => setIsBoosting(false)}
          onPress={() => {}}>
          <Text style={styles.buttonText}>BOOST</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 24,
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
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
    marginBottom: 24,
    zIndex: 2,
  },
  title: {
    color: '#7CFFB2',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    color: '#8DBFF0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 6,
  },
  playArea: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 24,
    zIndex: 2,
  },
  shipWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  shipWing: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  shipBody: {
    width: SHIP_WIDTH,
    height: 30,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#143B64',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    overflow: 'visible',
  },
  shipCockpit: {
    position: 'absolute',
    top: 3,
    width: 18,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#B7F6FF',
  },
  shipCore: {
    color: '#7CFFB2',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6,
  },
  engineGlow: {
    position: 'absolute',
    bottom: -10,
    width: 18,
    height: 16,
    borderRadius: 999,
    backgroundColor: '#44D9FF',
    shadowColor: '#44D9FF',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    zIndex: 3,
  },
  button: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#111111',
    paddingVertical: 15,
    alignItems: 'center',
  },
  boostButton: {
    borderColor: '#7CFFB2',
  },
  boostButtonActive: {
    backgroundColor: '#173025',
  },
  fireButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#111111',
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  fireButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
