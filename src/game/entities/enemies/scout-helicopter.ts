import Phaser from "phaser";
import { ENEMY_PRESETS } from "./enemy-presets";

/**
 * Scout helicopter enters with a horizontal strafe so Stage 1 gets a distinct
 * flying threat without requiring extra scene-side movement logic.
 */
export class ScoutHelicopter extends Phaser.Physics.Arcade.Sprite {
  readonly maxHp = ENEMY_PRESETS.scout_helicopter.hp;
  readonly destroyedTextureKey: string;
  hp = ENEMY_PRESETS.scout_helicopter.hp;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    destroyedTextureKey: string
  ) {
    super(scene, x, y, textureKey);

    this.destroyedTextureKey = destroyedTextureKey;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDisplaySize(118, 98);

    const body = this.body as Phaser.Physics.Arcade.Body;

    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(86, 64);

    /**
     * The authored plan expects the helicopter to sweep laterally across the
     * portrait playfield on spawn.
     */
    this.setVelocityX(-ENEMY_PRESETS.scout_helicopter.speed);
  }
}
