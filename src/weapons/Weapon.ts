import type { WeaponDefinition } from '../types/game';
import { consumeAmmo, reloadMagazine } from '../utils/combatMath';

export class Weapon {
  magazine: number; reserve: number; lastShotAt = -Infinity; reloadRemaining = 0; shellTimer = 0;
  constructor(readonly definition: WeaponDefinition) { this.magazine = definition.magazine; this.reserve = definition.reserve; }
  canFire(now: number): boolean { return this.reloadRemaining <= 0 && this.magazine > 0 && now - this.lastShotAt >= 1 / this.definition.fireRate; }
  fire(now: number): boolean { if (!this.canFire(now)) return false; const result=consumeAmmo(this.magazine); this.magazine=result.magazine; this.lastShotAt=now; return result.fired; }
  startReload(reloadMultiplier = 1): boolean {
    if (this.reloadRemaining > 0 || this.magazine >= this.definition.magazine || this.reserve <= 0) return false;
    this.reloadRemaining = this.definition.shellReload ? this.definition.reloadTime / reloadMultiplier : this.definition.reloadTime / reloadMultiplier; return true;
  }
  cancelReload(): void { this.reloadRemaining=0; this.shellTimer=0; }
  update(delta: number, capacity: number, reloadMultiplier: number): boolean {
    if (this.reloadRemaining <= 0) return false;
    this.reloadRemaining -= delta;
    if (this.reloadRemaining > 0) return false;
    if (this.definition.shellReload) {
      if (this.magazine < capacity && this.reserve > 0) { this.magazine += 1; this.reserve -= 1; }
      if (this.magazine < capacity && this.reserve > 0) this.reloadRemaining = this.definition.reloadTime / reloadMultiplier;
    } else {
      const result=reloadMagazine(this.magazine,capacity,this.reserve); this.magazine=result.magazine; this.reserve=result.reserve;
    }
    return true;
  }
}
