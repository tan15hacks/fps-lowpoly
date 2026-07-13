import { applyRadialDeadzone, clampLookDelta, damp, detectInitialInputMode, inputModeForPointer, isInsideAimCone, } from '../src/player/controlMath';
describe('control math', () => {
    it('defaults hybrid devices with a fine pointer to desktop mode', () => {
        expect(detectInitialInputMode(true, true, 10)).toBe('desktop');
    });
    it('uses touch mode for coarse touch-only devices', () => {
        expect(detectInitialInputMode(true, false, 5)).toBe('touch');
    });
    it('switches modality from the actual pointer type', () => {
        expect(inputModeForPointer('touch', 'desktop')).toBe('touch');
        expect(inputModeForPointer('mouse', 'touch')).toBe('desktop');
        expect(inputModeForPointer('', 'touch')).toBe('touch');
    });
    it('removes joystick drift inside the radial deadzone', () => {
        expect(applyRadialDeadzone(0.06, -0.04)).toEqual({ x: 0, y: 0 });
    });
    it('preserves joystick direction outside the deadzone', () => {
        const result = applyRadialDeadzone(0.6, 0.8);
        expect(Math.hypot(result.x, result.y)).toBeCloseTo(1, 6);
        expect(result.x / result.y).toBeCloseTo(0.75, 6);
    });
    it('clamps invalid and extreme look deltas', () => {
        expect(clampLookDelta(Number.NaN)).toBe(0);
        expect(clampLookDelta(999)).toBe(160);
        expect(clampLookDelta(-999, 80)).toBe(-80);
    });
    it('damps toward a target without overshooting', () => {
        const next = damp(75, 63, 12, 1 / 60);
        expect(next).toBeLessThan(75);
        expect(next).toBeGreaterThan(63);
    });
    it('accepts only directions inside the configured aim cone', () => {
        expect(isInsideAimCone(Math.cos(0.05), 0.1)).toBe(true);
        expect(isInsideAimCone(Math.cos(0.2), 0.1)).toBe(false);
    });
});
