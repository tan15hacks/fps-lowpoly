export const POWER_COSTS = { turret: 4, fence: 3, healing: 3, ammo: 2, scanner: 2 };
export const DEFAULT_POWER = { turret: true, fence: true, healing: true, ammo: false, scanner: false };
export class PowerGrid {
    capacity = 10;
    allocation = { ...DEFAULT_POWER };
    used(allocation = this.allocation) {
        return Object.keys(POWER_COSTS).reduce((sum, id) => sum + (allocation[id] ? POWER_COSTS[id] : 0), 0);
    }
    set(id, active) {
        const candidate = { ...this.allocation, [id]: active };
        if (this.used(candidate) > this.capacity)
            return false;
        this.allocation = candidate;
        return true;
    }
    isActive(id) { return this.allocation[id]; }
}
