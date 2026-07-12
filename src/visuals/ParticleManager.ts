import * as THREE from 'three';
import { LowPolyMaterialFactory } from './LowPolyMaterialFactory';

interface Particle { mesh: any; velocity: any; life: number; maxLife: number }

export class ParticleManager {
  private active: Particle[] = []; private pool: any[] = [];
  constructor(private readonly scene: any, private readonly materials: LowPolyMaterialFactory) {}

  burst(position: any, color: number, count = 6, speed = 3): void {
    const limited = Math.min(18, count);
    for (let i = 0; i < limited; i += 1) {
      const mesh = this.pool.pop() ?? new THREE.Mesh(new THREE.TetrahedronGeometry(0.08, 0), this.materials.transparent(color, 0.9));
      mesh.material = this.materials.transparent(color, 0.9); mesh.position.copy(position); mesh.visible = true; this.scene.add(mesh);
      const velocity = new THREE.Vector3((Math.random()-0.5)*speed, Math.random()*speed, (Math.random()-0.5)*speed);
      this.active.push({ mesh, velocity, life: 0.45 + Math.random()*0.35, maxLife: 0.8 });
    }
  }

  update(delta: number): void {
    for (let i = this.active.length - 1; i >= 0; i -= 1) {
      const p = this.active[i]!; p.life -= delta; p.velocity.y -= 6*delta; p.mesh.position.addScaledVector(p.velocity, delta); p.mesh.scale.setScalar(Math.max(0.01, p.life/p.maxLife));
      if (p.life <= 0) { p.mesh.visible = false; this.scene.remove(p.mesh); this.pool.push(p.mesh); this.active.splice(i,1); }
    }
  }

  dispose(): void { [...this.active.map(p=>p.mesh), ...this.pool].forEach(mesh=>mesh.geometry?.dispose()); this.active=[]; this.pool=[]; }
}
