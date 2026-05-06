import Phaser from "phaser";
import type { DropAffectableState } from "../../systems/combat/drop-effects";
import type { PlayerInputSnapshot } from "../../systems/input/touch-controls";
import type { HudState } from "../../ui/hud-state";

export interface PlayerTankTextures {
  hullKey: string;
  turretKey: string;
  shadowKey: string;
  hitFlashKey: string;
  wreckKey: string;
}

export class PlayerTank extends Phaser.GameObjects.Container {
  hp = 100;
  maxHp = 100;
  shieldHp = 0;
  shieldMaxHp = 50;
  weaponBoostActive = false;
  weaponBoostUntilMs = 0;

  private readonly shadow: Phaser.GameObjects.Image;
  private readonly hull: Phaser.GameObjects.Image;
  private readonly turret: Phaser.GameObjects.Image;
  private readonly hitFlash: Phaser.GameObjects.Image;
  private readonly wreck: Phaser.GameObjects.Image;
  private readonly speed = 240;
  private readonly fireCooldownMs = 260;
  private lastFireTime = -Infinity;

  constructor(scene: Phaser.Scene, x: number, y: number, textures: PlayerTankTextures) {
    const shadow = scene.add.image(0, 10, textures.shadowKey).setAlpha(0.4);
    const wreck = scene.add.image(0, 4, textures.wreckKey).setVisible(false);
    const hull = scene.add.image(0, 0, textures.hullKey);
    const turret = scene.add.image(0, -6, textures.turretKey);
    const hitFlash = scene.add
      .image(0, -2, textures.hitFlashKey)
      .setVisible(false)
      .setAlpha(0.9);
    super(scene, x, y, [shadow, wreck, hull, turret, hitFlash]);

    this.shadow = shadow;
    this.wreck = wreck;
    this.hull = hull;
    this.turret = turret;
    this.hitFlash = hitFlash;

    // Source art is authored at illustration resolution, so normalize it to a
    // mobile-playable runtime footprint before the scene composes anything else.
    shadow.setDisplaySize(136, 84);
    wreck.setDisplaySize(132, 118);
    hull.setDisplaySize(128, 122);
    turret.setDisplaySize(110, 110);
    hitFlash.setDisplaySize(134, 126);

    // The container owns the runtime position while child images preserve the
    // landed layered art, so later combat and HUD systems can treat the player as
    // one actor without duplicating sprite state.
    this.setSize(74, 94);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(70, 88);
    body.setAllowGravity(false);
    body.setCollideWorldBounds(true);
  }

  updateFromInput(input: PlayerInputSnapshot, time: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(input.moveX * this.speed, input.moveY * this.speed);

    // Stage 1 is a straight upward shooter, so the tank always keeps its
    // forward-fire silhouette instead of twisting its turret with movement.
    this.turret.rotation = 0;

    const effectiveCooldown = this.weaponBoostActive ? 140 : this.fireCooldownMs;

    if (input.firePressed && time - this.lastFireTime >= effectiveCooldown) {
      this.lastFireTime = time;
      return true;
    }

    return false;
  }

  playHitFeedback(): void {
    this.hitFlash.setVisible(true);
    this.scene.time.delayedCall(80, () => {
      this.hitFlash.setVisible(false);
    });
  }

  playDeathPresentation(): void {
    this.hull.setVisible(false);
    this.turret.setVisible(false);
    this.hitFlash.setVisible(false);
    this.wreck.setVisible(true);
    this.shadow.setAlpha(0.28);
  }

  /**
   * Drop resolution is calculated outside the entity as a pure function. The
   * player only applies the already-computed state transition here.
   */
  applyDropState(nextState: DropAffectableState): void {
    this.hp = nextState.hp;
    this.shieldHp = nextState.shieldHp;
    this.weaponBoostActive = nextState.weaponBoostActive;
    this.weaponBoostUntilMs = nextState.weaponBoostUntilMs;
  }

  toHudState(input: PlayerInputSnapshot): HudState {
    return {
      playerHp: this.hp,
      playerMaxHp: this.maxHp,
      shieldHp: this.shieldHp,
      shieldMaxHp: this.shieldMaxHp,
      weaponBoostActive: this.weaponBoostActive,
      weaponBoostUntilMs: this.weaponBoostUntilMs,
      input
    };
  }
}
