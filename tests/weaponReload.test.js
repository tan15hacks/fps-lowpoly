import { WEAPONS } from '../src/data/weapons';
import { Weapon } from '../src/weapons/Weapon';
describe('weapon reload behavior', () => {
    it('fills an upgraded magazine to its real capacity', () => {
        const weapon = new Weapon(WEAPONS.smg);
        weapon.magazine = 10;
        weapon.reserve = 100;
        expect(weapon.startReload(1, 46)).toBe(true);
        expect(weapon.update(WEAPONS.smg.reloadTime, 46, 1)).toBe(true);
        expect(weapon.magazine).toBe(46);
        expect(weapon.reserve).toBe(64);
    });
    it('does not reload when already at upgraded capacity', () => {
        const weapon = new Weapon(WEAPONS.pistol);
        weapon.magazine = 16;
        expect(weapon.startReload(1, 16)).toBe(false);
    });
    it('loads shotgun shells one at a time without duplicating reserve ammo', () => {
        const weapon = new Weapon(WEAPONS.shotgun);
        weapon.magazine = 0;
        weapon.reserve = 3;
        expect(weapon.startReload(1, 8)).toBe(true);
        expect(weapon.update(WEAPONS.shotgun.reloadTime, 8, 1)).toBe(true);
        expect(weapon.magazine).toBe(1);
        expect(weapon.reserve).toBe(2);
        expect(weapon.reloadRemaining).toBeGreaterThan(0);
    });
    it('allows a shell reload to be interrupted and fired', () => {
        const weapon = new Weapon(WEAPONS.shotgun);
        weapon.magazine = 0;
        weapon.reserve = 4;
        weapon.startReload(1, 6);
        weapon.update(WEAPONS.shotgun.reloadTime, 6, 1);
        expect(weapon.interruptShellReloadForFire()).toBe(true);
        expect(weapon.reloadRemaining).toBe(0);
        expect(weapon.fire(1)).toBe(true);
        expect(weapon.magazine).toBe(0);
        expect(weapon.reserve).toBe(3);
    });
});
