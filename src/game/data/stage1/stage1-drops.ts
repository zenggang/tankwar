export const STAGE1_DROP_TYPES = [
  "repair_kit",
  "weapon_boost",
  "shield_battery"
] as const;

export type DropType = (typeof STAGE1_DROP_TYPES)[number];

export interface Stage1DropRules {
  checkpointReward: readonly ["repair_kit", "weapon_boost"];
  roadblockBonusChance: number;
  roadblockBonus: "shield_battery";
}

/**
 * 首关掉落仍然保持强 authored，而不是把战斗奖励做成全局随机池。
 * 这样导演脚本可以稳定地控制 checkpoint 的奖励节奏和 roadblock 的惊喜值。
 */
export const STAGE1_DROP_RULES: Stage1DropRules = {
  checkpointReward: ["repair_kit", "weapon_boost"],
  roadblockBonusChance: 0.25,
  roadblockBonus: "shield_battery"
};
