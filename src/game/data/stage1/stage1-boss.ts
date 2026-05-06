export interface Stage1BossTuning {
  maxHp: number;
  phaseTwoHealthRatio: number;
  sideCannonsRequired: number;
  arenaLockScrollY: number;
}

/**
 * 这里先只沉淀关底导演和战斗需要的最小调参。
 * 真正的 Boss 实体和 phase 切换表现由后续实体层接这份数据即可。
 */
export const STAGE1_BOSS_TUNING: Stage1BossTuning = {
  maxHp: 320,
  phaseTwoHealthRatio: 0.5,
  sideCannonsRequired: 2,
  arenaLockScrollY: 0
};
