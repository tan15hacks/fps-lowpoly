import * as THREE from 'three';
import { PALETTE } from '../visuals/LowPolyMaterialFactory';
import { PowerGrid } from './PowerGrid';
import { AUTO_TURRET } from './AutoTurret';
import { ELECTRIC_FENCE } from './ElectricFence';
import { HEALING_STATION } from './HealingStation';
export class OutpostManager {
    systems;
    enemies;
    player;
    upgrades;
    particles;
    audio;
    power = new PowerGrid();
    turretTimer = 0;
    scanTimer = 0;
    healingCharge = HEALING_STATION.chargePerWave;
    fenceCooldown = new WeakMap();
    timers = new Set();
    disposed = false;
    onTurretDamage;
    constructor(systems, enemies, player, upgrades, particles, audio) {
        this.systems = systems;
        this.enemies = enemies;
        this.player = player;
        this.upgrades = upgrades;
        this.particles = particles;
        this.audio = audio;
    }
    applyVisuals() {
        if (this.disposed)
            return;
        const allocation = this.power.allocation;
        this.systems.turretPivot.visible = allocation.turret;
        this.systems.fenceSegments.forEach((segment) => {
            segment.userData.glow.visible = allocation.fence;
        });
        this.systems.healingStation.userData.screen.material.emissiveIntensity = allocation.healing
            ? 1.8
            : 0.05;
        this.systems.ammoStation.userData.screen.material.emissiveIntensity = allocation.ammo
            ? 1.8
            : 0.05;
        this.systems.scannerLights.forEach((group) => {
            group.userData.light.intensity = allocation.scanner ? 2.2 : 0;
        });
    }
    beginWave() {
        this.healingCharge =
            HEALING_STATION.chargePerWave * this.upgrades.multiplier('healing', 0.25);
        if (this.upgrades.level('shield') > 0) {
            this.player.addArmor(25 * this.upgrades.level('shield'));
        }
    }
    betweenWaveService(restock) {
        if (this.power.isActive('healing')) {
            this.player.heal(HEALING_STATION.betweenWave *
                (1 + this.player.permanent.healingEfficiency * 0.08) *
                this.upgrades.multiplier('healing', 0.25));
        }
        if (this.power.isActive('ammo'))
            restock();
    }
    update(delta, playerPosition) {
        if (this.disposed)
            return;
        this.turretTimer -= delta;
        this.scanTimer -= delta;
        if (this.power.isActive('turret'))
            this.updateTurret();
        if (this.power.isActive('fence'))
            this.updateFence(delta);
        if (this.power.isActive('healing') &&
            this.healingCharge > 0 &&
            Math.hypot(playerPosition.x + 9, playerPosition.z + 2) < HEALING_STATION.range &&
            this.player.health < this.player.maxHealth) {
            const amount = Math.min(this.healingCharge, HEALING_STATION.combatRate * delta * this.upgrades.multiplier('healing', 0.25));
            this.healingCharge -= this.player.heal(amount);
        }
        if (this.power.isActive('scanner') && this.scanTimer <= 0) {
            for (const enemy of this.enemies.enemies) {
                if (!enemy.alive || enemy.group.position.distanceTo(playerPosition) >= 18)
                    continue;
                enemy.weakPoint.scale.setScalar(1.45);
                this.schedule(() => {
                    if (enemy.alive)
                        enemy.weakPoint?.scale.setScalar(1);
                }, 800);
            }
            this.scanTimer = 4;
        }
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.onTurretDamage = undefined;
        for (const timer of this.timers)
            window.clearTimeout(timer);
        this.timers.clear();
    }
    updateTurret() {
        const turret = this.systems.turretPivot;
        const target = this.enemies.nearest(turret.position, AUTO_TURRET.range);
        if (!target)
            return;
        const direction = target.group.position.clone().sub(turret.position);
        turret.rotation.y = Math.atan2(direction.x, direction.z);
        if (this.turretTimer <= 0) {
            const damage = AUTO_TURRET.damage *
                (1 + this.player.permanent.turretEfficiency * 0.08) *
                this.upgrades.multiplier('turret', 0.2);
            target.takeDamage(damage, false);
            const muzzle = turret.localToWorld(new THREE.Vector3(0, -0.25, -3.2));
            this.particles.burst(muzzle, PALETTE.orange, 3, 2);
            this.audio.play('turret');
            this.turretTimer = 1 / AUTO_TURRET.fireRate;
            this.onTurretDamage?.(damage);
        }
    }
    updateFence(delta) {
        for (const enemy of this.enemies.enemies) {
            if (!enemy.alive)
                continue;
            const previous = this.fenceCooldown.get(enemy) ?? 0;
            if (previous > 0) {
                this.fenceCooldown.set(enemy, previous - delta);
                continue;
            }
            const position = enemy.group.position;
            const near = Math.abs(Math.abs(position.x) - ELECTRIC_FENCE.boundary) < 0.8 ||
                Math.abs(Math.abs(position.z) - ELECTRIC_FENCE.boundary) < 0.8;
            if (!near)
                continue;
            const damage = ELECTRIC_FENCE.damage * this.upgrades.multiplier('fence', 0.25);
            enemy.takeDamage(damage, false);
            enemy.speed *= ELECTRIC_FENCE.slow;
            this.schedule(() => {
                if (enemy.alive)
                    enemy.speed /= ELECTRIC_FENCE.slow;
            }, 500);
            this.particles.burst(enemy.group.position.clone().add(new THREE.Vector3(0, 1, 0)), PALETTE.cyan, 6, 3);
            this.fenceCooldown.set(enemy, ELECTRIC_FENCE.cooldown);
        }
    }
    schedule(callback, milliseconds) {
        const timer = window.setTimeout(() => {
            this.timers.delete(timer);
            if (!this.disposed)
                callback();
        }, milliseconds);
        this.timers.add(timer);
    }
}
