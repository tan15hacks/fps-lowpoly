import * as THREE from 'three';
import { createHitscanRays, raySphereDistance } from '../src/weapons/HitscanSystem';

describe('hitscan system', () => {
  it('keeps every pellet inside a circular spread radius', () => {
    const values = [1, 0, 1, 0.25, 1, 0.5, 1, 0.75];
    let index = 0;
    const rays = createHitscanRays(
      new THREE.Vector3(),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      4,
      0.1,
      50,
      () => values[index++] ?? 0,
    );

    expect(rays).toHaveLength(4);
    for (const ray of rays) {
      const angularOffset = ray.direction.angleTo(new THREE.Vector3(0, 0, -1));
      expect(angularOffset).toBeLessThanOrEqual(Math.atan(0.1) + 1e-6);
      expect(ray.direction.length()).toBeCloseTo(1, 6);
    }
  });

  it('returns the nearest forward sphere intersection', () => {
    const distance = raySphereDistance(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0, -10),
      2,
    );
    expect(distance).toBeCloseTo(8, 6);
  });

  it('reports an immediate hit when the ray starts inside a sphere', () => {
    const distance = raySphereDistance(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0, 0),
      2,
    );
    expect(distance).toBe(0);
  });

  it('rejects spheres entirely behind the ray', () => {
    const distance = raySphereDistance(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0, 10),
      2,
    );
    expect(distance).toBeUndefined();
  });
});
