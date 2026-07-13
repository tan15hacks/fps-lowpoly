import * as THREE from 'three';
import { segmentSphereHit } from '../src/combat/projectileMath';

describe('swept projectile collision', () => {
  it('detects a player crossed between simulation points', () => {
    const hit = segmentSphereHit(
      new THREE.Vector3(-10, 0, 0),
      new THREE.Vector3(10, 0, 0),
      new THREE.Vector3(0, 0, 0),
      1,
    );
    expect(hit).toBeDefined();
    expect(hit!.t).toBeCloseTo(0.45, 6);
    expect(hit!.point.x).toBeCloseTo(-1, 6);
  });

  it('does not report a near miss', () => {
    const hit = segmentSphereHit(
      new THREE.Vector3(-10, 2, 0),
      new THREE.Vector3(10, 2, 0),
      new THREE.Vector3(0, 0, 0),
      1,
    );
    expect(hit).toBeUndefined();
  });

  it('reports an immediate hit when starting inside the player', () => {
    const hit = segmentSphereHit(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 0, 0),
      new THREE.Vector3(0, 0, 0),
      1,
    );
    expect(hit).toBeDefined();
    expect(hit!.t).toBe(0);
    expect(hit!.point.equals(new THREE.Vector3(0, 0, 0))).toBe(true);
  });

  it('handles a stationary projectile safely', () => {
    const hit = segmentSphereHit(
      new THREE.Vector3(2, 0, 0),
      new THREE.Vector3(2, 0, 0),
      new THREE.Vector3(0, 0, 0),
      1,
    );
    expect(hit).toBeUndefined();
  });
});
