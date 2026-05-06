export interface PointerPosition {
  x: number;
  y: number;
}

export interface PlayerInputSnapshot {
  moveX: number;
  moveY: number;
  stickIntensity: number;
  firePressed: boolean;
}

export interface KeyboardDigitalState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
}

export interface TouchControlsController {
  beginStick(center: PointerPosition, pointer: PointerPosition): void;
  moveStick(pointer: PointerPosition): void;
  endStick(): void;
  setFirePressed(next: boolean): void;
  snapshot(): PlayerInputSnapshot;
}

function roundAxis(value: number): number {
  return Number(value.toFixed(4));
}

function emptySnapshot(firePressed: boolean): PlayerInputSnapshot {
  return {
    moveX: 0,
    moveY: 0,
    stickIntensity: 0,
    firePressed
  };
}

export function resolveKeyboardInput(state: KeyboardDigitalState): PlayerInputSnapshot {
  const rawX = (state.right ? 1 : 0) - (state.left ? 1 : 0);
  const rawY = (state.down ? 1 : 0) - (state.up ? 1 : 0);
  const moving = rawX !== 0 || rawY !== 0;
  const length = moving ? Math.hypot(rawX, rawY) : 1;

  return {
    moveX: moving ? roundAxis(rawX / length) : 0,
    moveY: moving ? roundAxis(rawY / length) : 0,
    stickIntensity: moving ? 1 : 0,
    firePressed: state.fire
  };
}

export function mergePlayerInput(
  touchInput: PlayerInputSnapshot,
  keyboardInput: PlayerInputSnapshot
): PlayerInputSnapshot {
  const movementSource =
    keyboardInput.stickIntensity > touchInput.stickIntensity ? keyboardInput : touchInput;

  return {
    ...movementSource,
    firePressed: touchInput.firePressed || keyboardInput.firePressed
  };
}

export function createTouchControls(radius: number): TouchControlsController {
  let stickCenter: PointerPosition | null = null;
  let stickPointer: PointerPosition | null = null;
  let firePressed = false;

  function resolveStick(): PlayerInputSnapshot {
    if (!stickCenter || !stickPointer) {
      return emptySnapshot(firePressed);
    }

    // The stick output is normalized first, then scaled by the clamped intensity so
    // the player entity can treat touch and keyboard snapshots through one contract.
    const dx = stickPointer.x - stickCenter.x;
    const dy = stickPointer.y - stickCenter.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const clampedDistance = Math.min(length, radius);
    const intensity = clampedDistance / radius;

    return {
      moveX: roundAxis((dx / length) * intensity),
      moveY: roundAxis((dy / length) * intensity),
      stickIntensity: roundAxis(intensity),
      firePressed
    };
  }

  return {
    beginStick(center: PointerPosition, pointer: PointerPosition): void {
      stickCenter = center;
      stickPointer = pointer;
    },
    moveStick(pointer: PointerPosition): void {
      if (!stickCenter) {
        return;
      }

      stickPointer = pointer;
    },
    endStick(): void {
      stickCenter = null;
      stickPointer = null;
    },
    setFirePressed(next: boolean): void {
      firePressed = next;
    },
    snapshot(): PlayerInputSnapshot {
      return resolveStick();
    }
  };
}
