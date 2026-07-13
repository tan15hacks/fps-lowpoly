import * as THREE from 'three';
import { selectAimAssistDirection } from '../src/player/AimAssist';

const origin = new THREE.Vector3(0, 1.6, 0);
const forward = new THREE.Vector3(0, 0, -1);

function targetAt(angleRadians: number, distance: number): THREE.Vector3 {
  return new THREE.Vector3(
    Math.sin(angleRadians) * distance,
    1.6,
    -Math.cos(angleRadians) * distance,
  );
}

describe('touch aim assist', () => {
  it('selects a visible target inside the configured cone', () => {
    const direction = selectAimAssistDirection(
      origin,
      forward,
      [targetAt(0.04, 20)],
      50,
      0.1,
    );
    expect(direction).toBeDefined();
    expect(direction!.angleTo(forward)).toBeCloseTo(0.04, 5);
  });

  it('does not target enemies outside the aim cone', () => {
    const direction = selectAimAssistDirection(
      origin,
      forward,
      [targetAt(0.3, 15)],
      50,
      0.1,
    );
    expect(direction).toBeUndefined();
  });

  it('does not target enemies beyond weapon range', () => {
    const direction = selectAimAssistDirection(
      origin,
      forward,
      [targetAt(0.02, 80)],
      50,
      0.1,
    );
    expect(direction).toBeUndefined();
  });

  it('skips a blocked target and chooses a valid alternative', () => {
    const blocked = targetAt(0.01, 12);
    const visible = targetAt(-0.05, 16);
    const direction = selectAimAssistDirection(
      origin,
      forward,
      [blocked, visible],
      50,
      0.1,
      (target) => target === blocked,
    );
    expect(direction).toBeDefined();
    expect(direction!.angleTo(forward)).toBeCloseTo(0.05, 5);
    expect(direction!.x).toBeLessThan(0);
  });

  it('prefers the best angular target rather than simply the nearest target', () => {
    const closeButWide = targetAt(0.08, 8);
    const fartherButCentered = targetAt(0.01, 24);
    const direction = selectAimAssistDirection(
      origin,
      forward,
      [closeButWide, fartherButCentered],
      50,
      0.1,
    );
    expect(direction).toBeDefined();
    expect(direction!.angleTo(forward)).toBeCloseTo(0.01, 5);
  });
});
