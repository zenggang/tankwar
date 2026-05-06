import type { DropType } from "../data/stage1/stage1-drops";
import type { Stage1SpawnEntry } from "../data/stage1/stage1-spawns";
import { resolveStage1Drop } from "./combat/drop-table";

export type StageZoneType = "spawn" | "lock" | "boss";

export interface StageZoneRect {
  key: string;
  segmentKey: string;
  type: StageZoneType;
  x: number;
  y: number;
  w: number;
  h: number;
  worldStartY: number;
  worldEndY: number;
}

export type StageDirectorCommand =
  | { kind: "spawn-wave"; zoneKey: string; spawns: Stage1SpawnEntry[] }
  | { kind: "spawn-drop"; zoneKey: string; dropType: DropType }
  | { kind: "lock-boss-arena"; zoneKey: string };

export interface StageDirector {
  update(params: { playerWorldY: number; randomValue: number }): StageDirectorCommand[];
}

/**
 * Stage 1 是“向上推进”，也就是玩家的世界 Y 会越来越小。
 * 导演器只关心何时跨进未触发区间，以及该区间要吐出哪些纯命令。
 */
export function createStageDirector(config: {
  zones: StageZoneRect[];
  spawnPlan: Stage1SpawnEntry[];
}): StageDirector {
  const orderedZones = [...config.zones].sort(
    (left, right) => right.worldStartY - left.worldStartY
  );
  const triggeredZones = new Set<string>();
  let lastPlayerWorldY = Number.POSITIVE_INFINITY;

  return {
    update(params) {
      const activeZone = orderedZones.find((zone) => {
        if (triggeredZones.has(zone.key)) {
          return false;
        }

        const currentlyInside =
          params.playerWorldY >= zone.worldStartY &&
          params.playerWorldY <= zone.worldEndY;

        // 角色从更大的 Y 穿进当前区间，代表向上推进跨过了这一段触发线。
        const crossedIntoZoneFromBelow =
          lastPlayerWorldY > zone.worldEndY &&
          params.playerWorldY <= zone.worldEndY;

        return currentlyInside || crossedIntoZoneFromBelow;
      });

      lastPlayerWorldY = params.playerWorldY;

      if (!activeZone) {
        return [];
      }

      triggeredZones.add(activeZone.key);

      const commands: StageDirectorCommand[] = [];
      const spawns = config.spawnPlan.filter(
        (entry) => entry.zoneKey === activeZone.key
      );

      if (spawns.length > 0) {
        commands.push({
          kind: "spawn-wave",
          zoneKey: activeZone.key,
          spawns
        });
      }

      const dropType = resolveStage1Drop({
        zoneKey: activeZone.key,
        randomValue: params.randomValue
      });

      if (dropType) {
        commands.push({
          kind: "spawn-drop",
          zoneKey: activeZone.key,
          dropType
        });
      }

      if (activeZone.type === "boss") {
        commands.push({
          kind: "lock-boss-arena",
          zoneKey: activeZone.key
        });
      }

      return commands;
    }
  };
}
