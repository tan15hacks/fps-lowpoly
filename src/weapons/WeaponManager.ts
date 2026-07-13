import * as THREE from 'three';
import { WEAPONS } from '../data/weapons';
import type { Settings, WeaponId } from '../types/game';
import { UpgradeManager } from '../upgrades/UpgradeManager';
import { AudioManager } from '../core/AudioManager';
import { LowPolyMaterialFactory, PALETTE } from '../visuals/LowPolyMaterialFactory';
import { PlayerCamera } from '../player/PlayerCamera';
import { PlayerStats } from '../player/PlayerStats';
import { damp, type LookInputSource } from '../player/controlMath';
import { recoilMultiplier, weaponSwitchDuration } from '../utils/combatState';
import { Weapon } from './Weapon';
import { createHitscanRays, type HitscanRay } from './HitscanSystem';

export interface ShotEvent {
  weapon: WeaponId;
  rays: HitscanRay[];
  baseDamage: number;
}

export type AimDirectionResolver = (
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  range: number,
  maximumAngleRadians: number,
) => THREE.Vector3 | undefined;

export class WeaponManager {
  readonly weapons: Record<WeaponId, Weapon> = {
    pistol: new Weapon(WEAPONS.pistol!),
    smg: new Weapon(WEAPONS.smg!),
    shotgun: new Weapon(WEAPONS.shotgun!),
  };
  readonly unlocked = new Set<WeaponId>(['pistol']);
  activeId: WeaponId = 'pistol';
  private models = new Map<WeaponId, any>();
  private muzzle?: any;
  private swayTime = 0;
  private wasFireHeld = false;
  private muzzleTimer = 0;
  private disposed = false;
  private aimBlend = 0;
  private aimDirectionResolver?: AimDirectionResolver;
  private pendingId?: WeaponId;
  private switchRemaining = 0;
  private switchDuration = 0;
  onShot?: (event: ShotEvent) => void;
  onChanged?: () => void;

  constructor(
    private readonly camera: any,
    private readonly cameraController: PlayerCamera,
    private readonly stats: PlayerStats,
    private readonly upgrades: UpgradeManager,
    private readonly audio: AudioManager,
    private settings: Settings,
    materials: LowPolyMaterialFactory,
  ) {
    this.weapons.smg.reserve += stats.permanent.startingAmmo * 18;
    this.weapons.shotgun.reserve += stats.permanent.startingAmmo * 5;
    this.models.set('pistol', this.createPistol(materials));
    this.models.set('smg', this.createSmg(materials));
    this.models.set('shotgun', this.createShotgun(materials));
    this.models.forEach((model) => {
      model.visible = false;
      camera.add(model);
    });
    this.models.get(this.activeId)!.visible = true;
  }

  setSettings(settings: Settings): void {
    this.settings = settings;
  }

  setAimDirectionResolver(resolver?: AimDirectionResolver): void {
    this.aimDirectionResolver = resolver;
  }

  active(): Weapon {
    return this.weapons[this.activeId];
  }

  isSwitching(): boolean {
    return this.pendingId !== undefined;
  }

  unlock(id: WeaponId): void {
    this.unlocked.add(id);
    this.switchTo(id);
  }

  switchTo(id: WeaponId): void {
    if (this.disposed || !this.unlocked.has(id)) return;
    const currentTarget = this.pendingId ?? this.activeId;
    if (id === currentTarget) return;

    this.active().cancelReload();
    this.pendingId = id;
    this.switchDuration = weaponSwitchDuration(this.upgrades.level('switch'));
    this.switchRemaining = this.switchDuration;
    this.aimBlend = 0;
  }

  cycle(direction: number): void {
    const ids = (['pistol', 'smg', 'shotgun'] as WeaponId[]).filter((id) =>
      this.unlocked.has(id),
    );
    const current = this.pendingId ?? this.activeId;
    const index = ids.indexOf(current);
    this.switchTo(ids[(index + (direction > 0 ? 1 : -1) + ids.length) % ids.length]!);
  }

  update(
    delta: number,
    now: number,
    fire: boolean,
    reload: boolean,
    aiming: boolean,
    lookSource: LookInputSource,
  ): void {
    if (this.disposed) return;

    this.advanceSwitch(delta);
    const switching = this.isSwitching();
    const weapon = this.active();
    const capacity = this.capacity(this.activeId);
    const reloadMultiplier =
      (1 + this.stats.permanent.reloadSpeed * 0.06) *
      this.upgrades.multiplier('reload', 0.15);

    if (!switching) {
      if (reload && weapon.startReload(capacity, reloadMultiplier)) {
        this.audio.play('reload');
      }
      const shellLoaded = weapon.update(delta, capacity, reloadMultiplier);
      if (shellLoaded && weapon.definition.shellReload) this.audio.play('reload');
    }

    const wantsFire = !switching && fire && (weapon.definition.automatic || !this.wasFireHeld);
    if (wantsFire) {
      weapon.interruptShellReloadForFire();
      if (weapon.fire(now)) {
        const baseSpread = weapon.definition.spread * (aiming ? 0.55 : 1);
        const origin = this.camera.getWorldPosition(new THREE.Vector3());
        let forward = this.cameraController.forward();
        if (
          aiming &&
          lookSource === 'touch' &&
          this.settings.aimAssist &&
          this.aimDirectionResolver
        ) {
          forward =
            this.aimDirectionResolver(
              origin,
              forward,
              weapon.definition.range,
              THREE.MathUtils.degToRad(5.5),
            ) ?? forward;
        }
        const right = forward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
        const up = right.clone().cross(forward).normalize();
        const rays = createHitscanRays(
          origin,
          forward,
          right,
          up,
          weapon.definition.pellets,
          baseSpread,
          weapon.definition.range,
        );
        this.onShot?.({ weapon: this.activeId, rays, baseDamage: weapon.definition.damage });
        this.audio.play(this.activeId);
        const baseRecoil =
          this.activeId === 'shotgun' ? 0.65 : this.activeId === 'smg' ? 0.18 : 0.25;
        this.cameraController.addRecoil(
          baseRecoil * recoilMultiplier(this.upgrades.level('recoil')),
        );
        this.flashMuzzle();
      } else if (weapon.magazine <= 0 && now - weapon.lastShotAt > 0.25) {
        this.audio.play('empty');
        weapon.lastShotAt = now;
        if (this.settings.autoReload) {
          weapon.startReload(capacity, reloadMultiplier);
        }
      }
    }

    const effectiveAiming = aiming && !switching;
    this.aimBlend = damp(this.aimBlend, effectiveAiming ? 1 : 0, 14, delta);
    const model = this.models.get(this.activeId)!;
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

  capacity(id: WeaponId): number {
    const base = this.weapons[id].definition.magazine;
    if (id === 'pistol') return base + this.upgrades.level('pistolMag') * 4;
    if (id === 'smg') return base + this.upgrades.level('smgMag') * 8;
    return base + this.upgrades.level('shotgunMag') * 2;
  }

  restock(multiplier = 1): void {
    this.weapons.smg.reserve += Math.round(45 * multiplier);
    this.weapons.shotgun.reserve += Math.round(12 * multiplier);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.onShot = undefined;
    this.onChanged = undefined;
    this.aimDirectionResolver = undefined;
    this.pendingId = undefined;
    this.switchRemaining = 0;
    this.switchDuration = 0;
    this.wasFireHeld = false;
    this.muzzle = undefined;
    for (const weapon of Object.values(this.weapons)) weapon.cancelReload();
    this.models.forEach((model) => {
      this.camera.remove(model);
      model.traverse((object: any) => object.geometry?.dispose?.());
      model.clear?.();
    });
    this.models.clear();
  }

  private advanceSwitch(delta: number): void {
    if (!this.pendingId) return;
    this.switchRemaining = Math.max(0, this.switchRemaining - Math.max(0, delta));
    if (this.switchRemaining > 0) return;

    const next = this.pendingId;
    this.pendingId = undefined;
    this.models.get(this.activeId)!.visible = false;
    this.activeId = next;
    this.models.get(next)!.visible = true;
    this.audio.play('ui');
    this.onChanged?.();
  }

  private flashMuzzle(): void {
    const model = this.models.get(this.activeId)!;
    const flash = model.userData.muzzle as any;
    if (flash) {
      flash.visible = true;
      this.muzzle = flash;
      this.muzzleTimer = 0.045;
    }
  }

  private createPistol(materials: any): any {
    const group = new THREE.Group();
    group.position.set(0.34, -0.28, -0.62);
    const slide = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.16, 0.58),
      materials.material(PALETTE.metal),
    );
    slide.position.z = -0.15;
    group.add(slide);
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.34, 0.18),
      materials.material(PALETTE.black),
    );
    grip.position.set(0, -0.22, 0.04);
    grip.rotation.x = -0.2;
    group.add(grip);
    this.addMuzzle(group, materials, 0, -0.06, -0.48);
    return group;
  }

  private createSmg(materials: any): any {
    const group = new THREE.Group();
    group.position.set(0.34, -0.28, -0.62);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.24, 0.75),
      materials.material(PALETTE.metal),
    );
    body.position.z = -0.18;
    group.add(body);
    const magazine = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.42, 0.18),
      materials.material(PALETTE.black),
    );
    magazine.position.set(0, -0.3, -0.12);
    magazine.rotation.x = 0.12;
    group.add(magazine);
    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.35),
      materials.material(PALETTE.metalDark),
    );
    stock.position.z = 0.38;
    group.add(stock);
    this.addMuzzle(group, materials, 0, 0, -0.63);
    return group;
  }

  private createShotgun(materials: any): any {
    const group = new THREE.Group();
    group.position.set(0.34, -0.28, -0.62);
    const receiver = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.28, 0.65),
      materials.material(PALETTE.metal),
    );
    receiver.position.z = -0.05;
    group.add(receiver);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.95, 8),
      materials.material(PALETTE.black),
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.7;
    group.add(barrel);
    const pump = new THREE.Mesh(
      new THREE.BoxGeometry(0.31, 0.22, 0.35),
      materials.material(PALETTE.orange),
    );
    pump.position.z = -0.45;
    group.add(pump);
    this.addMuzzle(group, materials, 0, 0, -1.18);
    return group;
  }

  private addMuzzle(group: any, materials: any, x: number, y: number, z: number): void {
    const flash = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.32, 6),
      materials.material(PALETTE.orange, PALETTE.orange, 3),
    );
    flash.rotation.x = -Math.PI / 2;
    flash.position.set(x, y, z);
    flash.visible = false;
    group.add(flash);
    group.userData.muzzle = flash;
  }
}
