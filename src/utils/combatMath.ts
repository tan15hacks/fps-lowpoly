export function calculateWeaponDamage(baseDamage: number, permanentLevel: number, runDamageStacks: number, critical: boolean, criticalStacks: number): number {
  const permanent = 1 + permanentLevel * 0.06;
  const run = 1 + runDamageStacks * 0.12;
  const criticalMultiplier = critical ? 1.75 + criticalStacks * 0.2 : 1;
  return baseDamage * permanent * run * criticalMultiplier;
}

export function consumeAmmo(magazine: number, amount = 1): { magazine: number; fired: boolean } {
  if (magazine < amount) return { magazine, fired: false };
  return { magazine: magazine - amount, fired: true };
}

export function reloadMagazine(magazine: number, capacity: number, reserve: number): { magazine: number; reserve: number; loaded: number } {
  const needed = Math.max(0, capacity - magazine);
  const loaded = Math.min(needed, Math.max(0, reserve));
  return { magazine: magazine + loaded, reserve: reserve - loaded, loaded };
}
