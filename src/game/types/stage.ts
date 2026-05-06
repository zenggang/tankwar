// Stage 1 uses fixed authored segment ids, so the runtime treats them as a closed union.
export type StageSegmentKey = "segment-01" | "segment-02" | "segment-03" | "segment-04";

// Zone types are intentionally narrow because later stage systems branch on these semantics.
export type StageZoneType = "spawn" | "lock" | "boss";

// The first playable stage only references these enemy families in authored gameplay data.
export type EnemyType = "light_tank" | "medium_tank" | "fixed_turret" | "scout_helicopter";

// Drop types are declared centrally so authored data and drop-resolution logic share one contract.
export type DropType = "repair_kit" | "weapon_boost" | "shield_battery";

// Segment metadata describes how authored art files map into the runtime world stack.
export interface StageSegmentSpec {
  key: StageSegmentKey;
  playOrder: 1 | 2 | 3 | 4;
  pixelHeight: number;
  mapRepoPath: string;
  worldTopY: number;
}

// Zones remain axis-aligned rectangles because later progression systems only need coarse triggers.
export interface StageZoneRect {
  key: string;
  segmentKey: StageSegmentKey;
  type: StageZoneType;
  x: number;
  y: number;
  w: number;
  h: number;
  worldStartY: number;
  worldEndY: number;
}

// Props keep their authored image path and a derived texture key so loading and placement stay decoupled.
export interface StagePropRecord {
  id: string;
  image: string;
  textureKey: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Collision remains intentionally coarse for Stage 1; later gameplay tasks can layer finer hit logic above it.
export interface StageCollisionBlocker {
  id: string;
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
}

// Runtime data is the normalized, typed view that gameplay and rendering code should consume.
export interface Stage1RuntimeData {
  segments: StageSegmentSpec[];
  zones: StageZoneRect[];
  propsBySegment: Record<StageSegmentKey, StagePropRecord[]>;
  collisionBySegment: Record<StageSegmentKey, StageCollisionBlocker[]>;
  totalHeight: number;
}

// This scroll contract isolates the numbers a future camera controller must honor for Stage 1.
export interface Stage1ScrollContract {
  viewportHeight: number;
  stageMaxScrollY: number;
  bossLockScrollY: number;
  playerSpawnY: number;
}
