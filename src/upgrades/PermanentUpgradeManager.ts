import type { PermanentLevels } from '../types/game';

export const PERMANENT_LABELS: Record<keyof PermanentLevels, string> = {
  health: 'Starting Health', armor: 'Starting Armor', pistolDamage: 'Pistol Damage',
  smgDamage: 'SMG Damage', shotgunDamage: 'Shotgun Damage', reloadSpeed: 'Reload Speed',
  startingAmmo: 'Starting Ammunition', coinBonus: 'Coin Bonus', turretEfficiency: 'Turret Efficiency',
  healingEfficiency: 'Healing Efficiency',
};

export function permanentUpgradeCost(key: keyof PermanentLevels, currentLevel: number): number {
  const base = ['health', 'armor', 'startingAmmo', 'coinBonus'].includes(key) ? 120 : 170;
  return Math.round(base * Math.pow(1.68, Math.max(0, currentLevel)));
}

export function purchasePermanent(levels: PermanentLevels, credits: number, key: keyof PermanentLevels): { levels: PermanentLevels; credits: number; purchased: boolean } {
  const level = levels[key];
  if (level >= 5) return { levels, credits, purchased: false };
  const cost = permanentUpgradeCost(key, level);
  if (credits < cost) return { levels, credits, purchased: false };
  return { levels: { ...levels, [key]: level + 1 }, credits: credits - cost, purchased: true };
}
