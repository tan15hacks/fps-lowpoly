export type InputMode = 'desktop' | 'touch';
export type LookInputSource = 'mouse' | 'touch';

export interface AxisPair {
  x: number;
  y: number;
}

export function detectInitialInputMode(
  hasCoarsePrimaryPointer: boolean,
  hasFinePointer: boolean,
  maxTouchPoints: number,
): InputMode {
  return maxTouchPoints > 0 && hasCoarsePrimaryPointer && !hasFinePointer
    ? 'touch'
    : 'desktop';
}

export function inputModeForPointer(pointerType: string, current: InputMode): InputMode {
  if (pointerType === 'touch' || pointerType === 'pen') return 'touch';
  if (pointerType === 'mouse') return 'desktop';
  return current;
}

export function applyRadialDeadzone(
  x: number,
  y: number,
  deadzone = 0.14,
): AxisPair {
  const safeDeadzone = clamp(deadzone, 0, 0.95);
  const length = Math.hypot(x, y);
  if (!Number.isFinite(length) || length <= safeDeadzone) return { x: 0, y: 0 };

  const clampedLength = Math.min(1, length);
  const scaledLength = (clampedLength - safeDeadzone) / (1 - safeDeadzone);
  return {
    x: (x / length) * scaledLength,
    y: (y / length) * scaledLength,
  };
}

export function clampLookDelta(value: number, maximum = 160): number {
  if (!Number.isFinite(value)) return 0;
  return clamp(value, -Math.abs(maximum), Math.abs(maximum));
}

export function damp(current: number, target: number, rate: number, delta: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(target)) return target;
  if (delta <= 0 || rate <= 0) return current;
  return current + (target - current) * (1 - Math.exp(-rate * delta));
}

export function isInsideAimCone(dot: number, maximumAngleRadians: number): boolean {
  if (!Number.isFinite(dot) || !Number.isFinite(maximumAngleRadians)) return false;
  return dot >= Math.cos(Math.max(0, maximumAngleRadians));
}

export function aimAssistScore(dot: number, distance: number, maximumRange: number): number {
  const safeRange = Math.max(0.001, maximumRange);
  return (1 - clamp(dot, -1, 1)) * 24 + clamp(distance / safeRange, 0, 1) * 0.12;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(maximum, value));
