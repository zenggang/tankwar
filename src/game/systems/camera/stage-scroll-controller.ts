import type { Stage1ScrollContract } from "../../types/stage";

export interface ScrollControllerState {
  playerWorldY: number;
  bossArenaLocked: boolean;
}

export interface StageScrollController {
  resolveCameraY(state: ScrollControllerState): number;
}

/**
 * Scroll resolution is kept pure so Stage 1 camera behavior can be verified
 * without a Phaser runtime. The controller only consumes the derived contract
 * from runtime data, not raw JSON or scene internals.
 */
export function createStageScrollController(
  contract: Stage1ScrollContract
): StageScrollController {
  return {
    resolveCameraY(state: ScrollControllerState): number {
      if (state.bossArenaLocked) {
        return contract.bossLockScrollY;
      }

      const desired = state.playerWorldY - contract.viewportHeight * 0.65;
      return Math.max(0, Math.min(desired, contract.stageMaxScrollY));
    }
  };
}
