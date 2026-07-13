import * as THREE from 'three';
import { DEFAULT_SETTINGS } from '../src/core/SettingsManager';
import type { AudioManager } from '../src/core/AudioManager';
import { LowPolyMaterialFactory } from '../src/visuals/LowPolyMaterialFactory';
import { PlayerCamera } from '../src/player/PlayerCamera';
import { PlayerStats } from '../src/player/PlayerStats';
import { UpgradeManager } from '../src/upgrades/UpgradeManager';
import { WeaponManager } from '../src/weapons/WeaponManager';
import type { PermanentLevels } from '../src/types/game';

const permanent: PermanentLevels = {
  health: 0,
  armor: 0,
  pistolDamage: 0,
  smgDamage: 0,
  shotgunDamage: 0,
  reloadSpeed: 0,
  startingAmmo: 0,
  coinBonus: 0,
  turretEfficiency: 0,
  healingEfficiency: 0,
};

function createManager(quickSlingStacks = 0): {
  manager: WeaponManager;
  materials: LowPolyMaterialFactory;
} {
  const camera = new THREE.PerspectiveCamera(75, 1, 0.05, 120);
  const upgrades = new UpgradeManager();
  for (let index = 0; index < quickSlingStacks; index += 1) upgrades.apply('switch');
  const stats = new PlayerStats(permanent, upgrades);
  const materials = new LowPolyMaterialFactory();
  const audio = { play: () => undefined } as unknown as AudioManager;
  const manager = new WeaponManager(
    camera,
    new PlayerCamera(camera, { ...DEFAULT_SETTINGS }),
    stats,
    upgrades,
    audio,
    { ...DEFAULT_SETTINGS },
    materials,
  );
  manager.unlocked.add('smg');
  return { manager, materials };
}

describe('weapon switching', () => {
  it('blocks firing until the switch finishes', () => {
    const { manager, materials } = createManager();
    let shots = 0;
    manager.onShot = () => {
      shots += 1;
    };
    const pistolAmmo = manager.weapons.pistol.magazine;

    manager.switchTo('smg');
    manager.update(0.1, 1, true, false, false, 'mouse');

    expect(manager.isSwitching()).toBe(true);
    expect(manager.activeId).toBe('pistol');
    expect(manager.weapons.pistol.magazine).toBe(pistolAmmo);
    expect(shots).toBe(0);

    manager.dispose();
    materials.dispose();
  });

  it('completes a Quick Sling switch sooner than a base switch', () => {
    const base = createManager(0);
    const quick = createManager(1);
    base.manager.switchTo('smg');
    quick.manager.switchTo('smg');

    base.manager.update(0.25, 1, false, false, false, 'mouse');
    quick.manager.update(0.25, 1, false, false, false, 'mouse');

    expect(base.manager.activeId).toBe('pistol');
    expect(base.manager.isSwitching()).toBe(true);
    expect(quick.manager.activeId).toBe('smg');
    expect(quick.manager.isSwitching()).toBe(false);

    base.manager.dispose();
    quick.manager.dispose();
    base.materials.dispose();
    quick.materials.dispose();
  });
});
