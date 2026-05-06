/**
 * Stage 1 enemy presets stay centralized so scene orchestration, factories, and
 * tests all read the same authored combat numbers.
 */
export const ENEMY_PRESETS = {
  light_tank: {
    hp: 30,
    speed: 150
  },
  medium_tank: {
    hp: 55,
    speed: 110
  },
  fixed_turret: {
    hp: 40,
    speed: 0
  },
  scout_helicopter: {
    hp: 35,
    speed: 200
  }
} as const;

/**
 * Ground enemies share the same sprite-based implementation while retaining
 * distinct preset keys for tuning.
 */
export type GroundEnemyPresetKey = "light_tank" | "medium_tank";
