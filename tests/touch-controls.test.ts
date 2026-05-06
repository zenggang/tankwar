import { describe, expect, it } from "vitest";
import {
  createTouchControls,
  mergePlayerInput,
  resolveKeyboardInput
} from "../src/game/systems/input/touch-controls";
import { EMPTY_INPUT, INITIAL_HUD_STATE } from "../src/game/ui/hud-state";

describe("createTouchControls", () => {
  it("clamps stick magnitude to 1 and preserves the fire state", () => {
    const controls = createTouchControls(72);
    controls.beginStick({ x: 104, y: 1112 }, { x: 220, y: 1260 });
    controls.setFirePressed(true);

    const snapshot = controls.snapshot();

    expect(snapshot.moveX).toBeLessThanOrEqual(1);
    expect(snapshot.moveY).toBeLessThanOrEqual(1);
    expect(snapshot.stickIntensity).toBeLessThanOrEqual(1);
    expect(snapshot.firePressed).toBe(true);
  });

  it("resets movement after the stick ends", () => {
    const controls = createTouchControls(72);
    controls.beginStick({ x: 104, y: 1112 }, { x: 140, y: 1080 });
    controls.endStick();

    expect(controls.snapshot()).toEqual(EMPTY_INPUT);
  });
});

describe("resolveKeyboardInput", () => {
  it("maps debug keyboard input to the same player snapshot contract", () => {
    const snapshot = resolveKeyboardInput({
      left: true,
      right: false,
      up: true,
      down: false,
      fire: true
    });

    expect(snapshot.moveX).toBeLessThan(0);
    expect(snapshot.moveY).toBeLessThan(0);
    expect(snapshot.stickIntensity).toBe(1);
    expect(snapshot.firePressed).toBe(true);
  });
});

describe("mergePlayerInput", () => {
  it("prefers the stronger movement source and unions fire input", () => {
    const merged = mergePlayerInput(
      {
        moveX: 0.2,
        moveY: -0.1,
        stickIntensity: 0.25,
        firePressed: false
      },
      {
        moveX: -1,
        moveY: 0,
        stickIntensity: 1,
        firePressed: true
      }
    );

    expect(merged).toEqual({
      moveX: -1,
      moveY: 0,
      stickIntensity: 1,
      firePressed: true
    });
  });
});

describe("INITIAL_HUD_STATE", () => {
  it("starts from the default player and input values used by the overlay", () => {
    expect(INITIAL_HUD_STATE).toEqual({
      playerHp: 100,
      playerMaxHp: 100,
      shieldHp: 0,
      shieldMaxHp: 50,
      weaponBoostActive: false,
      weaponBoostUntilMs: 0,
      input: EMPTY_INPUT
    });
  });
});
