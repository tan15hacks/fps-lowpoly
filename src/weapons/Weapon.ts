import type { WeaponDefinition } from '../types/game';
import { consumeAmmo, reloadMagazine } from '../utils/combatMath';

export class Weapon {
  magazine: number;
  reserve: number;
  lastShotAt = -Infinity;
  reloadRemaining = 0;

  constructor(readonly definition: WeaponDefinition) {
    this.magazine = definition.magazine;
    this.reserve = definition.reserve;
  }

  canFire(now: number): boolean {
    return (
      this.reloadRemaining <= 0 &&
      this.magazine > 0 &&
      now - this.lastShotAt >= 1 / this.definition.fireRate
    );
  }

  fire(now: number): boolean {
    if (!this.canFire(now)) return false;
    const result = consumeAmmo(this.magazine);
    this.magazine = result.magazine;
    this.lastShotAt = now;
    return result.fired;
  }

  startReload(
    reloadMultiplier = 1,
    capacity = this.definition.magazine,
  ): boolean {
    const safeCapacity = Math.max(this.definition.magazine, Math.floor(capacity));
    if (
      this.reloadRemaining > 0 ||
      this.magazine >= safeCapacity ||
      this.reserve <= 0
    ) {
      return false;
    }
    this.reloadRemaining = this.definition.reloadTime / Math.max(0.05, reloadMultiplier);
    return true;
  }

  interruptShellReloadForFire(): boolean {
    if (!this.definition.shellReload || this.reloadRemaining <= 0 || this.magazine <= 0) {
      return false;
    }
    this.cancelReload();
    return true;
  }

  cancelReload(): void {
    this.reloadRemaining = 0;
  }

  update(delta: number, capacity: number, reloadMultiplier: number): boolean {
    if (this.reloadRemaining <= 0) return false;
    this.reloadRemaining -= Math.max(0, delta);
    if (this.reloadRemaining > 0) return false;

    const safeCapacity = Math.max(this.definition.magazine, Math.floor(capacity));
    if (this.definition.shellReload) {
      if (this.magazine < safeCapacity && this.reserve > 0) {
        this.magazine += 1;
        this.reserve -= 1;
      }
      if (this.magazine < safeCapacity && this.reserve > 0) {
        this.reloadRemaining =
          this.definition.reloadTime / Math.max(0.05, reloadMultiplier);
      }
    } else {
      const result = reloadMagazine(this.magazine, safeCapacity, this.reserve);
      this.magazine = result.magazine;
      this.reserve = result.reserve;
    }
    return true;
  }
}
