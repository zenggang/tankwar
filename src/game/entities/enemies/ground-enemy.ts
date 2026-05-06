import Phaser from "phaser";
import { ENEMY_PRESETS, type GroundEnemyPresetKey } from "./enemy-presets";

/**
 * Generic tracked ground enemy used by light and medium tank variants.
 *
 * The class intentionally keeps combat state small because the scene currently
 * owns wave timing, targeting, projectile spawning, and cleanup orchestration.
 */
export class GroundEnemy extends Phaser.Physics.Arcade.Sprite {
  readonly maxHp: number;
  readonly enemyType: GroundEnemyPresetKey;
  readonly destroyedTextureKey: string;
  hp: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    presetKey: GroundEnemyPresetKey,
    destroyedTextureKey: string
  ) {
    super(scene, x, y, textureKey);

    this.enemyType = presetKey;
    this.maxHp = ENEMY_PRESETS[presetKey].hp;
    this.destroyedTextureKey = destroyedTextureKey;
    this.hp = this.maxHp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const displayWidth = presetKey === "light_tank" ? 92 : 108;
    const displayHeight = presetKey === "light_tank" ? 98 : 110;
    this.setDisplaySize(displayWidth, displayHeight);

    const body = this.body as Phaser.Physics.Arcade.Body;

    /**
     * Enemy actors participate in Arcade overlaps only; explicit body tuning
     * avoids inheriting gravity or being pushed by unrelated world state.
     */
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(displayWidth * 0.72, displayHeight * 0.72);
  }
}
