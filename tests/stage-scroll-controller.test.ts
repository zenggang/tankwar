import { describe, expect, it } from "vitest";
import {
  STAGE1_RUNTIME_DATA,
  createStage1ScrollContract
} from "../src/game/data/stage1/stage1-runtime";

describe("Stage 1 scroll contract", () => {
  it("exposes the scroll bounds a future camera controller must honor", () => {
    const contract = createStage1ScrollContract(1280);

    expect(contract.viewportHeight).toBe(1280);
    expect(contract.stageMaxScrollY).toBe(4120);
    expect(contract.bossLockScrollY).toBe(0);
    expect(contract.playerSpawnY).toBe(STAGE1_RUNTIME_DATA.totalHeight - 240);
  });

  it("keeps the boss arena at the top of the world while earlier segments remain scrollable", () => {
    const contract = createStage1ScrollContract(1280);
    const bossZone = STAGE1_RUNTIME_DATA.zones.find((zone) => zone.key === "boss-arena");

    expect(STAGE1_RUNTIME_DATA.segments[0].worldTopY).toBeGreaterThan(
      STAGE1_RUNTIME_DATA.segments[3].worldTopY
    );
    expect(bossZone?.worldStartY).toBe(80);
    expect(contract.stageMaxScrollY).toBeLessThan(STAGE1_RUNTIME_DATA.totalHeight);
  });
});
