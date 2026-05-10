import { Pressable, Text, View } from 'react-native';

type GameStyles = Record<string, any>;

type GameOverScreenProps = {
  onRestart: () => void;
  onReturnToMenu: () => void;
  styles: GameStyles;
};

export function GameOverScreen({
  onRestart,
  onReturnToMenu,
  styles,
}: GameOverScreenProps) {
  return (
    <View style={styles.gameOverOverlay}>
      <Text style={styles.gameOverTitle}>GAME OVER</Text>
      <Text style={styles.gameOverText}>
        The invaders broke through your flight lane.
      </Text>
      <Pressable
        style={styles.gameOverPrimaryButton}
        onPress={onRestart}
        android_disableSound
      >
        <Text style={styles.gameOverPrimaryButtonText}>RESTART</Text>
      </Pressable>
      <Pressable
        style={styles.gameOverSecondaryButton}
        onPress={onReturnToMenu}
        android_disableSound
      >
        <Text style={styles.gameOverSecondaryButtonText}>MAIN MENU</Text>
      </Pressable>
    </View>
  );
}
