import Phaser from "phaser";
import { STAGE1_IMAGE_ASSETS } from "../../data/stage1/stage1-assets";
import type { EnemyType } from "../../types/stage";
import { FixedTurret } from "./fixed-turret";
import { GroundEnemy } from "./ground-enemy";
import { ScoutHelicopter } from "./scout-helicopter";

/**
 * Scene code only needs a single union for enemy lifecycle, HP syncing, and
 * projectile targeting, regardless of the concrete actor implementation.
 */
export type EnemyActor = GroundEnemy | FixedTurret | ScoutHelicopter;

/**
 * Builds the correct Stage 1 enemy actor from authored spawn data.
 */
export function spawnEnemyActor(
  scene: Phaser.Scene,
  spec: { type: EnemyType; x: number; y: number }
): EnemyActor {
  switch (spec.type) {
    case "light_tank":
      return new GroundEnemy(
        scene,
        spec.x,
        spec.y,
        STAGE1_IMAGE_ASSETS.units.lightTank.key,
        "light_tank",
        STAGE1_IMAGE_ASSETS.units.lightTankWreck.key
      );
    case "medium_tank":
      return new GroundEnemy(
        scene,
        spec.x,
        spec.y,
        STAGE1_IMAGE_ASSETS.units.mediumTank.key,
        "medium_tank",
        STAGE1_IMAGE_ASSETS.units.mediumTankWreck.key
      );
    case "fixed_turret":
      return new FixedTurret(scene, spec.x, spec.y, {
        baseKey: STAGE1_IMAGE_ASSETS.units.fixedTurretBase.key,
        headKey: STAGE1_IMAGE_ASSETS.units.fixedTurretHead.key,
        wreckKey: STAGE1_IMAGE_ASSETS.units.fixedTurretWreck.key
      });
    case "scout_helicopter":
      return new ScoutHelicopter(
        scene,
        spec.x,
        spec.y,
        STAGE1_IMAGE_ASSETS.units.scoutHelicopter.key,
        STAGE1_IMAGE_ASSETS.units.scoutHelicopterCrash.key
      );
    default:
      /**
       * EnemyType is expected to stay exhaustive; throwing here makes future
       * authored enum drift fail loudly instead of spawning undefined actors.
       */
      throw new Error(`Unsupported enemy type: ${String(spec.type)}`);
  }
}
