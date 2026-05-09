export type HangarShip = {
  id: string;
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
  };
};

export const HANGAR_STAGE_CLEARANCE = 3;

export const HANGAR_SHIPS: HangarShip[] = [
  {
    id: "warden",
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
      armor: 62,
      firepower: 64,
    },
  },
  {
    id: "raptor",
    name: "VX-2 Raptor",
    callsign: "Missile Frame",
    role: "Fast hunter built for burst damage and pursuit pressure.",
    weapon: "Micro missile rack",
    weaponDetail: "Locks fast and punches harder through clustered waves.",
    abilityName: "Missile Burst",
    abilityDetail: "Launches a spread of guided warheads for crowd control.",
    unlockStage: 3,
    unlockNote: "Earned after clearing Stage 1.",
    accent: "#7FF0C9",
    hullTint: "#EEFFF8",
    glow: "rgba(127, 240, 201, 0.28)",
    stats: {
      speed: 82,
      armor: 54,
      firepower: 78,
    },
  },
  {
    id: "helios",
    name: "VX-5 Helios",
    callsign: "Beam Frame",
    role: "A precision platform for melting shielded targets.",
    weapon: "Focused arc beam",
    weaponDetail: "Channels a sustained beam that rewards careful positioning.",
    abilityName: "Arc Beam",
    abilityDetail: "A narrow beam that ramps damage while you hold aim.",
    unlockStage: 5,
    unlockNote: "Locked behind deeper stage clears.",
    accent: "#FFC86D",
    hullTint: "#FFF9ED",
    glow: "rgba(255, 200, 109, 0.24)",
    stats: {
      speed: 60,
      armor: 74,
      firepower: 88,
    },
  },
  {
    id: "atlas",
    name: "VX-7 Atlas",
    callsign: "Siege Frame",
    role: "Heavy assault frame designed for boss pressure and survival.",
    weapon: "Scatter siege pods",
    weaponDetail: "Launches dense explosive spreads with strong area denial.",
    abilityName: "Siege Spread",
    abilityDetail: "Drops clustered ordinance with a wider impact zone.",
    unlockStage: 7,
    unlockNote: "Reserved for late-stage fleet progression.",
    accent: "#FF8B80",
    hullTint: "#FFF1F0",
    glow: "rgba(255, 139, 128, 0.22)",
    stats: {
      speed: 46,
      armor: 92,
      firepower: 90,
    },
  },
  {
    id: "tempest",
    name: "VX-4 Tempest",
    callsign: "Storm Frame",
    role: "A kinetic interceptor built around chain bursts and speed.",
    weapon: "Chain ion cannons",
    weaponDetail: "Tracks target clusters with hopping ion arcs.",
    abilityName: "Ion Chain",
    abilityDetail: "Jumps damage between nearby enemies when fired in bursts.",
    unlockStage: 4,
    unlockNote: "Unlocks after clearing Stage 2.",
    accent: "#8EA8FF",
    hullTint: "#F3F6FF",
    glow: "rgba(142, 168, 255, 0.24)",
    stats: {
      speed: 90,
      armor: 58,
      firepower: 84,
    },
  },
  {
    id: "bastion",
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
      armor: 96,
      firepower: 76,
    },
  },
];

export function getUnlockedHangarShips(stageClearance = HANGAR_STAGE_CLEARANCE) {
  return HANGAR_SHIPS.filter((ship) => ship.unlockStage <= stageClearance);
}
