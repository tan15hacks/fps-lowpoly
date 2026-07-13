import * as THREE from 'three';
import { PALETTE } from '../visuals/LowPolyMaterialFactory';
import { segmentSphereHit } from './projectileMath';
export class ProjectileSystem {
    scene;
    materials;
    collision;
    projectiles = [];
    hazards = [];
    pool = [];
    onPlayerHit;
    constructor(scene, materials, collision) {
        this.scene = scene;
        this.materials = materials;
        this.collision = collision;
    }
    spawn(origin, target, damage, speed = 10) {
        const mesh = this.pool.pop() ??
            new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), this.materials.material(PALETTE.acid, PALETTE.acid, 2));
        mesh.visible = true;
        mesh.position.copy(origin);
        this.scene.add(mesh);
        const velocity = target.clone().sub(origin).normalize().multiplyScalar(Math.max(0, speed));
        this.projectiles.push({ mesh, velocity, life: 4, damage, radius: 0.25 });
    }
    update(delta, playerPosition) {
        for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
            const projectile = this.projectiles[index];
            projectile.life -= delta;
            const previous = projectile.mesh.position.clone();
            const next = previous.clone().addScaledVector(projectile.velocity, delta);
            const hitWall = this.collision.segmentBlocked(previous.x, previous.z, next.x, next.z);
            if (hitWall) {
                projectile.mesh.position.copy(next);
                this.createHazard(next, projectile.damage * 0.32);
                this.removeProjectile(index);
                continue;
            }
            const playerHit = segmentSphereHit(previous, next, playerPosition, 0.75);
            if (playerHit) {
                projectile.mesh.position.copy(playerHit.point);
                this.onPlayerHit?.(projectile.damage, previous.clone());
                this.removeProjectile(index);
                continue;
            }
            projectile.mesh.position.copy(next);
            projectile.mesh.rotation.x += delta * 8;
            if (projectile.life <= 0) {
                this.createHazard(next, projectile.damage * 0.32);
                this.removeProjectile(index);
            }
        }
        for (let index = this.hazards.length - 1; index >= 0; index -= 1) {
            const hazard = this.hazards[index];
            hazard.life -= delta;
            hazard.tick -= delta;
            hazard.mesh.rotation.z += delta;
            hazard.mesh.material.opacity = Math.min(0.45, hazard.life * 0.2);
            const flatDistance = Math.hypot(hazard.mesh.position.x - playerPosition.x, hazard.mesh.position.z - playerPosition.z);
            if (flatDistance < 1.6 && hazard.tick <= 0) {
                this.onPlayerHit?.(hazard.damage, hazard.mesh.position.clone());
                hazard.tick = 0.65;
            }
            if (hazard.life <= 0) {
                this.scene.remove(hazard.mesh);
                hazard.mesh.geometry.dispose();
                this.hazards.splice(index, 1);
            }
        }
    }
    clear() {
        for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
            this.removeProjectile(index);
        }
        this.hazards.forEach((hazard) => {
            this.scene.remove(hazard.mesh);
            hazard.mesh.geometry.dispose();
        });
        this.hazards = [];
    }
    dispose() {
        this.onPlayerHit = undefined;
        this.clear();
        this.pool.forEach((mesh) => {
            this.scene.remove(mesh);
            mesh.geometry?.dispose?.();
        });
        this.pool = [];
    }
    removeProjectile(index) {
        const projectile = this.projectiles[index];
        this.scene.remove(projectile.mesh);
        projectile.mesh.visible = false;
        this.pool.push(projectile.mesh);
        this.projectiles.splice(index, 1);
    }
    createHazard(position, damage) {
        const mesh = new THREE.Mesh(new THREE.CircleGeometry(1.6, 12), this.materials.transparent(PALETTE.acid, 0.4));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.copy(position);
        mesh.position.y = 0.04;
        this.scene.add(mesh);
        this.hazards.push({ mesh, life: 4.2, damage, tick: 0 });
    }
}
