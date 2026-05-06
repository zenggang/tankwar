import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => {
  class MockContainer {}
  class MockBody {
    setSize(): this {
      return this;
    }

    setAllowGravity(): this {
      return this;
    }

    setImmovable(): this {
      return this;
    }
  }

  return {
    default: {
      GameObjects: {
        Container: MockContainer
      },
      Physics: {
        Arcade: {
          Body: MockBody
        }
      }
    }
  };
});

import { resolveBossPhase } from "../src/game/entities/boss/fortress-boss";

// Boss phase thresholds are part of Stage 1 authored combat tuning and must stay stable.
describe("resolveBossPhase", () => {
  beforeAll(() => {
    // The phase resolver is pure; mocking Phaser keeps the test focused on tuning
    // thresholds instead of requiring a canvas-capable runtime in Vitest.
  });

  it("keeps phase one while the fortress is still healthy and armed", () => {
    expect(resolveBossPhase({ hpRatio: 0.8, sideCannonsDestroyed: 0 })).toBe("phase_one");
  });

  it("switches to phase two after enough damage or cannon losses", () => {
    expect(resolveBossPhase({ hpRatio: 0.45, sideCannonsDestroyed: 0 })).toBe("phase_two");
    expect(resolveBossPhase({ hpRatio: 0.8, sideCannonsDestroyed: 2 })).toBe("phase_two");
  });
});
