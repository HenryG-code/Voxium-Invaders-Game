import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';

type GameStyles = Record<string, any>;

type GameControlsProps = {
  controlLayout: 'classic' | 'split';
  isBoosting: boolean;
  isFireHeld: boolean;
  onMoveStart: (direction: -1 | 1) => void;
  onMoveEnd: (direction: -1 | 1) => void;
  onBoostStart: () => void;
  onBoostEnd: () => void;
  onFirePressIn: () => void;
  onFirePressOut: () => void;
  styles: GameStyles;
};

export function GameControls({
  controlLayout,
  isBoosting,
  isFireHeld,
  onMoveStart,
  onMoveEnd,
  onBoostStart,
  onBoostEnd,
  onFirePressIn,
  onFirePressOut,
  styles,
}: GameControlsProps) {
  return (
    <View
      style={[
        styles.controlsDock,
        controlLayout === 'split' && styles.controlsDockSplit,
      ]}
    >
      <Pressable
        style={[styles.boostControl, isBoosting && styles.boostControlActive]}
        onPressIn={onBoostStart}
        onPressOut={onBoostEnd}
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
          controlLayout === 'split' && styles.primaryControlsSplit,
        ]}
      >
        <View style={styles.joystickCluster}>
          <Text style={styles.swipeHintText}>
            SWIPE SCREEN TO MOVE LEFT AND RIGHT
          </Text>
          <View style={styles.joystickBase}>
            <Pressable
              style={[styles.joystickButton, styles.joystickButtonLeft]}
              onPressIn={() => onMoveStart(-1)}
              onPressOut={() => onMoveEnd(-1)}
              onPress={() => {}}
              android_disableSound
            >
              <MaterialIcons name="chevron-left" size={28} color="#F3FAFF" />
            </Pressable>
            <View style={styles.joystickCenterRail} />
            <Pressable
              style={[styles.joystickButton, styles.joystickButtonRight]}
              onPressIn={() => onMoveStart(1)}
              onPressOut={() => onMoveEnd(1)}
              onPress={() => {}}
              android_disableSound
            >
              <MaterialIcons name="chevron-right" size={28} color="#F3FAFF" />
            </Pressable>
          </View>
        </View>

        <View style={styles.fireCluster}>
          <Text style={styles.fireHintText}>HOLD FOR ALT ATTACK</Text>
          <Pressable
            style={[styles.fireButton, isFireHeld && styles.fireButtonActive]}
            onPressIn={onFirePressIn}
            onPressOut={onFirePressOut}
            onPress={() => {}}
            android_disableSound
          >
            <Text style={styles.fireButtonText}>
              {isFireHeld ? 'PULSE' : 'FIRE'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
