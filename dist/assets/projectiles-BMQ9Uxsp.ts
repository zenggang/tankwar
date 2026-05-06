import Phaser from "phaser";

export interface ProjectileVelocity {
  x: number;
  y: number;
}

export interface ProjectileRuntimeShot {
  body: { enable: boolean } | null;
  setActive(active: boolean): ProjectileRuntimeShot;
  setVisible(visible: boolean): ProjectileRuntimeShot;
  setPosition?(x: number, y: number): ProjectileRuntimeShot;
  setVelocity?(x: number, y: number): ProjectileRuntimeShot;
  setRotation?(rotation: number): ProjectileRuntimeShot;
  setDisplaySize?(width: number, height: number): ProjectileRuntimeShot;
  disableBody?(
    disableGameObject: boolean,
    hideGameObject: boolean
  ): ProjectileRuntimeShot;
  x?: number;
  y?: number;
  velocityX?: number;
  velocityY?: number;
  rotation?: number;
}

export interface ProjectileGroupContract {
  get(x: number, y: number): ProjectileRuntimeShot | null | undefined;
}

export interface ProjectileSceneContract<
  TGroup extends ProjectileGroupContract = ProjectileGroupContract
> {
  physics: {
    add: {
      group(config: {
        classType?: Function | null;
        defaultKey: string;
        maxSize: number;
      }): TGroup;
    };
  };
}

export interface ProjectileDisplaySize {
  width: number;
  height: number;
}

/**
 * 把目标向量标准化到固定速度，用于玩家直射和敌人朝向玩家的瞄准开火。
 *
 * 保留四位小数是为了让测试和后续日志更稳定，避免浮点尾差把逻辑断言搞脏。
 */
export function resolveShotVelocity(
  from: { x: number; y: number },
  to: { x: number; y: number },
  speed: number
): ProjectileVelocity {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));

  return {
    x: Number((((dx / length) * speed) || 0).toFixed(4)),
    y: Number((((dy / length) * speed) || 0).toFixed(4))
  };
}

/**
 * 这里保留与 plan 一致的 `group / spawn / recycle` 接口，
 * 但回到真实 Phaser 类型，避免主场景在 overlap / collider 上持续做类型强转。
 */
export class ProjectileSystem<
  TGroup extends ProjectileGroupContract = Phaser.Physics.Arcade.Group
> {
  readonly group: TGroup;
  private readonly displaySize?: ProjectileDisplaySize;

  constructor(
    scene: ProjectileSceneContract<TGroup>,
    textureKey: string,
    displaySize?: ProjectileDisplaySize
  ) {
    this.group = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      defaultKey: textureKey,
      maxSize: 64
    });
    this.displaySize = displaySize;
  }

  private applyPosition(shot: ProjectileRuntimeShot, x: number, y: number): void {
    if (typeof shot.setPosition === "function") {
      shot.setPosition(x, y);
      return;
    }

    shot.x = x;
    shot.y = y;
  }

  private applyVelocity(shot: ProjectileRuntimeShot, x: number, y: number): void {
    if (typeof shot.setVelocity === "function") {
      shot.setVelocity(x, y);
    } else {
      shot.velocityX = x;
      shot.velocityY = y;
    }

    // Projectile art points to the right in source space, so aligning to the
    // velocity vector makes upward shots rotate into a vertical muzzle path.
    const rotation = Math.atan2(y, x);

    if (typeof shot.setRotation === "function") {
      shot.setRotation(rotation);
    } else {
      shot.rotation = rotation;
    }
  }

  spawn(x: number, y: number, velocityX: number, velocityY: number): void {
    const shot = this.group.get(x, y) as ProjectileRuntimeShot | null;

    if (!shot) {
      return;
    }

    shot.setActive(true);
    shot.setVisible(true);
    if (shot.body) {
      shot.body.enable = true;
    }
    this.applyPosition(shot, x, y);
    this.applyVelocity(shot, velocityX, velocityY);

    if (this.displaySize && typeof shot.setDisplaySize === "function") {
      shot.setDisplaySize(this.displaySize.width, this.displaySize.height);
    }
  }

  recycle(shot: ProjectileRuntimeShot): void {
    if (typeof shot.disableBody === "function") {
      shot.disableBody(true, true);
    } else {
      shot.setActive(false);
      shot.setVisible(false);

      if (shot.body) {
        shot.body.enable = false;
      }
    }

    this.applyVelocity(shot, 0, 0);
  }
}
