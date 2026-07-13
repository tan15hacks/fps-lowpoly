import { appliedDamage, cappedHealingRequest, lifeStealCap, recoilMultiplier, weaponSwitchDuration, } from '../src/utils/combatState';
describe('combat state helpers', () => {
    it('makes Quick Sling shorten switch duration by speed stacks', () => {
        expect(weaponSwitchDuration(0)).toBeCloseTo(0.32, 6);
        expect(weaponSwitchDuration(1)).toBeCloseTo(0.32 / 1.3, 6);
        expect(weaponSwitchDuration(2)).toBeCloseTo(0.32 / 1.6, 6);
    });
    it('applies Counterweight to recoil with a safe floor', () => {
        expect(recoilMultiplier(0)).toBe(1);
        expect(recoilMultiplier(1)).toBeCloseTo(0.82, 6);
        expect(recoilMultiplier(4)).toBeCloseTo(0.28, 6);
        expect(recoilMultiplier(99)).toBeCloseTo(0.28, 6);
    });
    it('caps Biotic Recovery per wave', () => {
        expect(lifeStealCap(0)).toBe(0);
        expect(lifeStealCap(2)).toBe(36);
        expect(cappedHealingRequest(8, 32, 36)).toEqual({
            requested: 8,
            allowed: 4,
            remaining: 4,
        });
        expect(cappedHealingRequest(8, 36, 36).allowed).toBe(0);
    });
    it('never counts overkill or negative damage', () => {
        expect(appliedDamage(10, 100)).toBe(10);
        expect(appliedDamage(100, 40, 0.25)).toBe(10);
        expect(appliedDamage(100, -20)).toBe(0);
    });
});
