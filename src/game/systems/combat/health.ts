export interface CombatHealthState {
  hp: number;
  shieldHp: number;
}

export interface DamagePayload {
  amount: number;
}

export interface DamageResult extends CombatHealthState {
  destroyed: boolean;
}

/**
 * 统一处理护盾与血量的伤害结算。
 *
 * 先吃掉护盾，再把剩余伤害结算到生命值上，这样后续 scene
 * 无论是玩家、普通敌人还是 Boss 部件，都能复用同一套纯逻辑。
 */
export function applyDamage(
  current: CombatHealthState,
  hit: DamagePayload
): DamageResult {
  const safeShieldHp = Math.max(0, current.shieldHp);
  const safeDamage = Math.max(0, hit.amount);

  // 护盾永远先吸收伤害，剩余部分才会穿透到生命值。
  const shieldAbsorb = Math.min(safeShieldHp, safeDamage);
  const remainingDamage = safeDamage - shieldAbsorb;
  const nextHp = Math.max(0, current.hp - remainingDamage);

  return {
    hp: nextHp,
    shieldHp: safeShieldHp - shieldAbsorb,
    destroyed: nextHp === 0
  };
}
