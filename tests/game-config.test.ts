import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../src/game/config";

describe("GAME_CONFIG", () => {
  it("uses a portrait-first mobile canvas", () => {
    expect(GAME_CONFIG.width).toBe(720);
    expect(GAME_CONFIG.height).toBe(1280);
    expect(GAME_CONFIG.backgroundColor).toBe("#090909");
  });

  it("registers the boot, preload, stage, and hud scenes", () => {
    expect(GAME_CONFIG.sceneKeys).toEqual(["boot", "preload", "stage1", "hud"]);
  });
});
