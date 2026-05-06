import { describe, expect, it } from "vitest";
import { STAGE1_IMAGE_ASSETS } from "../src/game/data/stage1/stage1-assets";
import { STAGE1_RUNTIME_DATA } from "../src/game/data/stage1/stage1-runtime";

describe("STAGE1_RUNTIME_DATA", () => {
  it("reads the landed segment and zone contracts in authored play order", () => {
    expect(STAGE1_RUNTIME_DATA.segments.map((segment) => segment.key)).toEqual([
      "segment-01",
      "segment-02",
      "segment-03",
      "segment-04"
    ]);

    expect(
      STAGE1_RUNTIME_DATA.zones.find((zone) => zone.key === "boss-arena")?.type
    ).toBe("boss");
  });

  it("maps the authored segments into a runtime world that supports upward progression", () => {
    expect(STAGE1_RUNTIME_DATA.segments.map((segment) => segment.worldTopY)).toEqual([
      4000,
      2600,
      1200,
      0
    ]);

    const orderedZones = [...STAGE1_RUNTIME_DATA.zones]
      .sort((left, right) => right.worldStartY - left.worldStartY)
      .map((zone) => zone.key);

    expect(orderedZones).toEqual([
      "opening-lane",
      "roadblock-lane",
      "checkpoint-lock",
      "boss-arena"
    ]);
  });

  it("normalizes the merged prop file and keeps props reachable by segment", () => {
    expect(STAGE1_RUNTIME_DATA.propsBySegment["segment-01"].length).toBeGreaterThan(0);
    expect(
      STAGE1_RUNTIME_DATA.propsBySegment["segment-03"].some((prop) =>
        prop.image.includes("checkpoint-gantry/prop.png")
      )
    ).toBe(true);
  });

  it("registers landed art from the repo assets tree instead of a new public tree", () => {
    expect(STAGE1_IMAGE_ASSETS.map.segment01.url).toContain(
      "/assets/map/stage1/segment-01-base.png"
    );
    expect(STAGE1_IMAGE_ASSETS.ui.fireButton.url).toContain(
      "/assets/ui/stage1/fire-button/fire-button.png"
    );
  });
});
