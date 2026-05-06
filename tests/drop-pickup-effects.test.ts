import { describe, expect, it } from "vitest";
import { applyDropPickup } from "../src/game/systems/combat/drop-effects";

describe("applyDropPickup", () => {
  it("heals the player without exceeding max hp", () => {
    const result = applyDropPickup(
      {
        hp: 70,
        maxHp: 100,
        shieldHp: 0,
        shieldMaxHp: 50,
        weaponBoostActive: false,
        weaponBoostUntilMs: 0
      },
      "repair_kit",
      5000
    );

    expect(result.hp).toBe(100);
  });

  it("activates timed weapon boost and adds shield when appropriate", () => {
    const weaponBoost = applyDropPickup(
      {
        hp: 100,
        maxHp: 100,
        shieldHp: 0,
        shieldMaxHp: 50,
        weaponBoostActive: false,
        weaponBoostUntilMs: 0
      },
      "weapon_boost",
      5000
    );

    const shield = applyDropPickup(
      {
        hp: 100,
        maxHp: 100,
        shieldHp: 10,
        shieldMaxHp: 50,
        weaponBoostActive: false,
        weaponBoostUntilMs: 0
      },
      "shield_battery",
      5000
    );

    expect(weaponBoost.weaponBoostActive).toBe(true);
    expect(weaponBoost.weaponBoostUntilMs).toBe(13000);
    expect(shield.shieldHp).toBe(50);
  });
});
