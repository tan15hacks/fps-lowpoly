import type { PowerAllocation, PowerSystemId } from '../types/game';

export const POWER_COSTS: Record<PowerSystemId, number> = { turret: 4, fence: 3, healing: 3, ammo: 2, scanner: 2 };
export const DEFAULT_POWER: PowerAllocation = { turret: true, fence: true, healing: true, ammo: false, scanner: false };

export class PowerGrid {
  readonly capacity = 10;
  allocation: PowerAllocation = { ...DEFAULT_POWER };

  used(allocation = this.allocation): number {
    return (Object.keys(POWER_COSTS) as PowerSystemId[]).reduce((sum, id) => sum + (allocation[id] ? POWER_COSTS[id] : 0), 0);
  }

  set(id: PowerSystemId, active: boolean): boolean {
    const candidate = { ...this.allocation, [id]: active };
    if (this.used(candidate) > this.capacity) return false;
    this.allocation = candidate;
    return true;
  }

  isActive(id: PowerSystemId): boolean { return this.allocation[id]; }
}
