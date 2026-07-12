import * as THREE from 'three';
import { LowPolyMaterialFactory, PALETTE } from '../visuals/LowPolyMaterialFactory';

export class EnvironmentFactory {
  constructor(private readonly materials: LowPolyMaterialFactory) {}

  box(width: number, height: number, depth: number, color: number, x: number, y: number, z: number, cast = true): any {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), this.materials.material(color));
    mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true; return mesh;
  }

  rock(x: number, z: number, scale: number): any {
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 0), this.materials.material(PALETTE.sandDark));
    mesh.position.set(x, scale * 0.55, z); mesh.scale.y = 0.7; mesh.rotation.set(Math.random(), Math.random(), Math.random()); mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
  }

  crate(x: number, z: number, scale = 1): any {
    const group = new THREE.Group();
    group.add(this.box(1.5 * scale, 1.5 * scale, 1.5 * scale, PALETTE.metal, 0, 0.75 * scale, 0));
    const band = this.materials.material(PALETTE.orange);
    for (const offset of [-0.45, 0.45]) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 1.56 * scale, 1.56 * scale), band);
      mesh.position.x = offset * scale; group.add(mesh);
    }
    group.position.set(x, 0, z); return group;
  }

  antenna(x: number, z: number): any {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 7, 6), this.materials.material(PALETTE.metal));
    pole.position.y = 3.5; group.add(pole);
    for (let i = 0; i < 3; i += 1) {
      const dish = new THREE.Mesh(new THREE.ConeGeometry(0.75 - i * 0.12, 0.3, 8, 1, true), this.materials.material(PALETTE.cream));
      dish.position.set(0.45, 5.5 - i * 0.7, 0); dish.rotation.z = Math.PI / 2; group.add(dish);
    }
    group.position.set(x, 0, z); return group;
  }
}
