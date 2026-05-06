import {
  STAGE1_DROP_RULES,
  type DropType
} from "../../data/stage1/stage1-drops";

export interface Stage1DropRollParams {
  zoneKey: string;
  randomValue: number;
}

/**
 * 把首关的掉落分发表集中到一个地方，避免 scene 里散落 if/else。
 * 这样后续如果要替换为别的 authored 关卡表，只需要换数据和 resolver。
 */
export function resolveStage1Drop(
  params: Stage1DropRollParams
): DropType | null {
  if (params.zoneKey === "checkpoint-lock") {
    return params.randomValue < 0.5
      ? STAGE1_DROP_RULES.checkpointReward[0]
      : STAGE1_DROP_RULES.checkpointReward[1];
  }

  if (
    params.zoneKey === "roadblock-lane" &&
    params.randomValue <= STAGE1_DROP_RULES.roadblockBonusChance
  ) {
    return STAGE1_DROP_RULES.roadblockBonus;
  }

  return null;
}
