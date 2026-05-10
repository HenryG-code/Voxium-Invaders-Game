import { Pressable, Text, View } from 'react-native';

import {
  getStageClearMessage,
  getStageClearPrimaryLabel,
  getStageClearSecondaryLabel,
  getStageClearTitle,
} from '@/components/game/game-stage';

type GameStyles = Record<string, any>;

type StageClearScreenProps = {
  onContinue: () => void;
  onRestart: () => void;
  onReturnToMenu: () => void;
  unlockAnnouncement?: string | null;
  stage: number;
  styles: GameStyles;
};

export function StageClearScreen({
  onContinue,
  onRestart,
  onReturnToMenu,
  unlockAnnouncement,
  stage,
  styles,
}: StageClearScreenProps) {
  return (
    <View style={styles.gameOverOverlay}>
      <Text style={styles.gameOverTitle}>{getStageClearTitle(stage)}</Text>
      <Text style={styles.gameOverText}>{getStageClearMessage(stage)}</Text>
      {unlockAnnouncement ? (
        <View style={styles.stageClearUnlockBanner}>
          <Text style={styles.stageClearUnlockEyebrow}>NEW SHIP UNLOCKED</Text>
          <Text style={styles.stageClearUnlockText}>{unlockAnnouncement}</Text>
        </View>
      ) : null}
      {stage < 3 ? (
        <>
          <Pressable
            style={styles.gameOverPrimaryButton}
            onPress={onContinue}
            android_disableSound
          >
            <Text style={styles.gameOverPrimaryButtonText}>
              {getStageClearPrimaryLabel(stage)}
            </Text>
          </Pressable>
          <Pressable
            style={styles.gameOverSecondaryButton}
            onPress={onReturnToMenu}
            android_disableSound
          >
            <Text style={styles.gameOverSecondaryButtonText}>
              {getStageClearSecondaryLabel(stage)}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            style={styles.gameOverPrimaryButton}
            onPress={onReturnToMenu}
            android_disableSound
          >
            <Text style={styles.gameOverPrimaryButtonText}>
              {getStageClearPrimaryLabel(stage)}
            </Text>
          </Pressable>
          <Pressable
            style={styles.gameOverSecondaryButton}
            onPress={onRestart}
            android_disableSound
          >
            <Text style={styles.gameOverSecondaryButtonText}>
              {getStageClearSecondaryLabel(stage)}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
