import type { DropType } from "../../data/stage1/stage1-drops";

export interface DropAffectableState {
  hp: number;
  maxHp: number;
  shieldHp: number;
  shieldMaxHp: number;
  weaponBoostActive: boolean;
  weaponBoostUntilMs: number;
}

/**
 * 纯函数化掉落效果，方便 HUD、玩家实体和测试共享同一套结算结果。
 * scene 只要把返回的新状态喂回玩家对象即可，不需要自己重复算数值。
 */
export function applyDropPickup(
  state: DropAffectableState,
  dropType: DropType,
  nowMs: number
): DropAffectableState {
  if (dropType === "repair_kit") {
    return {
      ...state,
      hp: Math.min(state.maxHp, state.hp + 35)
    };
  }

  if (dropType === "weapon_boost") {
    return {
      ...state,
      weaponBoostActive: true,
      weaponBoostUntilMs: nowMs + 8000
    };
  }

  return {
    ...state,
    shieldHp: state.shieldMaxHp
  };
}
