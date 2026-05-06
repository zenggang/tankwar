import collisionJson from "../../../../data/stage1-collision.json";
import propsJson from "../../../../data/stage1-props.json";
import zonesJson from "../../../../data/stage1-zones.json";
import type {
  Stage1RuntimeData,
  Stage1ScrollContract,
  StageSegmentKey,
  StageZoneType
} from "../../types/stage";
import {
  STAGE1_SEGMENTS,
  normalizeStage1Collisions,
  normalizeStage1Props,
  normalizeStage1Zones
} from "../../utils/stage1-adapter";

const PLAYER_SPAWN_BOTTOM_OFFSET = 240;
const BOSS_LOCK_SEGMENT_KEY = "segment-04";

type RawPropJson = Record<
  string,
  Array<{ id: string; image: string; x: number; y: number; w: number; h: number }>
>;

type RawCollisionJson = Array<{
  key: StageSegmentKey;
  blockers: Array<{ id: string; type: "rect"; x: number; y: number; w: number; h: number }>;
}>;

type RawZoneJson = Array<{
  id: string;
  segment: StageSegmentKey;
  type: StageZoneType;
  x: number;
  y: number;
  w: number;
  h: number;
}>;

// This module is the single runtime translation point from landed JSON contracts into typed game data.
export const STAGE1_RUNTIME_DATA: Stage1RuntimeData = {
  segments: STAGE1_SEGMENTS,
  propsBySegment: normalizeStage1Props(propsJson.segments as RawPropJson),
  collisionBySegment: normalizeStage1Collisions(collisionJson.segments as RawCollisionJson),
  zones: normalizeStage1Zones(zonesJson.zones as RawZoneJson),
  totalHeight: Math.max(
    ...STAGE1_SEGMENTS.map((segment) => segment.worldTopY + segment.pixelHeight)
  )
};

// Future camera work only needs this derived contract instead of re-deriving stage bounds from raw data.
export function createStage1ScrollContract(viewportHeight: number): Stage1ScrollContract {
  const bossLockScrollY =
    STAGE1_RUNTIME_DATA.segments.find((segment) => segment.key === BOSS_LOCK_SEGMENT_KEY)
      ?.worldTopY ?? 0;

  return {
    viewportHeight,
    stageMaxScrollY: Math.max(STAGE1_RUNTIME_DATA.totalHeight - viewportHeight, 0),
    bossLockScrollY,
    playerSpawnY: STAGE1_RUNTIME_DATA.totalHeight - PLAYER_SPAWN_BOTTOM_OFFSET
  };
}
