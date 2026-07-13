import { calculateWeaponDamage, consumeAmmo, reloadMagazine } from '../src/utils/combatMath';
describe('combat math', () => {
    it('calculates permanent, run, and critical damage', () => {
        expect(calculateWeaponDamage(28, 2, 1, true, 1)).toBeCloseTo(28 * 1.12 * 1.12 * 1.95);
    });
    it('consumes ammunition safely', () => {
        expect(consumeAmmo(1)).toEqual({ magazine: 0, fired: true });
        expect(consumeAmmo(0)).toEqual({ magazine: 0, fired: false });
    });
    it('reloads only the required amount', () => {
        expect(reloadMagazine(3, 12, 5)).toEqual({ magazine: 8, reserve: 0, loaded: 5 });
    });
});
