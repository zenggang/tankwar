import type { PlayerInputSnapshot } from "../systems/input/touch-controls";

export interface HudState {
  playerHp: number;
  playerMaxHp: number;
  shieldHp: number;
  shieldMaxHp: number;
  weaponBoostActive: boolean;
  weaponBoostUntilMs: number;
  input: PlayerInputSnapshot;
}

export const EMPTY_INPUT: PlayerInputSnapshot = {
  moveX: 0,
  moveY: 0,
  stickIntensity: 0,
  firePressed: false
};

// HUD state intentionally mirrors the player runtime snapshot so HudScene can
// stay as a thin renderer when the main agent wires the scene event bridge.
export const INITIAL_HUD_STATE: HudState = {
  playerHp: 100,
  playerMaxHp: 100,
  shieldHp: 0,
  shieldMaxHp: 50,
  weaponBoostActive: false,
  weaponBoostUntilMs: 0,
  input: EMPTY_INPUT
};
