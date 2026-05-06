import { describe, expect, it } from "vitest";
import rawZones from "../data/stage1-zones.json";
import { STAGE1_BOSS_TUNING } from "../src/game/data/stage1/stage1-boss";
import { STAGE1_SPAWN_PLAN } from "../src/game/data/stage1/stage1-spawns";
import {
  createStageDirector,
  type StageZoneRect
} from "../src/game/systems/stage-director";
import type { StageSegmentKey, StageZoneType } from "../src/game/types/stage";

const STAGE1_SEGMENT_WORLD_TOPS = {
  "segment-01": 4000,
  "segment-02": 2600,
  "segment-03": 1200,
  "segment-04": 0
} as const satisfies Record<StageSegmentKey, number>;

interface RawZoneRecord {
  id: string;
  segment: StageSegmentKey;
  type: StageZoneType;
  x: number;
  y: number;
  w: number;
  h: number;
}

function createWorldZones(): StageZoneRect[] {
  return (rawZones.zones as RawZoneRecord[]).map((zone) => ({
    key: zone.id,
    segmentKey: zone.segment,
    type: zone.type,
    x: zone.x,
    y: zone.y,
    w: zone.w,
    h: zone.h,
    worldStartY: STAGE1_SEGMENT_WORLD_TOPS[zone.segment] + zone.y,
    worldEndY: STAGE1_SEGMENT_WORLD_TOPS[zone.segment] + zone.y + zone.h
  }));
}

describe("createStageDirector", () => {
  it("triggers zones in opening -> roadblock -> checkpoint -> boss order during upward progression", () => {
    const director = createStageDirector({
      zones: createWorldZones(),
      spawnPlan: STAGE1_SPAWN_PLAN
    });

    const triggered = [5200, 4800, 3500, 2100, 900].flatMap((playerWorldY) =>
      director.update({
        playerWorldY,
        randomValue: 0.2
      })
    );

    const uniqueZoneKeys = triggered
      .map((command) => command.zoneKey)
      .filter((zoneKey, index, all) => all.indexOf(zoneKey) === index);

    expect(uniqueZoneKeys).toEqual([
      "opening-lane",
      "roadblock-lane",
      "checkpoint-lock",
      "boss-arena"
    ]);
  });

  it("emits concrete commands only once per zone even if the player re-enters it later", () => {
    const director = createStageDirector({
      zones: createWorldZones(),
      spawnPlan: STAGE1_SPAWN_PLAN
    });

    director.update({
      playerWorldY: 4800,
      randomValue: 0.2
    });

    expect(
      director.update({
        playerWorldY: 4700,
        randomValue: 0.2
      })
    ).toEqual([]);
  });

  it("spawns authored drops and boss lock commands from the correct zones", () => {
    const director = createStageDirector({
      zones: createWorldZones(),
      spawnPlan: STAGE1_SPAWN_PLAN
    });

    director.update({
      playerWorldY: 4800,
      randomValue: 0.1
    });

    const roadblockCommands = director.update({
      playerWorldY: 3500,
      randomValue: 0.2
    });
    const checkpointCommands = director.update({
      playerWorldY: 2100,
      randomValue: 0.8
    });
    const bossCommands = director.update({
      playerWorldY: 900,
      randomValue: 0.5
    });

    expect(roadblockCommands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spawn-drop",
          zoneKey: "roadblock-lane",
          dropType: "shield_battery"
        })
      ])
    );
    expect(checkpointCommands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spawn-drop",
          zoneKey: "checkpoint-lock",
          dropType: "weapon_boost"
        })
      ])
    );
    expect(bossCommands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "lock-boss-arena",
          zoneKey: "boss-arena"
        })
      ])
    );
  });
});

describe("STAGE1_BOSS_TUNING", () => {
  it("keeps the stage one boss lock and phase-two threshold aligned with the plan", () => {
    expect(STAGE1_BOSS_TUNING.maxHp).toBe(320);
    expect(STAGE1_BOSS_TUNING.phaseTwoHealthRatio).toBe(0.5);
    expect(STAGE1_BOSS_TUNING.sideCannonsRequired).toBe(2);
    expect(STAGE1_BOSS_TUNING.arenaLockScrollY).toBe(0);
  });
});
