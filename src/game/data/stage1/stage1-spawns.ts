export const STAGE1_ZONE_ORDER = [
  "opening-lane",
  "roadblock-lane",
  "checkpoint-lock",
  "boss-arena"
] as const;

export type Stage1ZoneKey = (typeof STAGE1_ZONE_ORDER)[number];

export type EnemyType =
  | "light_tank"
  | "medium_tank"
  | "fixed_turret"
  | "scout_helicopter";

export interface Stage1SpawnEntry {
  zoneKey: Stage1ZoneKey;
  type: EnemyType;
  x: number;
  y: number;
  delayMs: number;
}

/**
 * 这些刷怪波次只承载“关卡导演数据”，不重复描述真实地图资源。
 * 坐标直接对齐 plan 里的世界坐标，用于后续 scene 在触发区间时拉起敌人编队。
 */
export const STAGE1_SPAWN_PLAN: Stage1SpawnEntry[] = [
  { zoneKey: "opening-lane", type: "light_tank", x: 360, y: 4680, delayMs: 0 },
  { zoneKey: "opening-lane", type: "fixed_turret", x: 132, y: 4460, delayMs: 900 },
  { zoneKey: "roadblock-lane", type: "medium_tank", x: 360, y: 3320, delayMs: 0 },
  { zoneKey: "roadblock-lane", type: "scout_helicopter", x: 600, y: 3140, delayMs: 1200 },
  { zoneKey: "checkpoint-lock", type: "light_tank", x: 292, y: 2040, delayMs: 0 },
  { zoneKey: "checkpoint-lock", type: "medium_tank", x: 426, y: 1860, delayMs: 800 },
  { zoneKey: "checkpoint-lock", type: "fixed_turret", x: 126, y: 1680, delayMs: 1200 }
];
