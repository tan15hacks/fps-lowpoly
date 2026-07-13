import { UPGRADES } from '../data/upgrades';
const WEIGHTS = { common: 55, uncommon: 28, rare: 13, epic: 4 };
export class UpgradeManager {
    stacks = {};
    draw(count, unlockedWeapons, rng = Math.random) {
        const pool = UPGRADES.filter((u) => (!u.requiredWeapon || unlockedWeapons.has(u.requiredWeapon)) && (this.stacks[u.id] ?? 0) < u.maxStacks);
        const result = [];
        while (result.length < count && pool.length > 0) {
            const total = pool.reduce((sum, item) => sum + WEIGHTS[item.rarity], 0);
            let roll = rng() * total;
            let selectedIndex = 0;
            for (let i = 0; i < pool.length; i += 1) {
                roll -= WEIGHTS[pool[i].rarity];
                if (roll <= 0) {
                    selectedIndex = i;
                    break;
                }
            }
            result.push(pool.splice(selectedIndex, 1)[0]);
        }
        return result;
    }
    apply(id) { this.stacks[id] = (this.stacks[id] ?? 0) + 1; }
    level(id) { return this.stacks[id] ?? 0; }
    multiplier(id, perStack) { return 1 + this.level(id) * perStack; }
}
