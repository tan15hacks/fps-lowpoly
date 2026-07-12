import * as THREE from 'three';
import { LowPolyMaterialFactory, PALETTE } from '../visuals/LowPolyMaterialFactory';
import { CollisionWorld } from '../world/CollisionWorld';

interface Projectile {
  mesh: any;
  velocity: any;
  life: number;
  damage: number;
  radius: number;
}

interface Hazard {
  mesh: any;
  life: number;
  damage: number;
  tick: number;
}

export class ProjectileSystem {
  private projectiles: Projectile[] = [];
  private hazards: Hazard[] = [];
  private pool: any[] = [];
  onPlayerHit?: (damage: number) => void;

  constructor(
    private scene: any,
    private materials: LowPolyMaterialFactory,
    private collision: CollisionWorld,
  ) {}

  spawn(origin: any, target: any, damage: number, speed = 10): void {
    const mesh =
      this.pool.pop() ??
      new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.16, 0),
        this.materials.material(PALETTE.acid, PALETTE.acid, 2),
      );
    mesh.visible = true;
    mesh.position.copy(origin);
    this.scene.add(mesh);
    const velocity = target.clone().sub(origin).normalize().multiplyScalar(speed);
    this.projectiles.push({ mesh, velocity, life: 4, damage, radius: 0.25 });
  }

  update(delta: number, playerPosition: any): void {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index]!;
      projectile.life -= delta;
      const previous = projectile.mesh.position.clone();
      projectile.mesh.position.addScaledVector(projectile.velocity, delta);
      projectile.mesh.rotation.x += delta * 8;
      const hitWall = this.collision.segmentBlocked(
        previous.x,
        previous.z,
        projectile.mesh.position.x,
        projectile.mesh.position.z,
      );
      const hitPlayer = projectile.mesh.position.distanceTo(playerPosition) < 0.75;
      if (hitPlayer) {
        this.onPlayerHit?.(projectile.damage);
        this.removeProjectile(index);
      } else if (hitWall || projectile.life <= 0) {
        this.createHazard(projectile.mesh.position, projectile.damage * 0.32);
        this.removeProjectile(index);
      }
    }
    for (let index = this.hazards.length - 1; index >= 0; index -= 1) {
      const hazard = this.hazards[index]!;
      hazard.life -= delta;
      hazard.tick -= delta;
      hazard.mesh.rotation.z += delta;
      hazard.mesh.material.opacity = Math.min(0.45, hazard.life * 0.2);
      const flatDistance = Math.hypot(
        hazard.mesh.position.x - playerPosition.x,
        hazard.mesh.position.z - playerPosition.z,
      );
      if (flatDistance < 1.6 && hazard.tick <= 0) {
        this.onPlayerHit?.(hazard.damage);
        hazard.tick = 0.65;
      }
      if (hazard.life <= 0) {
        this.scene.remove(hazard.mesh);
        hazard.mesh.geometry.dispose();
        this.hazards.splice(index, 1);
      }
    }
  }

  clear(): void {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      this.removeProjectile(index);
    }
    this.hazards.forEach((hazard) => {
      this.scene.remove(hazard.mesh);
      hazard.mesh.geometry.dispose();
    });
    this.hazards = [];
  }

  dispose(): void {
    this.onPlayerHit = undefined;
    this.clear();
    this.pool.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.geometry?.dispose?.();
    });
    this.pool = [];
  }

  private removeProjectile(index: number): void {
    const projectile = this.projectiles[index]!;
    this.scene.remove(projectile.mesh);
    projectile.mesh.visible = false;
    this.pool.push(projectile.mesh);
    this.projectiles.splice(index, 1);
  }

  private createHazard(position: any, damage: number): void {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(1.6, 12),
      this.materials.transparent(PALETTE.acid, 0.4),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position);
    mesh.position.y = 0.04;
    this.scene.add(mesh);
    this.hazards.push({ mesh, life: 4.2, damage, tick: 0 });
  }
}
