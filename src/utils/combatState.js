export function weaponSwitchDuration(quickSlingStacks) {
    const stacks = Math.max(0, Math.floor(quickSlingStacks));
    return Math.max(0.12, 0.32 / (1 + stacks * 0.3));
}
export function recoilMultiplier(counterweightStacks) {
    const stacks = Math.max(0, Math.floor(counterweightStacks));
    return Math.max(0.28, 1 - stacks * 0.18);
}
export function lifeStealCap(lifeStealStacks) {
    return Math.max(0, Math.floor(lifeStealStacks)) * 18;
}
export function cappedHealingRequest(requested, healedThisWave, cap) {
    const safeRequested = Math.max(0, requested);
    const safeCap = Math.max(0, cap);
    const safeHealed = Math.max(0, healedThisWave);
    const remaining = Math.max(0, safeCap - safeHealed);
    return {
        requested: safeRequested,
        allowed: Math.min(safeRequested, remaining),
        remaining,
    };
}
export function appliedDamage(currentHealth, incomingDamage, damageMultiplier = 1) {
    const health = Math.max(0, currentHealth);
    const incoming = Math.max(0, incomingDamage);
    const multiplier = Math.max(0, damageMultiplier);
    return Math.min(health, incoming * multiplier);
}
