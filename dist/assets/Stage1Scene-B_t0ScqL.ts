import Phaser from "phaser";
import { STAGE1_IMAGE_ASSETS } from "../data/stage1/stage1-assets";
import { STAGE1_BOSS_TUNING } from "../data/stage1/stage1-boss";
import {
  STAGE1_RUNTIME_DATA,
  createStage1ScrollContract
} from "../data/stage1/stage1-runtime";
import { STAGE1_SPAWN_PLAN } from "../data/stage1/stage1-spawns";
import { FortressBoss } from "../entities/boss/fortress-boss";
import { spawnEnemyActor, type EnemyActor } from "../entities/enemies/enemy-factory";
import { PlayerTank } from "../entities/player/player-tank";
import { applyDropPickup } from "../systems/combat/drop-effects";
import { applyDamage } from "../systems/combat/health";
import { ProjectileSystem, resolveShotVelocity } from "../systems/combat/projectiles";
import { createStageScrollController } from "../systems/camera/stage-scroll-controller";
import { createStageDirector } from "../systems/stage-director";
import {
  createTouchControls,
  mergePlayerInput,
  resolveKeyboardInput
} from "../systems/input/touch-controls";
import { repoPathToTextureKey } from "../utils/stage1-adapter";
import { HealthBar } from "../ui/health-bar";

type SpawnedDrop = Phaser.Physics.Arcade.Image & {
  dropType: "repair_kit" | "weapon_boost" | "shield_battery";
};

type DestroyableActor = EnemyActor & {
  destroyedTextureKey?: string;
  displayWidth?: number;
  displayHeight?: number;
  width?: number;
  height?: number;
};

/**
 * Stage1Scene owns all world-space orchestration:
 * - landed segment and prop placement
 * - player movement and fire
 * - enemy spawning and return fire
 * - drop pickup resolution
 * - boss lifecycle and stage clear
 *
 * Comments stay explicit here because this scene is the hottest integration point in the game.
 */
export class Stage1Scene extends Phaser.Scene {
  private static readonly PLAYER_PROJECTILE_SIZE = {
    width: 58,
    height: 18
  };
  private static readonly ENEMY_PROJECTILE_SIZE = {
    width: 52,
    height: 16
  };
  private static readonly DROP_SIZE = 56;
  private static readonly PICKUP_FX_SIZE = 72;
  private static readonly HIT_FX_SIZE = 44;
  private static readonly EXPLOSION_SIZE = 80;
  private static readonly BOSS_EXPLOSION_SIZE = 148;

  private bossArenaLocked = false;
  private stageCleared = false;
  private playerDead = false;

  private staticWalls!: Phaser.Physics.Arcade.StaticGroup;
  private enemyHitTargets!: Phaser.Physics.Arcade.Group;
  private dropGroup!: Phaser.Physics.Arcade.Group;

  private player!: PlayerTank;
  private boss?: FortressBoss;
  private playerProjectiles!: ProjectileSystem;
  private enemyProjectiles!: ProjectileSystem;
  private debugKeys!: Record<string, Phaser.Input.Keyboard.Key>;

  private readonly enemies: EnemyActor[] = [];
  private readonly enemyBars: Array<{ actor: EnemyActor; bar: HealthBar }> = [];
  private readonly stickCenter = { x: 104, y: 1112 };
  private readonly fireButtonCenter = new Phaser.Geom.Circle(604, 1112, 72);
  private readonly controls = createTouchControls(72);
  private readonly director = createStageDirector({
    zones: STAGE1_RUNTIME_DATA.zones,
    spawnPlan: STAGE1_SPAWN_PLAN
  });

  private readonly scrollController = createStageScrollController(
    createStage1ScrollContract(1280)
  );

  constructor() {
    super("stage1");
  }

  private addEnemyHealthBar(actor: EnemyActor): void {
    const bar = new HealthBar(
      this,
      actor.x - 28,
      actor.y - 48,
      STAGE1_IMAGE_ASSETS.ui.enemyHealthBar.key,
      44,
      0xe06d6d
    );

    this.enemyBars.push({ actor, bar });
  }

  /**
   * Enemy death must clean both the actor and its paired HUD bar.
   * Keeping the lookup centralized avoids stale HUD objects after combat.
   */
  private removeEnemy(actor: EnemyActor): void {
    const destroyableActor = actor as DestroyableActor;

    const barIndex = this.enemyBars.findIndex((entry) => entry.actor === actor);
    if (barIndex >= 0) {
      this.enemyBars[barIndex].bar.destroy();
      this.enemyBars.splice(barIndex, 1);
    }

    const enemyIndex = this.enemies.indexOf(actor);
    if (enemyIndex >= 0) {
      this.enemies.splice(enemyIndex, 1);
    }

    if (destroyableActor.destroyedTextureKey) {
      const wreckWidth =
        destroyableActor.displayWidth ?? destroyableActor.width ?? 96;
      const wreckHeight =
        destroyableActor.displayHeight ?? destroyableActor.height ?? 96;

      this.add
        .image(actor.x, actor.y, destroyableActor.destroyedTextureKey)
        .setDisplaySize(wreckWidth, wreckHeight);
    }

    actor.destroy();
  }

  private spawnEnemy(spec: {
    type: "light_tank" | "medium_tank" | "fixed_turret" | "scout_helicopter";
    x: number;
    y: number;
  }): void {
    const actor = spawnEnemyActor(this, spec);
    this.enemies.push(actor);
    this.enemyHitTargets.add(actor as unknown as Phaser.GameObjects.GameObject);
    this.addEnemyHealthBar(actor);
  }

  private spawnDrop(dropType: "repair_kit" | "weapon_boost" | "shield_battery", zoneKey: string): void {
    const zone = STAGE1_RUNTIME_DATA.zones.find((entry) => entry.key === zoneKey);
    if (!zone) {
      return;
    }

    const textureKey =
      dropType === "repair_kit"
        ? STAGE1_IMAGE_ASSETS.drops.repairKit.key
        : dropType === "weapon_boost"
          ? STAGE1_IMAGE_ASSETS.drops.weaponBoost.key
          : STAGE1_IMAGE_ASSETS.drops.shieldBattery.key;

    const drop = this.dropGroup.create(
      zone.x + zone.w / 2,
      zone.worldStartY + zone.h / 2,
      textureKey
    ) as SpawnedDrop;
    drop.dropType = dropType;
    drop.setAlpha(0.96);
    drop.setDisplaySize(Stage1Scene.DROP_SIZE, Stage1Scene.DROP_SIZE);
  }

  /**
   * Boss spawning is deferred until the director reaches the boss zone.
   * The overlap is registered here so boss hit handling stays close to boss lifecycle logic.
   */
  private spawnBoss(): void {
    if (this.boss) {
      return;
    }

    this.bossArenaLocked = true;
    this.boss = new FortressBoss(this, 360, 600);
    this.events.emit("boss-start", {
      hp: this.boss.hp,
      maxHp: this.boss.maxHp,
      phase: this.boss.phase
    });

    this.physics.add.existing(this.boss);
    this.physics.add.overlap(this.playerProjectiles.group, this.boss, (shotObject) => {
      const shot = shotObject as Phaser.Physics.Arcade.Image;
      if (!this.boss || this.stageCleared) {
        return;
      }

      const destroyed = this.boss.applyHit(14);
      this.playerProjectiles.recycle(shot);
      this.add
        .image(this.boss.x, this.boss.y - 18, STAGE1_IMAGE_ASSETS.fx.hitSpark.key)
        .setDisplaySize(Stage1Scene.HIT_FX_SIZE, Stage1Scene.HIT_FX_SIZE)
        .setAlpha(0.92);
      this.events.emit("boss-health-sync", {
        hp: this.boss.hp,
        maxHp: this.boss.maxHp,
        phase: this.boss.phase
      });

      if (destroyed) {
        this.stageCleared = true;
        this.bossArenaLocked = false;
        this.boss.playDeathPresentation();
        this.add
          .image(this.boss.x, this.boss.y, STAGE1_IMAGE_ASSETS.fx.explosionBoss.key)
          .setDisplaySize(
            Stage1Scene.BOSS_EXPLOSION_SIZE,
            Stage1Scene.BOSS_EXPLOSION_SIZE
          )
          .setAlpha(0.98);
        this.time.delayedCall(500, () => {
          this.events.emit("stage-clear");
        });
      }
    });
  }

  /**
   * Registers all recurring overlaps and timers that the scene needs once the world is live.
   */
  private registerCombatHooks(): void {
    this.physics.add.overlap(this.playerProjectiles.group, this.enemyHitTargets, (shotObject, enemyObject) => {
      const shot = shotObject as Phaser.Physics.Arcade.Image;
      const actor = enemyObject as unknown as EnemyActor;
      const result = applyDamage({ hp: actor.hp, shieldHp: 0 }, { amount: 18 });

      actor.hp = result.hp;
      this.add
        .image(actor.x, actor.y, STAGE1_IMAGE_ASSETS.fx.hitSpark.key)
        .setDisplaySize(Stage1Scene.HIT_FX_SIZE, Stage1Scene.HIT_FX_SIZE)
        .setAlpha(0.92);
      this.playerProjectiles.recycle(shot);

      if (result.destroyed) {
        this.add
          .image(actor.x, actor.y, STAGE1_IMAGE_ASSETS.fx.explosionMedium.key)
          .setDisplaySize(Stage1Scene.EXPLOSION_SIZE, Stage1Scene.EXPLOSION_SIZE)
          .setAlpha(0.96);
        this.removeEnemy(actor);
      }
    });

    this.physics.add.overlap(this.enemyProjectiles.group, this.player, (shotObject) => {
      const shot = shotObject as Phaser.Physics.Arcade.Image;
      const result = applyDamage(
        { hp: this.player.hp, shieldHp: this.player.shieldHp },
        { amount: 12 }
      );

      this.player.hp = result.hp;
      this.player.shieldHp = result.shieldHp;
      this.enemyProjectiles.recycle(shot);
      this.add
        .image(this.player.x, this.player.y, STAGE1_IMAGE_ASSETS.fx.shieldHit.key)
        .setDisplaySize(Stage1Scene.HIT_FX_SIZE, Stage1Scene.HIT_FX_SIZE)
        .setAlpha(0.92);

      if (result.destroyed && !this.playerDead) {
        this.playerDead = true;
        this.player.playDeathPresentation();
        this.add
          .image(this.player.x, this.player.y, STAGE1_IMAGE_ASSETS.fx.explosionMedium.key)
          .setDisplaySize(Stage1Scene.EXPLOSION_SIZE, Stage1Scene.EXPLOSION_SIZE)
          .setAlpha(0.96);
        this.events.emit("player-dead");
      } else {
        this.player.playHitFeedback();
      }
    });

    this.physics.add.overlap(this.player, this.dropGroup, (_, dropObject) => {
      const drop = dropObject as SpawnedDrop;
      const nextState = applyDropPickup(
        {
          hp: this.player.hp,
          maxHp: this.player.maxHp,
          shieldHp: this.player.shieldHp,
          shieldMaxHp: this.player.shieldMaxHp,
          weaponBoostActive: this.player.weaponBoostActive,
          weaponBoostUntilMs: this.player.weaponBoostUntilMs
        },
        drop.dropType,
        this.time.now
      );

      this.player.applyDropState(nextState);

      const pickupTextureKey =
        drop.dropType === "repair_kit"
          ? STAGE1_IMAGE_ASSETS.drops.repairKitPickupFx.key
          : drop.dropType === "weapon_boost"
            ? STAGE1_IMAGE_ASSETS.drops.weaponBoostPickupFx.key
            : STAGE1_IMAGE_ASSETS.drops.shieldBatteryPickupFx.key;

      this.add
        .image(drop.x, drop.y, pickupTextureKey)
        .setDisplaySize(Stage1Scene.PICKUP_FX_SIZE, Stage1Scene.PICKUP_FX_SIZE)
        .setAlpha(0.96);
      drop.destroy();
      this.emitHudSync(this.resolveInputSnapshot());
    });

    this.time.addEvent({
      delay: 1400,
      loop: true,
      callback: () => {
        if (this.playerDead || this.stageCleared) {
          return;
        }

        for (const enemy of this.enemies) {
          const velocity = resolveShotVelocity(
            { x: enemy.x, y: enemy.y },
            { x: this.player.x, y: this.player.y },
            280
          );

          this.enemyProjectiles.spawn(enemy.x, enemy.y + 12, velocity.x, velocity.y);
        }
      }
    });
  }

  /**
   * Mobile touch remains the primary input path.
   * Keyboard is deliberately debug-only to speed up local verification and CI-adjacent manual checks.
   */
  private registerInputHooks(): void {
    this.debugKeys = this.input.keyboard?.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE"
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.addPointer(2);

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.x <= 240) {
        this.controls.beginStick(this.stickCenter, { x: pointer.x, y: pointer.y });
      }

      if (Phaser.Geom.Circle.Contains(this.fireButtonCenter, pointer.x, pointer.y)) {
        this.controls.setFirePressed(true);
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.x <= 240) {
        this.controls.moveStick({ x: pointer.x, y: pointer.y });
      }

      if (pointer.isDown) {
        this.controls.setFirePressed(Phaser.Geom.Circle.Contains(this.fireButtonCenter, pointer.x, pointer.y));
      }
    });

    this.input.on("pointerup", () => {
      this.controls.endStick();
      this.controls.setFirePressed(false);
    });
  }

  private resolveInputSnapshot() {
    const touchInput = this.controls.snapshot();
    const keyboardInput = resolveKeyboardInput({
      left: this.debugKeys.A.isDown || this.debugKeys.LEFT.isDown,
      right: this.debugKeys.D.isDown || this.debugKeys.RIGHT.isDown,
      up: this.debugKeys.W.isDown || this.debugKeys.UP.isDown,
      down: this.debugKeys.S.isDown || this.debugKeys.DOWN.isDown,
      fire: this.debugKeys.SPACE.isDown
    });

    return mergePlayerInput(touchInput, keyboardInput);
  }

  private emitHudSync(input: ReturnType<Stage1Scene["resolveInputSnapshot"]>): void {
    this.events.emit("hud-sync", this.player.toHudState(input));
  }

  /**
   * The landed data is adapted into world coordinates before it reaches the scene.
   * Scene placement therefore trusts worldTopY and never re-derives segment order by itself.
   */
  create(): void {
    this.staticWalls = this.physics.add.staticGroup();
    this.enemyHitTargets = this.physics.add.group();
    this.dropGroup = this.physics.add.group();

    for (const segment of STAGE1_RUNTIME_DATA.segments) {
      this.add
        .image(360, segment.worldTopY + segment.pixelHeight / 2, repoPathToTextureKey(segment.mapRepoPath))
        .setOrigin(0.5, 0.5);

      for (const prop of STAGE1_RUNTIME_DATA.propsBySegment[segment.key]) {
        this.add
          .image(prop.x + prop.w / 2, segment.worldTopY + prop.y + prop.h / 2, prop.textureKey)
          .setDisplaySize(prop.w, prop.h);
      }

      for (const blocker of STAGE1_RUNTIME_DATA.collisionBySegment[segment.key]) {
        const wall = this.add.rectangle(
          blocker.x + blocker.w / 2,
          segment.worldTopY + blocker.y + blocker.h / 2,
          blocker.w,
          blocker.h,
          0x000000,
          0
        );

        this.physics.add.existing(wall, true);
        this.staticWalls.add(wall);
      }
    }

    this.physics.world.setBounds(0, 0, 720, STAGE1_RUNTIME_DATA.totalHeight);
    this.cameras.main.setBounds(0, 0, 720, STAGE1_RUNTIME_DATA.totalHeight);

    this.player = new PlayerTank(this, 360, STAGE1_RUNTIME_DATA.totalHeight - 240, {
      hullKey: STAGE1_IMAGE_ASSETS.units.playerHull.key,
      turretKey: STAGE1_IMAGE_ASSETS.units.playerTurret.key,
      shadowKey: STAGE1_IMAGE_ASSETS.units.playerShadow.key,
      hitFlashKey: STAGE1_IMAGE_ASSETS.units.playerHitFlash.key,
      wreckKey: STAGE1_IMAGE_ASSETS.units.playerWreck.key
    });

    this.playerProjectiles = new ProjectileSystem(
      this,
      STAGE1_IMAGE_ASSETS.fx.projectileTrail.key,
      Stage1Scene.PLAYER_PROJECTILE_SIZE
    );
    this.enemyProjectiles = new ProjectileSystem(
      this,
      STAGE1_IMAGE_ASSETS.fx.projectileTrail.key,
      Stage1Scene.ENEMY_PROJECTILE_SIZE
    );
    this.physics.add.collider(this.player, this.staticWalls);

    this.registerCombatHooks();
    this.registerInputHooks();
  }

  /**
   * Every frame keeps gameplay flow deterministic:
   * 1. expire timed state
   * 2. resolve unified input
   * 3. drive player fire
   * 4. advance director
   * 5. refresh UI mirrors
   * 6. move camera
   */
  update(time: number): void {
    if (this.stageCleared || this.playerDead) {
      return;
    }

    if (this.player.weaponBoostActive && time >= this.player.weaponBoostUntilMs) {
      this.player.weaponBoostActive = false;
      this.player.weaponBoostUntilMs = 0;
    }

    const input = this.resolveInputSnapshot();
    const fireRequested = this.player.updateFromInput(input, time);

    if (fireRequested) {
      this.playerProjectiles.spawn(this.player.x, this.player.y - 40, 0, -420);
      if (this.player.weaponBoostActive) {
        this.playerProjectiles.spawn(this.player.x - 12, this.player.y - 36, -40, -420);
        this.playerProjectiles.spawn(this.player.x + 12, this.player.y - 36, 40, -420);
      }
    }

    for (const command of this.director.update({
      playerWorldY: this.player.y,
      randomValue: Math.random()
    })) {
      switch (command.kind) {
        case "spawn-wave":
          for (const spawn of command.spawns) {
            this.time.delayedCall(spawn.delayMs, () => {
              this.spawnEnemy(spawn);
            });
          }
          break;
        case "spawn-drop":
          this.spawnDrop(command.dropType, command.zoneKey);
          break;
        case "lock-boss-arena":
          this.spawnBoss();
          break;
      }
    }

    for (const entry of this.enemyBars) {
      entry.bar.setPosition(entry.actor.x - 28, entry.actor.y - 48);
      entry.bar.sync(entry.actor.hp, entry.actor.maxHp);
    }

    const cameraY = this.scrollController.resolveCameraY({
      playerWorldY: this.player.y,
      bossArenaLocked: this.bossArenaLocked
    });
    this.cameras.main.scrollY = cameraY;

    this.emitHudSync(input);
  }
}
