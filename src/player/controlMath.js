export function detectInitialInputMode(hasCoarsePrimaryPointer, hasFinePointer, maxTouchPoints) {
    return maxTouchPoints > 0 && hasCoarsePrimaryPointer && !hasFinePointer
        ? 'touch'
        : 'desktop';
}
export function inputModeForPointer(pointerType, current) {
    if (pointerType === 'touch' || pointerType === 'pen')
        return 'touch';
    if (pointerType === 'mouse')
        return 'desktop';
    return current;
}
export function applyRadialDeadzone(x, y, deadzone = 0.14) {
    const safeDeadzone = clamp(deadzone, 0, 0.95);
    const length = Math.hypot(x, y);
    if (!Number.isFinite(length) || length <= safeDeadzone)
        return { x: 0, y: 0 };
    const clampedLength = Math.min(1, length);
    const scaledLength = (clampedLength - safeDeadzone) / (1 - safeDeadzone);
    return {
        x: (x / length) * scaledLength,
        y: (y / length) * scaledLength,
    };
}
export function clampLookDelta(value, maximum = 160) {
    if (!Number.isFinite(value))
        return 0;
    return clamp(value, -Math.abs(maximum), Math.abs(maximum));
}
export function damp(current, target, rate, delta) {
    if (!Number.isFinite(current) || !Number.isFinite(target))
        return target;
    if (delta <= 0 || rate <= 0)
        return current;
    return current + (target - current) * (1 - Math.exp(-rate * delta));
}
export function isInsideAimCone(dot, maximumAngleRadians) {
    if (!Number.isFinite(dot) || !Number.isFinite(maximumAngleRadians))
        return false;
    return dot >= Math.cos(Math.max(0, maximumAngleRadians));
}
export function aimAssistScore(dot, distance, maximumRange) {
    const safeRange = Math.max(0.001, maximumRange);
    return (1 - clamp(dot, -1, 1)) * 24 + clamp(distance / safeRange, 0, 1) * 0.12;
}
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
