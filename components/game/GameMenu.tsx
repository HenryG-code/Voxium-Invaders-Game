import { Pressable, ScrollView, Text, View } from 'react-native';

import { HeroShip } from '@/components/game/game-actors';
import {
  CREDITS_BLOCK_TEXT,
  type ControlLayout,
  type MenuPanel,
} from '@/components/game/game-logic';
import { type HangarShip } from '@/components/game/hangar-data';

type GameStyles = Record<string, any>;

type GameMenuProps = {
  appVersion: string;
  activeShipModelKey: string;
  controlLayout: ControlLayout;
  highScoreDisplay: string;
  isMusicEnabled: boolean;
  isSfxEnabled: boolean;
  lastRunDisplay: string;
  menuPanel: MenuPanel;
  nextUnlockShip: HangarShip | null;
  stageClearance: number;
  onOpenHangar: () => void;
  onStartGame: () => void;
  setIsMusicEnabled: (value: boolean | ((current: boolean) => boolean)) => void;
  setIsSfxEnabled: (value: boolean | ((current: boolean) => boolean)) => void;
  setMenuPanel: (value: MenuPanel) => void;
  styles: GameStyles;
  toggleControlLayout: () => void;
  unlockedHangarShips: HangarShip[];
};

function renderShipPreview(ship: HangarShip, styles: GameStyles) {
  return (
    <View
      key={ship.id}
      style={[styles.menuHangarShipCard, { borderColor: ship.accent }]}
    >
      <Text style={styles.menuHangarShipName}>{ship.name}</Text>
      <Text style={styles.menuHangarShipWeapon}>{ship.weapon}</Text>
    </View>
  );
}

export function GameMenu({
  appVersion,
  activeShipModelKey,
  controlLayout,
  highScoreDisplay,
  isMusicEnabled,
  isSfxEnabled,
  lastRunDisplay,
  menuPanel,
  nextUnlockShip,
  stageClearance,
  onOpenHangar,
  onStartGame,
  setIsMusicEnabled,
  setIsSfxEnabled,
  setMenuPanel,
  styles,
  toggleControlLayout,
  unlockedHangarShips,
}: GameMenuProps) {
  return (
    <View style={styles.menuScreen}>
      {menuPanel === 'main' ? (
        <>
          <View style={styles.menuHeader}>
            <Text style={styles.menuEyebrow}>ARCADE FLIGHT SYSTEM</Text>
            <Text style={styles.menuTitle}>VOXIUM</Text>
            <Text style={styles.menuTitle}>INVADERS</Text>
            <Text style={styles.menuBlurb}>
              Pilot the rebel striker through deep-space assault lanes.
            </Text>
          </View>

          <View style={styles.menuActions}>
            <Pressable
              style={styles.menuStartButton}
              onPress={onStartGame}
              android_disableSound
            >
              <Text style={styles.menuStartButtonText}>START GAME</Text>
            </Pressable>
            <Pressable
              style={styles.menuSecondaryButton}
              onPress={() => setMenuPanel('options')}
              android_disableSound
            >
              <Text style={styles.menuSecondaryButtonText}>OPTIONS</Text>
            </Pressable>
            <Pressable
              style={styles.menuSecondaryButton}
              onPress={() => setMenuPanel('hangar')}
              android_disableSound
            >
              <Text style={styles.menuSecondaryButtonText}>SHIP HANGAR</Text>
            </Pressable>
            <Pressable
              style={styles.menuSecondaryButton}
              onPress={() => setMenuPanel('credits')}
              android_disableSound
            >
              <Text style={styles.menuSecondaryButtonText}>CREDITS</Text>
            </Pressable>
            <Pressable
              style={styles.menuSecondaryButton}
              onPress={() => setMenuPanel('records')}
              android_disableSound
            >
              <Text style={styles.menuSecondaryButtonText}>HIGH SCORE</Text>
            </Pressable>
          </View>

          <View style={styles.menuShipStage}>
            <HeroShip
              bankAngle={-4}
              isBoosting={false}
              modelKey={activeShipModelKey}
              scale={1.08}
              decorative
              styles={styles}
            />
          </View>
        </>
      ) : menuPanel === 'options' ? (
        <View style={styles.menuPanel}>
          <Text style={styles.menuPanelTitle}>OPTIONS</Text>
          <Pressable
            style={styles.menuSecondaryButton}
            onPress={() => setIsMusicEnabled((current) => !current)}
            android_disableSound
          >
            <Text style={styles.menuSecondaryButtonText}>
              MUSIC: {isMusicEnabled ? 'ON' : 'OFF'}
            </Text>
          </Pressable>
          <Pressable
            style={styles.menuSecondaryButton}
            onPress={() => setIsSfxEnabled((current) => !current)}
            android_disableSound
          >
            <Text style={styles.menuSecondaryButtonText}>
              SOUND EFFECTS: {isSfxEnabled ? 'ON' : 'OFF'}
            </Text>
          </Pressable>
          <Pressable
            style={styles.menuSecondaryButton}
            onPress={toggleControlLayout}
            android_disableSound
          >
            <Text style={styles.menuSecondaryButtonText}>
              CONTROL LAYOUT: {controlLayout === 'classic' ? 'CLASSIC' : 'SPLIT'}
            </Text>
          </Pressable>
          <Pressable
            style={styles.menuBackButton}
            onPress={() => setMenuPanel('main')}
            android_disableSound
          >
            <Text style={styles.menuBackButtonText}>BACK</Text>
          </Pressable>
        </View>
      ) : menuPanel === 'hangar' ? (
        <View style={styles.menuPanel}>
          <Text style={styles.menuPanelTitle}>SHIP HANGAR</Text>
          <Text style={styles.menuPanelBody}>
            CLEARANCE {stageClearance} | {unlockedHangarShips.length} FRAMES READY
          </Text>
          <View style={styles.menuHangarPreview}>
            {unlockedHangarShips.slice(0, 2).map((ship) =>
              renderShipPreview(ship, styles),
            )}
          </View>
          {nextUnlockShip ? (
            <Text style={styles.menuHangarHint}>
              NEXT UNLOCK: {nextUnlockShip.name} AT STAGE {nextUnlockShip.unlockStage}
            </Text>
          ) : null}
          <Pressable
            style={styles.menuStartButton}
            onPress={onOpenHangar}
            android_disableSound
          >
            <Text style={styles.menuStartButtonText}>OPEN HANGAR BAY</Text>
          </Pressable>
          <Pressable
            style={styles.menuBackButton}
            onPress={() => setMenuPanel('main')}
            android_disableSound
          >
            <Text style={styles.menuBackButtonText}>BACK</Text>
          </Pressable>
        </View>
      ) : menuPanel === 'records' ? (
        <View style={styles.menuPanel}>
          <Text style={styles.menuPanelTitle}>HIGH SCORE</Text>
          <Text style={styles.menuPanelBody}>BEST RUN {highScoreDisplay}</Text>
          <Text style={styles.menuPanelBody}>LAST RUN {lastRunDisplay}</Text>
          <Pressable
            style={styles.menuBackButton}
            onPress={() => setMenuPanel('main')}
            android_disableSound
          >
            <Text style={styles.menuBackButtonText}>BACK</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.menuPanel}>
          <Text style={styles.menuPanelTitle}>CREDITS</Text>
          <ScrollView
            style={styles.creditsScroll}
            contentContainerStyle={styles.creditsScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.creditsBlockCard}>
              <Text style={styles.creditsBlockText}>{CREDITS_BLOCK_TEXT}</Text>
            </View>
          </ScrollView>
          <Pressable
            style={styles.menuBackButton}
            onPress={() => setMenuPanel('main')}
            android_disableSound
          >
            <Text style={styles.menuBackButtonText}>BACK</Text>
          </Pressable>
        </View>
      )}
      <Text style={styles.versionFooter}>v{appVersion}</Text>
    </View>
  );
}
