import { HANGAR_SHIPS, type HangarShip } from '@/components/game/hangar-data';

export type ShipGameplayProfile = {
  ship: HangarShip;
  moveStep: number;
  standardFireCooldownMs: number;
  pulseChargeMs: number;
  shipScale: number;
  shipBankMultiplier: number;
  shipLiftOffset: number;
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
        moveStep: 30,
        standardFireCooldownMs: 106,
        pulseChargeMs: 360,
        shipScale: 0.97,
        shipBankMultiplier: 1.15,
        shipLiftOffset: 0,
      };
    case 'helios':
      return {
        ship,
        moveStep: 22,
        standardFireCooldownMs: 150,
        pulseChargeMs: 260,
        shipScale: 1.05,
        shipBankMultiplier: 0.92,
        shipLiftOffset: -2,
      };
    case 'atlas':
      return {
        ship,
        moveStep: 20,
        standardFireCooldownMs: 160,
        pulseChargeMs: 380,
        shipScale: 1.1,
        shipBankMultiplier: 0.8,
        shipLiftOffset: 2,
      };
    case 'tempest':
      return {
        ship,
        moveStep: 32,
        standardFireCooldownMs: 98,
        pulseChargeMs: 300,
        shipScale: 0.95,
        shipBankMultiplier: 1.2,
        shipLiftOffset: -1,
      };
    case 'bastion':
      return {
        ship,
        moveStep: 18,
        standardFireCooldownMs: 168,
        pulseChargeMs: 340,
        shipScale: 1.12,
        shipBankMultiplier: 0.78,
        shipLiftOffset: 2,
      };
    case 'warden':
    default:
      return {
        ship,
        moveStep: 24,
        standardFireCooldownMs: 130,
        pulseChargeMs: 320,
        shipScale: 1,
        shipBankMultiplier: 1,
        shipLiftOffset: 0,
      };
  }
}
