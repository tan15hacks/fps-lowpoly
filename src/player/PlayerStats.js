export class PlayerStats {
    permanent;
    upgrades;
    maxHealth;
    maxArmor;
    health;
    armor;
    walkSpeed = 5.5;
    sprintSpeed = 8;
    jumpStrength = 6.6;
    stamina = 1;
    invulnerableUntil = 0;
    revived = false;
    constructor(permanent, upgrades) {
        this.permanent = permanent;
        this.upgrades = upgrades;
        this.maxHealth = 100 + permanent.health * 8;
        this.maxArmor = 50 + permanent.armor * 6;
        this.health = this.maxHealth;
        this.armor = permanent.armor * 4;
    }
    damage(amount, now) {
        if (now < this.invulnerableUntil || amount <= 0)
            return 0;
        const armorAbsorb = Math.min(this.armor, amount * 0.58);
        this.armor -= armorAbsorb;
        const healthDamage = amount - armorAbsorb;
        this.health = Math.max(0, this.health - healthDamage);
        return healthDamage;
    }
    heal(amount) { const before = this.health; this.health = Math.min(this.maxHealth, this.health + Math.max(0, amount)); return this.health - before; }
    addArmor(amount) { const before = this.armor; this.armor = Math.min(this.maxArmor, this.armor + Math.max(0, amount)); return this.armor - before; }
    isDead() { return this.health <= 0; }
    applyUpgrade(id) {
        if (id === 'health') {
            this.maxHealth += 20;
            this.heal(20);
        }
        if (id === 'armor') {
            this.maxArmor += 15;
            this.addArmor(15);
        }
        if (id === 'move') {
            this.walkSpeed *= 1.08;
            this.sprintSpeed *= 1.08;
        }
    }
}
