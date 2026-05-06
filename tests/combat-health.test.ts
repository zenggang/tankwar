import { describe, expect, it } from "vitest";
import { applyDamage } from "../src/game/systems/combat/health";

describe("applyDamage", () => {
  it("consumes shield before health", () => {
    const result = applyDamage(
      { hp: 100, shieldHp: 20 },
      { amount: 30 }
    );

    expect(result.shieldHp).toBe(0);
    expect(result.hp).toBe(90);
    expect(result.destroyed).toBe(false);
  });

  it("clamps health at zero when damage exceeds the remaining pool", () => {
    const result = applyDamage(
      { hp: 12, shieldHp: 5 },
      { amount: 40 }
    );

    expect(result.shieldHp).toBe(0);
    expect(result.hp).toBe(0);
    expect(result.destroyed).toBe(true);
  });
});
