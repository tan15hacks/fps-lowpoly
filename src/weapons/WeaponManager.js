import * as THREE from 'three';
import { WEAPONS } from '../data/weapons';
import { PALETTE } from '../visuals/LowPolyMaterialFactory';
import { damp } from '../player/controlMath';
import { recoilMultiplier, weaponSwitchDuration } from '../utils/combatState';
import { Weapon } from './Weapon';
import { createHitscanRays } from './HitscanSystem';
export class WeaponManager {
    camera;
    cameraController;
    stats;
    upgrades;
    audio;
    settings;
    weapons = {
        pistol: new Weapon(WEAPONS.pistol),
        smg: new Weapon(WEAPONS.smg),
        shotgun: new Weapon(WEAPONS.shotgun),
    };
    unlocked = new Set(['pistol']);
    activeId = 'pistol';
    models = new Map();
    muzzle;
    swayTime = 0;
    wasFireHeld = false;
    muzzleTimer = 0;
    disposed = false;
    aimBlend = 0;
    aimDirectionResolver;
    pendingId;
    switchRemaining = 0;
    switchDuration = 0;
    onShot;
    onChanged;
    constructor(camera, cameraController, stats, upgrades, audio, settings, materials) {
        this.camera = camera;
        this.cameraController = cameraController;
        this.stats = stats;
        this.upgrades = upgrades;
        this.audio = audio;
        this.settings = settings;
        this.weapons.smg.reserve += stats.permanent.startingAmmo * 18;
        this.weapons.shotgun.reserve += stats.permanent.startingAmmo * 5;
        this.models.set('pistol', this.createPistol(materials));
        this.models.set('smg', this.createSmg(materials));
        this.models.set('shotgun', this.createShotgun(materials));
        this.models.forEach((model) => {
            model.visible = false;
            camera.add(model);
        });
        this.models.get(this.activeId).visible = true;
    }
    setSettings(settings) {
        this.settings = settings;
    }
    setAimDirectionResolver(resolver) {
        this.aimDirectionResolver = resolver;
    }
    active() {
        return this.weapons[this.activeId];
    }
    isSwitching() {
        return this.pendingId !== undefined;
    }
    unlock(id) {
        this.unlocked.add(id);
        this.switchTo(id);
    }
    switchTo(id) {
        if (this.disposed || !this.unlocked.has(id))
            return;
        const currentTarget = this.pendingId ?? this.activeId;
        if (id === currentTarget)
            return;
        this.active().cancelReload();
        this.pendingId = id;
        this.switchDuration = weaponSwitchDuration(this.upgrades.level('switch'));
        this.switchRemaining = this.switchDuration;
        this.aimBlend = 0;
    }
    cycle(direction) {
        const ids = ['pistol', 'smg', 'shotgun'].filter((id) => this.unlocked.has(id));
        const current = this.pendingId ?? this.activeId;
        const index = ids.indexOf(current);
        this.switchTo(ids[(index + (direction > 0 ? 1 : -1) + ids.length) % ids.length]);
    }
    update(delta, now, fire, reload, aiming, lookSource) {
        if (this.disposed)
            return;
        this.advanceSwitch(delta);
        const switching = this.isSwitching();
        const weapon = this.active();
        const capacity = this.capacity(this.activeId);
        const reloadMultiplier = (1 + this.stats.permanent.reloadSpeed * 0.06) *
            this.upgrades.multiplier('reload', 0.15);
        if (!switching) {
            if (reload && weapon.startReload(reloadMultiplier, capacity)) {
                this.audio.play('reload');
            }
            const shellLoaded = weapon.update(delta, capacity, reloadMultiplier);
            if (shellLoaded && weapon.definition.shellReload)
                this.audio.play('reload');
        }
        const wantsFire = !switching && fire && (weapon.definition.automatic || !this.wasFireHeld);
        if (wantsFire) {
            weapon.interruptShellReloadForFire();
            if (weapon.fire(now)) {
                const baseSpread = weapon.definition.spread * (aiming ? 0.55 : 1);
                const origin = this.camera.getWorldPosition(new THREE.Vector3());
                let forward = this.cameraController.forward();
                if (aiming &&
                    lookSource === 'touch' &&
                    this.settings.aimAssist &&
                    this.aimDirectionResolver) {
                    forward =
                        this.aimDirectionResolver(origin, forward, weapon.definition.range, THREE.MathUtils.degToRad(5.5)) ?? forward;
                }
                const right = forward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
                const up = right.clone().cross(forward).normalize();
                const rays = createHitscanRays(origin, forward, right, up, weapon.definition.pellets, baseSpread, weapon.definition.range);
                this.onShot?.({ weapon: this.activeId, rays, baseDamage: weapon.definition.damage });
                this.audio.play(this.activeId);
                const baseRecoil = this.activeId === 'shotgun' ? 0.65 : this.activeId === 'smg' ? 0.18 : 0.25;
                this.cameraController.addRecoil(baseRecoil * recoilMultiplier(this.upgrades.level('recoil')));
                this.flashMuzzle();
            }
            else if (weapon.magazine <= 0 && now - weapon.lastShotAt > 0.25) {
                this.audio.play('empty');
                weapon.lastShotAt = now;
                if (this.settings.autoReload) {
                    weapon.startReload(reloadMultiplier, capacity);
                }
            }
        }
        const effectiveAiming = aiming && !switching;
        this.aimBlend = damp(this.aimBlend, effectiveAiming ? 1 : 0, 14, delta);
        const model = this.models.get(this.activeId);
        this.swayTime += delta * (fire ? 11 : 5);
        const recoil = this.activeId === 'shotgun' ? 0.08 : 0.035;
        const swayScale = 1 - this.aimBlend * 0.7;
        const switchProgress = this.switchDuration > 0 ? this.switchRemaining / this.switchDuration : 0;
        const switchDrop = switching ? Math.sin((1 - switchProgress) * Math.PI * 0.5) * 0.22 : 0;
        model.position.x =
            THREE.MathUtils.lerp(0.34, 0.035, this.aimBlend) +
                Math.sin(this.swayTime) * 0.006 * swayScale;
        model.position.y =
            THREE.MathUtils.lerp(-0.28, -0.215, this.aimBlend) +
                Math.abs(Math.cos(this.swayTime * 0.5)) * 0.006 * swayScale -
                switchDrop;
        model.position.z =
            THREE.MathUtils.lerp(-0.62, -0.56, this.aimBlend) +
                Math.min(0.12, now - weapon.lastShotAt < 0.09 ? recoil : 0);
        this.wasFireHeld = fire;
        this.muzzleTimer -= delta;
        if (this.muzzle && this.muzzleTimer <= 0) {
            this.muzzle.visible = false;
            this.muzzle = undefined;
        }
    }
    capacity(id) {
        const base = this.weapons[id].definition.magazine;
        if (id === 'pistol')
            return base + this.upgrades.level('pistolMag') * 4;
        if (id === 'smg')
            return base + this.upgrades.level('smgMag') * 8;
        return base + this.upgrades.level('shotgunMag') * 2;
    }
    restock(multiplier = 1) {
        this.weapons.smg.reserve += Math.round(45 * multiplier);
        this.weapons.shotgun.reserve += Math.round(12 * multiplier);
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.onShot = undefined;
        this.onChanged = undefined;
        this.aimDirectionResolver = undefined;
        this.pendingId = undefined;
        this.switchRemaining = 0;
        this.switchDuration = 0;
        this.wasFireHeld = false;
        this.muzzle = undefined;
        for (const weapon of Object.values(this.weapons))
            weapon.cancelReload();
        this.models.forEach((model) => {
            this.camera.remove(model);
            model.traverse((object) => object.geometry?.dispose?.());
            model.clear?.();
        });
        this.models.clear();
    }
    advanceSwitch(delta) {
        if (!this.pendingId)
            return;
        this.switchRemaining = Math.max(0, this.switchRemaining - Math.max(0, delta));
        if (this.switchRemaining > 0)
            return;
        const next = this.pendingId;
        this.pendingId = undefined;
        this.models.get(this.activeId).visible = false;
        this.activeId = next;
        this.models.get(next).visible = true;
        this.audio.play('ui');
        this.onChanged?.();
    }
    flashMuzzle() {
        const model = this.models.get(this.activeId);
        const flash = model.userData.muzzle;
        if (flash) {
            flash.visible = true;
            this.muzzle = flash;
            this.muzzleTimer = 0.045;
        }
    }
    createPistol(materials) {
        const group = new THREE.Group();
        group.position.set(0.34, -0.28, -0.62);
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.58), materials.material(PALETTE.metal));
        slide.position.z = -0.15;
        group.add(slide);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.18), materials.material(PALETTE.black));
        grip.position.set(0, -0.22, 0.04);
        grip.rotation.x = -0.2;
        group.add(grip);
        this.addMuzzle(group, materials, 0, -0.06, -0.48);
        return group;
    }
    createSmg(materials) {
        const group = new THREE.Group();
        group.position.set(0.34, -0.28, -0.62);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.75), materials.material(PALETTE.metal));
        body.position.z = -0.18;
        group.add(body);
        const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.18), materials.material(PALETTE.black));
        magazine.position.set(0, -0.3, -0.12);
        magazine.rotation.x = 0.12;
        group.add(magazine);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.35), materials.material(PALETTE.metalDark));
        stock.position.z = 0.38;
        group.add(stock);
        this.addMuzzle(group, materials, 0, 0, -0.63);
        return group;
    }
    createShotgun(materials) {
        const group = new THREE.Group();
        group.position.set(0.34, -0.28, -0.62);
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.65), materials.material(PALETTE.metal));
        receiver.position.z = -0.05;
        group.add(receiver);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.95, 8), materials.material(PALETTE.black));
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = -0.7;
        group.add(barrel);
        const pump = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.22, 0.35), materials.material(PALETTE.orange));
        pump.position.z = -0.45;
        group.add(pump);
        this.addMuzzle(group, materials, 0, 0, -1.18);
        return group;
    }
    addMuzzle(group, materials, x, y, z) {
        const flash = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.32, 6), materials.material(PALETTE.orange, PALETTE.orange, 3));
        flash.rotation.x = -Math.PI / 2;
        flash.position.set(x, y, z);
        flash.visible = false;
        group.add(flash);
        group.userData.muzzle = flash;
    }
}
