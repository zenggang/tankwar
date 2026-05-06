import type {
  StageCollisionBlocker,
  StagePropRecord,
  StageSegmentKey,
  StageSegmentSpec,
  StageZoneRect
} from "../types/stage";

interface RawStagePropRecord {
  id: string;
  image: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RawStageCollisionSegment {
  key: StageSegmentKey;
  blockers: Array<{ id: string; type: "rect"; x: number; y: number; w: number; h: number }>;
}

interface RawStageZoneRecord {
  id: string;
  segment: StageSegmentKey;
  type: "spawn" | "lock" | "boss";
  x: number;
  y: number;
  w: number;
  h: number;
}

// Stage 1 climbs upward, so the authored first segment is placed at the world bottom.
export const STAGE1_SEGMENTS: StageSegmentSpec[] = [
  {
    key: "segment-01",
    playOrder: 1,
    pixelHeight: 1400,
    mapRepoPath: "assets/map/stage1/segment-01-base.png",
    worldTopY: 4000
  },
  {
    key: "segment-02",
    playOrder: 2,
    pixelHeight: 1400,
    mapRepoPath: "assets/map/stage1/segment-02-base.png",
    worldTopY: 2600
  },
  {
    key: "segment-03",
    playOrder: 3,
    pixelHeight: 1400,
    mapRepoPath: "assets/map/stage1/segment-03-base.png",
    worldTopY: 1200
  },
  {
    key: "segment-04",
    playOrder: 4,
    pixelHeight: 1200,
    mapRepoPath: "assets/map/stage1/segment-04-base.png",
    worldTopY: 0
  }
];

// Texture keys are derived from repo paths so asset loading and authored JSON can share one naming rule.
export function repoPathToTextureKey(repoPath: string): string {
  return repoPath
    .replace(/^assets\//, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();
}

// Offsets are computed once so the zone adapter can translate per-segment local coordinates into world space.
function segmentOffsetMap(segments: StageSegmentSpec[]): Record<StageSegmentKey, number> {
  const offsets = {} as Record<StageSegmentKey, number>;

  for (const segment of segments) {
    offsets[segment.key] = segment.worldTopY;
  }

  return offsets;
}

// The landed merged props file prefixes segment keys with an extra "segment-" token, so the adapter accepts both.
export function normalizeStage1Props(
  rawSegments: Record<string, RawStagePropRecord[]>
): Record<StageSegmentKey, StagePropRecord[]> {
  const normalized = {} as Record<StageSegmentKey, StagePropRecord[]>;

  for (const segment of STAGE1_SEGMENTS) {
    const rawProps =
      rawSegments[segment.key] ??
      rawSegments[`segment-${segment.key}`] ??
      [];

    normalized[segment.key] = rawProps.map((prop) => ({
      ...prop,
      textureKey: repoPathToTextureKey(prop.image)
    }));
  }

  return normalized;
}

// Collision entries are copied segment-by-segment so later systems can rely on a complete record for every segment key.
export function normalizeStage1Collisions(
  rawSegments: RawStageCollisionSegment[]
): Record<StageSegmentKey, StageCollisionBlocker[]> {
  const normalized = {} as Record<StageSegmentKey, StageCollisionBlocker[]>;

  for (const segment of STAGE1_SEGMENTS) {
    normalized[segment.key] =
      rawSegments.find((entry) => entry.key === segment.key)?.blockers.map((blocker) => ({
        ...blocker
      })) ?? [];
  }

  return normalized;
}

// Zone world coordinates make upward progression explicit and testable outside Phaser scenes.
export function normalizeStage1Zones(rawZones: RawStageZoneRecord[]): StageZoneRect[] {
  const offsets = segmentOffsetMap(STAGE1_SEGMENTS);

  return rawZones.map((zone) => ({
    key: zone.id,
    segmentKey: zone.segment,
    type: zone.type,
    x: zone.x,
    y: zone.y,
    w: zone.w,
    h: zone.h,
    worldStartY: offsets[zone.segment] + zone.y,
    worldEndY: offsets[zone.segment] + zone.y + zone.h
  }));
}
