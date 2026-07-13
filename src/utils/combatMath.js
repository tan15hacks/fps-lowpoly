export function calculateWeaponDamage(baseDamage, permanentLevel, runDamageStacks, critical, criticalStacks) {
    const permanent = 1 + permanentLevel * 0.06;
    const run = 1 + runDamageStacks * 0.12;
    const criticalMultiplier = critical ? 1.75 + criticalStacks * 0.2 : 1;
    return baseDamage * permanent * run * criticalMultiplier;
}
export function consumeAmmo(magazine, amount = 1) {
    if (magazine < amount)
        return { magazine, fired: false };
    return { magazine: magazine - amount, fired: true };
}
export function reloadMagazine(magazine, capacity, reserve) {
    const needed = Math.max(0, capacity - magazine);
    const loaded = Math.min(needed, Math.max(0, reserve));
    return { magazine: magazine + loaded, reserve: reserve - loaded, loaded };
}
