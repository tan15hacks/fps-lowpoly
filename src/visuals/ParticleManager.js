import * as THREE from 'three';
export class ParticleManager {
    scene;
    materials;
    active = [];
    pool = [];
    constructor(scene, materials) {
        this.scene = scene;
        this.materials = materials;
    }
    burst(position, color, count = 6, speed = 3) {
        const limited = Math.min(18, count);
        for (let i = 0; i < limited; i += 1) {
            const mesh = this.pool.pop() ?? new THREE.Mesh(new THREE.TetrahedronGeometry(0.08, 0), this.materials.transparent(color, 0.9));
            mesh.material = this.materials.transparent(color, 0.9);
            mesh.position.copy(position);
            mesh.visible = true;
            this.scene.add(mesh);
            const velocity = new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed, (Math.random() - 0.5) * speed);
            this.active.push({ mesh, velocity, life: 0.45 + Math.random() * 0.35, maxLife: 0.8 });
        }
    }
    update(delta) {
        for (let i = this.active.length - 1; i >= 0; i -= 1) {
            const p = this.active[i];
            p.life -= delta;
            p.velocity.y -= 6 * delta;
            p.mesh.position.addScaledVector(p.velocity, delta);
            p.mesh.scale.setScalar(Math.max(0.01, p.life / p.maxLife));
            if (p.life <= 0) {
                p.mesh.visible = false;
                this.scene.remove(p.mesh);
                this.pool.push(p.mesh);
                this.active.splice(i, 1);
            }
        }
    }
    dispose() { [...this.active.map(p => p.mesh), ...this.pool].forEach(mesh => mesh.geometry?.dispose()); this.active = []; this.pool = []; }
}
