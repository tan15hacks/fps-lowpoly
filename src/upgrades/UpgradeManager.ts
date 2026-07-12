import { UPGRADES } from '../data/upgrades';
import type { UpgradeDefinition, WeaponId } from '../types/game';

const WEIGHTS = { common: 55, uncommon: 28, rare: 13, epic: 4 };

export class UpgradeManager {
  readonly stacks: Record<string, number> = {};

  draw(count: number, unlockedWeapons: Set<WeaponId>, rng: () => number = Math.random): UpgradeDefinition[] {
    const pool = UPGRADES.filter((u) => (!u.requiredWeapon || unlockedWeapons.has(u.requiredWeapon)) && (this.stacks[u.id] ?? 0) < u.maxStacks);
    const result: UpgradeDefinition[] = [];
    while (result.length < count && pool.length > 0) {
      const total = pool.reduce((sum, item) => sum + WEIGHTS[item.rarity], 0);
      let roll = rng() * total;
      let selectedIndex = 0;
      for (let i = 0; i < pool.length; i += 1) {
        roll -= WEIGHTS[pool[i]!.rarity];
        if (roll <= 0) { selectedIndex = i; break; }
      }
      result.push(pool.splice(selectedIndex, 1)[0]!);
    }
    return result;
  }

  apply(id: string): void { this.stacks[id] = (this.stacks[id] ?? 0) + 1; }
  level(id: string): number { return this.stacks[id] ?? 0; }
  multiplier(id: string, perStack: number): number { return 1 + this.level(id) * perStack; }
}
