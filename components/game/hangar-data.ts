export type HangarShip = {
  id: string;
  serialNumber: number;
  modelKey: string;
  name: string;
  callsign: string;
  role: string;
  weapon: string;
  weaponDetail: string;
  abilityName: string;
  abilityDetail: string;
  unlockStage: number;
  unlockNote: string;
  accent: string;
  hullTint: string;
  glow: string;
  stats: {
    speed: number;
    armor: number;
    firepower: number;
    hp: number;
    shield: number;
  };
};

// The fleet starts with the starter frame only. Each cleared stage increases
// clearance and can unlock additional frames for the hangar.
export const HANGAR_STAGE_CLEARANCE = 1;

export const HANGAR_SHIPS: HangarShip[] = [
  {
    id: "warden",
    serialNumber: 1,
    modelKey: "Warden",
    name: "VX-1 Warden",
    callsign: "Starter Frame",
    role: "Balanced interceptor for early-stage survival runs.",
    weapon: "Twin pulse cannons",
    weaponDetail: "Steady fire rate with a charged energy burst on hold.",
    abilityName: "Pulse Charge",
    abilityDetail: "Hold fire to build a stronger alternate blast.",
    unlockStage: 1,
    unlockNote: "Available from the first sortie.",
    accent: "#67D7FF",
    hullTint: "#F4FAFF",
    glow: "rgba(103, 215, 255, 0.34)",
    stats: {
      speed: 68,
      armor: 60,
      firepower: 60,
      hp: 5,
      shield: 3,
    },
  },
  {
    id: "raptor",
    serialNumber: 2,
    modelKey: "Raptor",
    name: "VX-2 Raptor",
    callsign: "Missile Frame",
    role: "Fast hunter built for burst damage and pursuit pressure.",
    weapon: "Micro missile rack",
    weaponDetail: "Locks fast and punches harder through clustered waves.",
    abilityName: "Missile Burst",
    abilityDetail: "Launches a spread of guided warheads for crowd control.",
    unlockStage: 2,
    unlockNote: "Unlocked after your first successful clear.",
    accent: "#7FF0C9",
    hullTint: "#EEFFF8",
    glow: "rgba(127, 240, 201, 0.28)",
    stats: {
      speed: 76,
      armor: 66,
      firepower: 68,
      hp: 6,
      shield: 3,
    },
  },
  {
    id: "viper",
    serialNumber: 3,
    modelKey: "Viper",
    name: "VX-3 Viper",
    callsign: "Strafe Frame",
    role: "A nimble duelist built around quick lane changes and steady pressure.",
    weapon: "Needle repeaters",
    weaponDetail: "Keeps a tight stream on target while slipping through small gaps.",
    abilityName: "Strafe Rush",
    abilityDetail: "Banks hard and favors constant lateral movement.",
    unlockStage: 3,
    unlockNote: "Unlocked after clearing deeper combat lanes.",
    accent: "#96FFB1",
    hullTint: "#F0FFF3",
    glow: "rgba(150, 255, 177, 0.25)",
    stats: {
      speed: 80,
      armor: 72,
      firepower: 74,
      hp: 6,
      shield: 4,
    },
  },
  {
    id: "tempest",
    serialNumber: 4,
    modelKey: "Tempest",
    name: "VX-4 Tempest",
    callsign: "Storm Frame",
    role: "A kinetic interceptor built around chain bursts and speed.",
    weapon: "Chain ion cannons",
    weaponDetail: "Tracks target clusters with hopping ion arcs.",
    abilityName: "Ion Chain",
    abilityDetail: "Jumps damage between nearby enemies when fired in bursts.",
    unlockStage: 4,
    unlockNote: "Unlocked after clearing Stage 2.",
    accent: "#8EA8FF",
    hullTint: "#F3F6FF",
    glow: "rgba(142, 168, 255, 0.24)",
    stats: {
      speed: 88,
      armor: 78,
      firepower: 80,
      hp: 7,
      shield: 4,
    },
  },
  {
    id: "helios",
    serialNumber: 5,
    modelKey: "Helios",
    name: "VX-5 Helios",
    callsign: "Beam Frame",
    role: "A precision platform for melting shielded targets.",
    weapon: "Focused arc beam",
    weaponDetail: "Channels a sustained beam that rewards careful positioning.",
    abilityName: "Arc Beam",
    abilityDetail: "A narrow beam that ramps damage while you hold aim.",
    unlockStage: 5,
    unlockNote: "Reserved for pilots who can manage the slower beam frame.",
    accent: "#FFC86D",
    hullTint: "#FFF9ED",
    glow: "rgba(255, 200, 109, 0.24)",
    stats: {
      speed: 62,
      armor: 84,
      firepower: 88,
      hp: 7,
      shield: 5,
    },
  },
  {
    id: "bastion",
    serialNumber: 6,
    modelKey: "Bastion",
    name: "VX-6 Bastion",
    callsign: "Shield Frame",
    role: "A defensive heavy frame designed to endure boss lanes.",
    weapon: "Plasma wall emitters",
    weaponDetail: "Projects a thicker plasma stream for area denial.",
    abilityName: "Bulwark",
    abilityDetail: "Builds temporary shielding after a successful stage clear.",
    unlockStage: 6,
    unlockNote: "Reserved for advanced pilots.",
    accent: "#C68DFF",
    hullTint: "#FBF5FF",
    glow: "rgba(198, 141, 255, 0.22)",
    stats: {
      speed: 54,
      armor: 92,
      firepower: 84,
      hp: 8,
      shield: 5,
    },
  },
  {
    id: "atlas",
    serialNumber: 7,
    modelKey: "Atlas",
    name: "VX-7 Atlas",
    callsign: "Siege Frame",
    role: "Heavy assault frame designed for boss pressure and survival.",
    weapon: "Scatter siege pods",
    weaponDetail: "Launches dense explosive spreads with strong area denial.",
    abilityName: "Siege Spread",
    abilityDetail: "Drops clustered ordnance with a wider impact zone.",
    unlockStage: 7,
    unlockNote: "Reserved for late-stage fleet progression.",
    accent: "#FF8B80",
    hullTint: "#FFF1F0",
    glow: "rgba(255, 139, 128, 0.22)",
    stats: {
      speed: 48,
      armor: 96,
      firepower: 94,
      hp: 8,
      shield: 6,
    },
  },
  {
    id: "nova",
    serialNumber: 8,
    modelKey: "Nova",
    name: "VX-8 Nova",
    callsign: "Vanguard Frame",
    role: "An advanced hybrid frame tuned for high-skill late-run aggression.",
    weapon: "Prism pulse lances",
    weaponDetail: "Balances fast recovery with a stronger charged strike window.",
    abilityName: "Nova Lance",
    abilityDetail: "Rewards timing and clean positioning with elite burst pressure.",
    unlockStage: 8,
    unlockNote: "Locked until the highest fleet clearance tier.",
    accent: "#FFE870",
    hullTint: "#FFFDEE",
    glow: "rgba(255, 232, 112, 0.24)",
    stats: {
      speed: 72,
      armor: 100,
      firepower: 98,
      hp: 9,
      shield: 6,
    },
  },
];

export function getUnlockedHangarShips(stageClearance = HANGAR_STAGE_CLEARANCE) {
  return HANGAR_SHIPS.filter((ship) => ship.unlockStage <= stageClearance);
}

export function getNextUnlockHangarShip(stageClearance = HANGAR_STAGE_CLEARANCE) {
  return HANGAR_SHIPS.find((ship) => ship.unlockStage > stageClearance) ?? null;
}

export function getStageClearanceAfterClear(
  currentClearance: number,
  stageCleared: number,
) {
  return currentClearance + Math.max(1, stageCleared);
}

export function getNewlyUnlockedHangarShips(
  previousClearance: number,
  nextClearance: number,
) {
  return HANGAR_SHIPS.filter(
    (ship) =>
      ship.unlockStage > previousClearance && ship.unlockStage <= nextClearance,
  );
}
