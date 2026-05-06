import Phaser from "phaser";
import { ENEMY_PRESETS } from "./enemy-presets";

export interface FixedTurretTextures {
  baseKey: string;
  headKey: string;
}

/**
 * Fixed turret is modeled as a container so the base and gun head can stay as
 * separate child sprites while the scene treats it as a single hit target.
 */
export class FixedTurret extends Phaser.GameObjects.Container {
  readonly maxHp = ENEMY_PRESETS.fixed_turret.hp;
  readonly destroyedTextureKey: string;
  hp = ENEMY_PRESETS.fixed_turret.hp;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textures: FixedTurretTextures & { wreckKey: string }
  ) {
    const base = scene.add.image(0, 0, textures.baseKey);
    const head = scene.add.image(0, -8, textures.headKey);

    base.setDisplaySize(112, 88);
    head.setDisplaySize(90, 72);

    super(scene, x, y, [base, head]);
    this.destroyedTextureKey = textures.wreckKey;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    /**
     * Containers do not always derive a reliable Arcade hitbox from children,
     * so size is pinned from the visible base art before enabling collisions.
     */
    this.setSize(base.displayWidth || base.width, base.displayHeight || base.height);

    const body = this.body as Phaser.Physics.Arcade.Body;

    body.setSize(this.width * 0.84, this.height * 0.82);
    body.setAllowGravity(false);
    body.setImmovable(true);
  }
}
