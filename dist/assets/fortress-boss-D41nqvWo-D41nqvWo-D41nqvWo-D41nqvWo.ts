import Phaser from "phaser";
import { STAGE1_IMAGE_ASSETS } from "../../data/stage1/stage1-assets";
import { STAGE1_BOSS_TUNING } from "../../data/stage1/stage1-boss";

export type BossPhase = "phase_one" | "phase_two";

/**
 * Boss phase resolution is kept pure so tests can lock combat thresholds
 * without needing a Phaser runtime.
 */
export function resolveBossPhase(params: {
  hpRatio: number;
  sideCannonsDestroyed: number;
}): BossPhase {
  if (
    params.hpRatio <= STAGE1_BOSS_TUNING.phaseTwoHealthRatio ||
    params.sideCannonsDestroyed >= STAGE1_BOSS_TUNING.sideCannonsRequired
  ) {
    return "phase_two";
  }

  return "phase_one";
}

/**
 * Fortress boss presentation groups the authored layered sprites into one
 * Arcade-compatible target while exposing minimal combat hooks to the scene.
 */
export class FortressBoss extends Phaser.GameObjects.Container {
  hp = STAGE1_BOSS_TUNING.maxHp;
  maxHp = STAGE1_BOSS_TUNING.maxHp;
  sideCannonsDestroyed = 0;

  private readonly intactParts: Phaser.GameObjects.Image[];
  private readonly bodySprite: Phaser.GameObjects.Image;
  private readonly weakpoint: Phaser.GameObjects.Image;
  private readonly damageOverlay: Phaser.GameObjects.Image;
  private readonly wreck: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const body = scene.add.image(0, 0, STAGE1_IMAGE_ASSETS.units.bossBody.key);
    const mainCannon = scene.add.image(0, -24, STAGE1_IMAGE_ASSETS.units.bossMainCannon.key);
    const leftCannon = scene.add.image(-74, 8, STAGE1_IMAGE_ASSETS.units.bossSideCannonLeft.key);
    const rightCannon = scene.add.image(74, 8, STAGE1_IMAGE_ASSETS.units.bossSideCannonRight.key);
    const weakpoint = scene.add
      .image(0, 22, STAGE1_IMAGE_ASSETS.units.bossWeakpoint.key)
      .setVisible(false);
    const damageOverlay = scene.add
      .image(0, 0, STAGE1_IMAGE_ASSETS.units.bossDamageOverlay.key)
      .setVisible(false);
    const wreck = scene.add
      .image(0, 0, STAGE1_IMAGE_ASSETS.units.bossWreck.key)
      .setVisible(false);

    super(scene, x, y, [
      body,
      mainCannon,
      leftCannon,
      rightCannon,
      weakpoint,
      damageOverlay,
      wreck
    ]);

    this.bodySprite = body;
    this.intactParts = [body, mainCannon, leftCannon, rightCannon];
    this.weakpoint = weakpoint;
    this.damageOverlay = damageOverlay;
    this.wreck = wreck;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    /**
     * The boss needs a stable overlap area for player projectiles before any
     * scene-specific behavior is layered on top.
     */
    this.setSize(body.displayWidth || body.width, body.displayHeight || body.height);

    const physicsBody = this.body as Phaser.Physics.Arcade.Body;

    physicsBody.setSize(this.width, this.height);
    physicsBody.setAllowGravity(false);
    physicsBody.setImmovable(true);

    this.syncPresentation();
  }

  /**
   * Applies direct projectile damage and returns whether the boss reached zero
   * HP so the scene can trigger clear-flow presentation exactly once.
   */
  applyHit(amount: number): boolean {
    this.hp = Math.max(0, this.hp - amount);
    this.syncPresentation();

    return this.hp === 0;
  }

  /**
   * Phase-two visuals are intentionally scene-agnostic: once thresholds are met
   * the weakpoint and damage overlay become visible until the boss is destroyed.
   */
  syncPresentation(): void {
    const inPhaseTwo = this.phase === "phase_two" && this.hp > 0;

    this.weakpoint.setVisible(inPhaseTwo);
    this.damageOverlay.setVisible(inPhaseTwo);
  }

  /**
   * Death presentation swaps the intact body visuals for the authored wreck so
   * the stage scene can add explosions without duplicating sprite toggles.
   */
  playDeathPresentation(): void {
    /**
     * All intact layers are hidden together so the authored wreck reads clearly
     * and the scene does not need to know the boss's internal sprite stack.
     */
    for (const part of this.intactParts) {
      part.setVisible(false);
    }

    this.bodySprite.setVisible(false);
    this.damageOverlay.setVisible(false);
    this.weakpoint.setVisible(false);
    this.wreck.setVisible(true);
  }

  get phase(): BossPhase {
    return resolveBossPhase({
      hpRatio: this.hp / this.maxHp,
      sideCannonsDestroyed: this.sideCannonsDestroyed
    });
  }
}
