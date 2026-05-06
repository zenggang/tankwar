import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => {
  class MockImage {}

  return {
    default: {
      Physics: {
        Arcade: {
          Image: MockImage
        }
      }
    }
  };
});

import { applyDamage } from "../src/game/systems/combat/health";
import {
  ProjectileSystem,
  resolveShotVelocity
} from "../src/game/systems/combat/projectiles";

interface FakeProjectile {
  active: boolean;
  visible: boolean;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  body: { enable: boolean };
  setActive(active: boolean): FakeProjectile;
  setVisible(visible: boolean): FakeProjectile;
  setPosition(x: number, y: number): FakeProjectile;
  setVelocity(x: number, y: number): FakeProjectile;
  disableBody(disableGameObject: boolean, hideGameObject: boolean): FakeProjectile;
}

function createFakeProjectile(): FakeProjectile {
  return {
    active: false,
    visible: false,
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    body: { enable: false },
    setActive(active) {
      this.active = active;
      return this;
    },
    setVisible(visible) {
      this.visible = visible;
      return this;
    },
    setPosition(x, y) {
      this.x = x;
      this.y = y;
      return this;
    },
    setVelocity(x, y) {
      this.velocityX = x;
      this.velocityY = y;
      return this;
    },
    disableBody() {
      this.active = false;
      this.visible = false;
      this.body.enable = false;
      return this;
    }
  };
}

function createProjectileHarness() {
  const shot = createFakeProjectile();

  return {
    shot,
    scene: {
      physics: {
        add: {
          group() {
            return {
              get() {
                return shot;
              }
            };
          }
        }
      }
    }
  };
}

describe("enemy fire and player damage", () => {
  it("fires toward the player using a positive Y velocity when the player is below", () => {
    const velocity = resolveShotVelocity(
      { x: 320, y: 1800 },
      { x: 360, y: 2400 },
      280
    );

    expect(velocity.y).toBeGreaterThan(0);
  });

  it("marks the player as destroyed when incoming damage exceeds remaining hp", () => {
    const result = applyDamage({ hp: 20, shieldHp: 0 }, { amount: 30 });

    expect(result.destroyed).toBe(true);
    expect(result.hp).toBe(0);
  });

  it("arms and recycles projectiles through the shared group contract", () => {
    const harness = createProjectileHarness();
    const system = new ProjectileSystem(harness.scene, "projectile-trail");

    system.spawn(128, 256, -40, 180);

    expect(harness.shot.active).toBe(true);
    expect(harness.shot.visible).toBe(true);
    expect(harness.shot.body.enable).toBe(true);
    expect(harness.shot.x).toBe(128);
    expect(harness.shot.y).toBe(256);
    expect(harness.shot.velocityX).toBe(-40);
    expect(harness.shot.velocityY).toBe(180);

    system.recycle(harness.shot);

    expect(harness.shot.active).toBe(false);
    expect(harness.shot.visible).toBe(false);
    expect(harness.shot.body.enable).toBe(false);
    expect(harness.shot.velocityX).toBe(0);
    expect(harness.shot.velocityY).toBe(0);
  });
});
