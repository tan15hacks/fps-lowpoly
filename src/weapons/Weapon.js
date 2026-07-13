import { consumeAmmo, reloadMagazine } from '../utils/combatMath';
export class Weapon {
    definition;
    magazine;
    reserve;
    lastShotAt = -Infinity;
    reloadRemaining = 0;
    constructor(definition) {
        this.definition = definition;
        this.magazine = definition.magazine;
        this.reserve = definition.reserve;
    }
    canFire(now) {
        return (this.reloadRemaining <= 0 &&
            this.magazine > 0 &&
            now - this.lastShotAt >= 1 / this.definition.fireRate);
    }
    fire(now) {
        if (!this.canFire(now))
            return false;
        const result = consumeAmmo(this.magazine);
        this.magazine = result.magazine;
        this.lastShotAt = now;
        return result.fired;
    }
    startReload(reloadMultiplier = 1, capacity = this.definition.magazine) {
        const safeCapacity = Math.max(this.definition.magazine, Math.floor(capacity));
        if (this.reloadRemaining > 0 ||
            this.magazine >= safeCapacity ||
            this.reserve <= 0) {
            return false;
        }
        this.reloadRemaining = this.definition.reloadTime / Math.max(0.05, reloadMultiplier);
        return true;
    }
    interruptShellReloadForFire() {
        if (!this.definition.shellReload || this.reloadRemaining <= 0 || this.magazine <= 0) {
            return false;
        }
        this.cancelReload();
        return true;
    }
    cancelReload() {
        this.reloadRemaining = 0;
    }
    update(delta, capacity, reloadMultiplier) {
        if (this.reloadRemaining <= 0)
            return false;
        this.reloadRemaining -= Math.max(0, delta);
        if (this.reloadRemaining > 0)
            return false;
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
        }
        else {
            const result = reloadMagazine(this.magazine, safeCapacity, this.reserve);
            this.magazine = result.magazine;
            this.reserve = result.reserve;
        }
        return true;
    }
}
