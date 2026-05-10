import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  HANGAR_SHIPS,
  getNextUnlockHangarShip,
  getUnlockedHangarShips,
} from "@/components/game/hangar-data";
import { getShipModelImage } from "@/components/game/game-logic";
import { requestMainMenuReturn } from "@/components/game/main-menu-return";
import { useGameStorage } from "@/hooks/useGameStorage";

function renderStatBar(label: string, value: number, accent: string) {
  return (
    <View key={label} style={styles.statRow}>
      <View style={styles.statHeader}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <View style={styles.statTrack}>
        <View
          style={[
            styles.statFill,
            {
              width: `${value}%`,
              backgroundColor: accent,
            },
          ]}
        />
      </View>
    </View>
  );
}

export default function HangarScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isWide = width >= 920;
  const {
    activeShipId: selectedShipId,
    highestClearedStage: stageClearance,
    setActiveShipId,
  } = useGameStorage();

  const selectedShip =
    HANGAR_SHIPS.find((ship) => ship.id === selectedShipId) ?? HANGAR_SHIPS[0];
  const availableShips = getUnlockedHangarShips(stageClearance);
  const nextUnlockShip = getNextUnlockHangarShip(stageClearance);
  const remainingUnlocks = HANGAR_SHIPS.length - availableShips.length;

  return (
    <View style={styles.screen}>
      <View style={styles.spaceGlowTop} />
      <View style={styles.spaceGlowBottom} />
      <View style={styles.gridHaloLeft} />
      <View style={styles.gridHaloRight} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => {
            requestMainMenuReturn();
            navigation.navigate("index" as never);
          }}
        >
          <MaterialIcons name="arrow-back" size={16} color="#D9EEFF" />
          <Text style={styles.backButtonText}>MAIN MENU</Text>
        </Pressable>

        <View style={styles.headerBand}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>FLEET BAY 01</Text>
            <Text style={styles.title}>Voxium Hangar</Text>
            <Text style={styles.subtitle}>
              Switch active ships, inspect weapon frames, and build toward the
              next unlock line. Frames are now staged in fixed slots 1 to 8 for
              your upcoming model imports.
            </Text>
          </View>

          <View style={styles.headerStatus}>
            <View style={styles.statusChip}>
              <MaterialIcons name="check-circle" size={16} color="#7FF0C9" />
              <Text style={styles.statusChipText}>
                {availableShips.length} READY
              </Text>
            </View>
            <View style={styles.statusChip}>
              <MaterialIcons name="lock" size={16} color="#FFCD6A" />
              <Text style={styles.statusChipText}>
                {remainingUnlocks} LOCKED
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.heroSection,
            isWide && styles.heroSectionWide,
          ]}
        >
          <View style={styles.shipBayPanel}>
            <View style={styles.shipBayHeader}>
              <Text style={styles.panelEyebrow}>ACTIVE FRAME</Text>
              <Text style={styles.shipName}>{selectedShip.name}</Text>
              <Text style={styles.shipCallsign}>{selectedShip.callsign}</Text>
              <Text style={styles.shipActiveTag}>ACTIVE IN FLEET</Text>
            </View>

            <View style={styles.shipStage}>
              <View
                style={[
                  styles.shipGlow,
                  { backgroundColor: selectedShip.glow },
                ]}
              />
              <View style={styles.shipPadShadow} />
              <View style={styles.shipPad} />
              <View style={styles.shipBeam} />
              <View style={styles.shipBayRails}>
                <View style={styles.shipRailLeft} />
                <View style={styles.shipRailRight} />
              </View>
              <View style={styles.shipDisplayWrap}>
                <Image
                  source={getShipModelImage(selectedShip.modelKey)}
                  contentFit="contain"
                  style={[
                    styles.shipImage,
                    { tintColor: selectedShip.hullTint },
                  ]}
                />
              </View>
            </View>

            <View style={styles.shipFootnoteRow}>
              <View style={styles.badge}>
                <MaterialIcons
                  name="rocket-launch"
                  size={15}
                  color={selectedShip.accent}
                />
                <Text style={styles.badgeText}>{selectedShip.weapon}</Text>
              </View>
              <View style={styles.badge}>
                <MaterialIcons
                  name="flag"
                  size={15}
                  color={selectedShip.accent}
                />
                <Text style={styles.badgeText}>
                  STAGE {selectedShip.unlockStage} UNLOCK
                </Text>
              </View>
              <View style={styles.badge}>
                <MaterialIcons
                  name="view-in-ar"
                  size={15}
                  color={selectedShip.accent}
                />
                <Text style={styles.badgeText}>
                  SLOT {selectedShip.serialNumber} | {selectedShip.modelKey}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoColumn}>
            <View style={styles.infoPanel}>
              <Text style={styles.panelEyebrow}>WEAPON PROFILE</Text>
              <Text style={styles.infoTitle}>{selectedShip.weapon}</Text>
              <Text style={styles.infoText}>{selectedShip.weaponDetail}</Text>
              <Text style={styles.infoRole}>{selectedShip.role}</Text>
              <Text style={styles.abilityTitle}>{selectedShip.abilityName}</Text>
              <Text style={styles.infoText}>{selectedShip.abilityDetail}</Text>
            </View>

            <View style={styles.infoPanel}>
              <Text style={styles.panelEyebrow}>FRAME READOUT</Text>
              <View style={styles.statGroup}>
                {renderStatBar("SPEED", selectedShip.stats.speed, selectedShip.accent)}
                {renderStatBar("ARMOR", selectedShip.stats.armor, selectedShip.accent)}
                {renderStatBar(
                  "FIREPOWER",
                  selectedShip.stats.firepower,
                  selectedShip.accent,
                )}
              </View>
            </View>

            <View style={styles.infoPanel}>
              <Text style={styles.panelEyebrow}>PROGRESSION</Text>
              <Text style={styles.progressTitle}>
                Clearance credits: {stageClearance}
              </Text>
              <Text style={styles.infoText}>
                Clearance is saved between runs. Clear more stages to unlock
                stronger frames, then come back here to swap your active ship.
              </Text>
              <Text style={styles.unlockNote}>
                {selectedShip.unlockNote} Model file target: {selectedShip.modelKey}
              </Text>
              {nextUnlockShip ? (
                <Text style={styles.nextUnlockNote}>
                  NEXT UNLOCK: {nextUnlockShip.name} REQUIRES CLEARANCE{" "}
                  {nextUnlockShip.unlockStage}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.selectorPanel}>
          <View style={styles.selectorHeader}>
            <View>
              <Text style={styles.panelEyebrow}>SHIP STORAGE</Text>
              <Text style={styles.selectorTitle}>Choose a frame</Text>
            </View>
            <Text style={styles.selectorHint}>
              Tap a ready ship to switch the active frame.
            </Text>
          </View>

          <ScrollView
            horizontal
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectorRow}
          >
            {HANGAR_SHIPS.map((ship) => {
              const isUnlocked = ship.unlockStage <= stageClearance;
              const isSelected = ship.id === selectedShip.id;
              const lockText = isUnlocked
                ? isSelected
                  ? "SELECTED"
                  : "UNLOCKED"
                : `LOCKED UNTIL CLEARANCE ${ship.unlockStage}`;

              return (
                <Pressable
                  key={ship.id}
                  style={[
                    styles.selectorCard,
                    isUnlocked
                      ? styles.selectorCardUnlocked
                      : styles.selectorCardLocked,
                    isSelected && {
                      borderColor: ship.accent,
                      backgroundColor: "rgba(10, 20, 32, 0.98)",
                    },
                  ]}
                  onPress={() => {
                    if (isUnlocked) {
                      setActiveShipId(ship.id);
                    }
                  }}
                >
                  <View style={styles.selectorCardTop}>
                    <View
                      style={[
                        styles.selectorIconWrap,
                        { backgroundColor: ship.glow },
                      ]}
                    >
                      <Image
                        source={getShipModelImage(ship.modelKey)}
                        contentFit="contain"
                        style={[
                          styles.selectorShipImage,
                          { tintColor: isUnlocked ? ship.hullTint : "#708295" },
                        ]}
                      />
                    </View>
                    <View style={styles.selectorMeta}>
                      <Text style={styles.selectorShipName}>{ship.name}</Text>
                      <Text style={styles.selectorShipSlot}>
                        SLOT {ship.serialNumber} | {ship.modelKey}
                      </Text>
                      <Text style={styles.selectorShipWeapon}>{ship.weapon}</Text>
                      <Text style={styles.selectorShipAbility}>
                        {ship.abilityName}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.selectorShipRole}>{ship.role}</Text>
                  <Text style={styles.selectorShipUnlock}>
                    {isUnlocked ? ship.unlockNote : `Locked: ${ship.unlockNote}`}
                  </Text>

                  <View style={styles.selectorCardFooter}>
                    <View
                      style={[
                        styles.selectorState,
                        isUnlocked
                          ? styles.selectorStateReady
                          : styles.selectorStateLocked,
                      ]}
                    >
                      <MaterialIcons
                        name={isUnlocked ? "check-circle" : "lock"}
                        size={14}
                        color={isUnlocked ? "#7FF0C9" : "#FFCD6A"}
                      />
                      <Text style={styles.selectorStateText}>
                        {lockText}
                      </Text>
                    </View>
                    <MaterialIcons
                      name="arrow-forward"
                      size={18}
                      color={isUnlocked ? ship.accent : "#627180"}
                    />
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#060D16",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 18,
  },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(131, 186, 255, 0.22)",
    backgroundColor: "rgba(9, 18, 29, 0.94)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  backButtonText: {
    color: "#D9EEFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  spaceGlowTop: {
    position: "absolute",
    top: -90,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: "rgba(86, 152, 255, 0.12)",
  },
  spaceGlowBottom: {
    position: "absolute",
    bottom: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: "rgba(46, 228, 191, 0.1)",
  },
  gridHaloLeft: {
    position: "absolute",
    top: 180,
    left: -30,
    width: 160,
    height: 340,
    borderRadius: 36,
    backgroundColor: "rgba(23, 45, 72, 0.24)",
    transform: [{ rotate: "-8deg" }],
  },
  gridHaloRight: {
    position: "absolute",
    top: 90,
    right: -22,
    width: 180,
    height: 300,
    borderRadius: 36,
    backgroundColor: "rgba(18, 58, 66, 0.22)",
    transform: [{ rotate: "12deg" }],
  },
  headerBand: {
    borderWidth: 1,
    borderColor: "rgba(136, 190, 255, 0.18)",
    backgroundColor: "rgba(7, 15, 24, 0.94)",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
  },
  headerCopy: {
    gap: 6,
  },
  eyebrow: {
    color: "#89B7E2",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.2,
  },
  title: {
    color: "#F3FAFF",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  subtitle: {
    color: "#B7C8D8",
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 560,
  },
  headerStatus: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(130, 170, 214, 0.2)",
    backgroundColor: "rgba(12, 22, 35, 0.84)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusChipText: {
    color: "#E4F0FB",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  heroSection: {
    gap: 18,
    width: "100%",
  },
  heroSectionWide: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  shipBayPanel: {
    flex: 1.35,
    minWidth: 0,
    borderWidth: 1,
    borderColor: "rgba(131, 186, 255, 0.16)",
    backgroundColor: "rgba(7, 14, 24, 0.96)",
    borderRadius: 24,
    padding: 18,
    gap: 16,
    overflow: "hidden",
  },
  shipBayHeader: {
    gap: 4,
  },
  panelEyebrow: {
    color: "#78A9D4",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  shipName: {
    color: "#F4FAFF",
    fontSize: 28,
    fontWeight: "900",
  },
  shipCallsign: {
    color: "#9EB5C9",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
  shipActiveTag: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(104, 212, 181, 0.28)",
    backgroundColor: "rgba(13, 54, 46, 0.52)",
    color: "#CFFFEF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  shipStage: {
    minHeight: 320,
    borderWidth: 1,
    borderColor: "rgba(94, 142, 190, 0.18)",
    backgroundColor: "rgba(11, 21, 34, 0.92)",
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  shipGlow: {
    position: "absolute",
    top: 38,
    width: 250,
    height: 250,
    borderRadius: 999,
  },
  shipPadShadow: {
    position: "absolute",
    bottom: 44,
    width: 210,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.34)",
  },
  shipPad: {
    position: "absolute",
    bottom: 56,
    width: 232,
    height: 26,
    borderRadius: 999,
    backgroundColor: "#1A2B3C",
    borderWidth: 1,
    borderColor: "rgba(143, 196, 255, 0.16)",
  },
  shipBeam: {
    position: "absolute",
    bottom: 82,
    width: 126,
    height: 170,
    borderRadius: 999,
    backgroundColor: "rgba(151, 216, 255, 0.08)",
  },
  shipBayRails: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 26,
    flexDirection: "row",
  },
  shipRailLeft: {
    width: 8,
    borderRadius: 999,
    backgroundColor: "rgba(132, 156, 182, 0.12)",
  },
  shipRailRight: {
    width: 8,
    borderRadius: 999,
    backgroundColor: "rgba(132, 156, 182, 0.12)",
  },
  shipDisplayWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -6,
  },
  shipImage: {
    width: 270,
    height: 270,
  },
  shipFootnoteRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(130, 185, 245, 0.16)",
    backgroundColor: "rgba(12, 22, 35, 0.84)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgeText: {
    color: "#DDE9F5",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  infoColumn: {
    flex: 1,
    minWidth: 0,
    gap: 18,
  },
  infoPanel: {
    borderWidth: 1,
    borderColor: "rgba(132, 184, 245, 0.15)",
    backgroundColor: "rgba(7, 14, 24, 0.95)",
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  infoTitle: {
    color: "#F6FBFF",
    fontSize: 22,
    fontWeight: "900",
  },
  infoText: {
    color: "#B6C8DA",
    fontSize: 14,
    lineHeight: 21,
  },
  infoRole: {
    color: "#D8E7F4",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
  },
  abilityTitle: {
    color: "#F7FBFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 2,
  },
  progressTitle: {
    color: "#E8F2FC",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  unlockNote: {
    color: "#90B3CF",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  nextUnlockNote: {
    color: "#B8D5F2",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: 0.4,
  },
  statGroup: {
    gap: 12,
  },
  statRow: {
    gap: 6,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statLabel: {
    color: "#A6BED3",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  statValue: {
    color: "#EFF8FF",
    fontSize: 12,
    fontWeight: "900",
  },
  statTrack: {
    width: "100%",
    height: 9,
    borderRadius: 999,
    backgroundColor: "rgba(65, 85, 108, 0.5)",
    overflow: "hidden",
  },
  statFill: {
    height: "100%",
    borderRadius: 999,
  },
  selectorPanel: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(132, 184, 245, 0.15)",
    backgroundColor: "rgba(7, 14, 24, 0.96)",
    borderRadius: 24,
    paddingVertical: 18,
    paddingLeft: 18,
    gap: 14,
  },
  selectorHeader: {
    paddingRight: 18,
    gap: 6,
  },
  selectorTitle: {
    color: "#F5FAFF",
    fontSize: 24,
    fontWeight: "900",
  },
  selectorHint: {
    color: "#AFC3D5",
    fontSize: 13,
    lineHeight: 19,
  },
  selectorRow: {
    gap: 12,
    paddingRight: 18,
  },
  selectorCard: {
    width: 248,
    minHeight: 212,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  selectorCardUnlocked: {
    borderWidth: 1,
    borderColor: "rgba(121, 184, 255, 0.18)",
    backgroundColor: "rgba(12, 22, 35, 0.9)",
  },
  selectorCardLocked: {
    borderWidth: 1,
    borderColor: "rgba(112, 124, 138, 0.18)",
    backgroundColor: "rgba(12, 18, 26, 0.88)",
  },
  selectorCardTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  selectorIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 24, 35, 0.78)",
  },
  selectorShipImage: {
    width: 58,
    height: 58,
  },
  selectorMeta: {
    flex: 1,
    gap: 4,
  },
  selectorShipName: {
    color: "#EFF8FF",
    fontSize: 17,
    fontWeight: "900",
  },
  selectorShipSlot: {
    color: "#BFD7EA",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  selectorShipWeapon: {
    color: "#8EB0CC",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  selectorShipAbility: {
    color: "#D8F0FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.9,
  },
  selectorShipRole: {
    color: "#B8C7D4",
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  selectorShipUnlock: {
    color: "#8C9CAF",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    marginTop: -4,
  },
  selectorCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectorStateReady: {
    backgroundColor: "rgba(19, 52, 46, 0.7)",
  },
  selectorStateLocked: {
    backgroundColor: "rgba(70, 50, 16, 0.58)",
  },
  selectorStateText: {
    color: "#EEF6FF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
