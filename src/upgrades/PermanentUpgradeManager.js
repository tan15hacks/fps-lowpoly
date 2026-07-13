export const PERMANENT_LABELS = {
    health: 'Starting Health', armor: 'Starting Armor', pistolDamage: 'Pistol Damage',
    smgDamage: 'SMG Damage', shotgunDamage: 'Shotgun Damage', reloadSpeed: 'Reload Speed',
    startingAmmo: 'Starting Ammunition', coinBonus: 'Coin Bonus', turretEfficiency: 'Turret Efficiency',
    healingEfficiency: 'Healing Efficiency',
};
export function permanentUpgradeCost(key, currentLevel) {
    const base = ['health', 'armor', 'startingAmmo', 'coinBonus'].includes(key) ? 120 : 170;
    return Math.round(base * Math.pow(1.68, Math.max(0, currentLevel)));
}
export function purchasePermanent(levels, credits, key) {
    const level = levels[key];
    if (level >= 5)
        return { levels, credits, purchased: false };
    const cost = permanentUpgradeCost(key, level);
    if (credits < cost)
        return { levels, credits, purchased: false };
    return { levels: { ...levels, [key]: level + 1 }, credits: credits - cost, purchased: true };
}
