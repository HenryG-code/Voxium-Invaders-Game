import { HANGAR_SHIPS, type HangarShip } from '@/components/game/hangar-data';

export type ShipGameplayProfile = {
  ship: HangarShip;
  moveSpeedPxPerMs: number;
  standardFireCooldownMs: number;
  pulseChargeMs: number;
  shipScale: number;
  shipBankMultiplier: number;
  shipLiftOffset: number;
  playerHp: number;
  shieldPoints: number;
};

const DEFAULT_SHIP_ID = HANGAR_SHIPS[0]?.id ?? 'warden';

let activeShipId = DEFAULT_SHIP_ID;

function getShipById(shipId: string) {
  return HANGAR_SHIPS.find((ship) => ship.id === shipId) ?? HANGAR_SHIPS[0];
}

export function getActiveShipId() {
  return activeShipId;
}

export function setActiveShipId(shipId: string) {
  activeShipId = getShipById(shipId).id;
}

export function getActiveShip() {
  return getShipById(activeShipId);
}

export function getShipGameplayProfile(shipId = activeShipId): ShipGameplayProfile {
  const ship = getShipById(shipId);

  switch (ship.id) {
    case 'raptor':
      return {
        ship,
        moveSpeedPxPerMs: 0.58,
        standardFireCooldownMs: 106,
        pulseChargeMs: 360,
        shipScale: 0.82,
        shipBankMultiplier: 1.15,
        shipLiftOffset: 0,
        playerHp: 6,
        shieldPoints: 3,
      };
    case 'viper':
      return {
        ship,
        moveSpeedPxPerMs: 0.56,
        standardFireCooldownMs: 118,
        pulseChargeMs: 280,
        shipScale: 0.8,
        shipBankMultiplier: 1.28,
        shipLiftOffset: -1,
        playerHp: 6,
        shieldPoints: 4,
      };
    case 'tempest':
      return {
        ship,
        moveSpeedPxPerMs: 0.52,
        standardFireCooldownMs: 98,
        pulseChargeMs: 300,
        shipScale: 0.88,
        shipBankMultiplier: 1.2,
        shipLiftOffset: -1,
        playerHp: 7,
        shieldPoints: 4,
      };
    case 'helios':
      return {
        ship,
        moveSpeedPxPerMs: 0.3,
        standardFireCooldownMs: 150,
        pulseChargeMs: 260,
        shipScale: 1.16,
        shipBankMultiplier: 0.92,
        shipLiftOffset: -2,
        playerHp: 7,
        shieldPoints: 5,
      };
    case 'bastion':
      return {
        ship,
        moveSpeedPxPerMs: 0.24,
        standardFireCooldownMs: 168,
        pulseChargeMs: 340,
        shipScale: 1.34,
        shipBankMultiplier: 0.78,
        shipLiftOffset: 2,
        playerHp: 8,
        shieldPoints: 5,
      };
    case 'atlas':
      return {
        ship,
        moveSpeedPxPerMs: 0.22,
        standardFireCooldownMs: 160,
        pulseChargeMs: 380,
        shipScale: 1.46,
        shipBankMultiplier: 0.8,
        shipLiftOffset: 2,
        playerHp: 8,
        shieldPoints: 6,
      };
    case 'nova':
      return {
        ship,
        moveSpeedPxPerMs: 0.34,
        standardFireCooldownMs: 110,
        pulseChargeMs: 240,
        shipScale: 2,
        shipBankMultiplier: 1.08,
        shipLiftOffset: -1,
        playerHp: 9,
        shieldPoints: 6,
      };
    case 'warden':
    default:
      return {
        ship,
        moveSpeedPxPerMs: 0.38,
        standardFireCooldownMs: 130,
        pulseChargeMs: 320,
        shipScale: 1,
        shipBankMultiplier: 1,
        shipLiftOffset: 0,
        playerHp: 5,
        shieldPoints: 3,
      };
  }
}
