import * as THREE from 'three';
import { ENEMIES } from '../data/enemies';
import type { EnemyKind } from '../types/game';
import { LowPolyMaterialFactory, PALETTE } from '../visuals/LowPolyMaterialFactory';
import { enemyScale } from '../utils/difficulty';

export class Enemy {
  readonly group = new THREE.Group();
  readonly body: any;
  readonly head: any;
  readonly weakPoint: any;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  attackCooldown: number;
  reward: number;
  radius: number;
  alive = true;
  attackTimer = 0;
  stateTimer = 0;
  phase = 1;
  stuckTimer = 0;
  lastPosition = new THREE.Vector3();
  specialTimer = 2 + Math.random() * 2;
  armorActive = false;
  private flashTimer?: number;

  constructor(
    readonly kind: EnemyKind,
    wave: number,
    difficulty: 'recruit' | 'soldier' | 'veteran',
    materials: LowPolyMaterialFactory,
  ) {
    const base = ENEMIES[kind]!;
    const scale = enemyScale(wave, difficulty, kind);
    this.health = base.health * scale.health;
    this.maxHealth = this.health;
    this.speed = base.speed * scale.speed;
    this.damage = base.damage * scale.damage;
    this.attackCooldown = base.attackCooldown;
    this.reward = base.reward;
    this.radius = base.radius;
    const color =
      kind === 'runner'
        ? PALETTE.runner
        : kind === 'brute'
          ? PALETTE.brute
          : kind === 'spitter'
            ? PALETTE.spitter
            : PALETTE.boss;
    const height = kind === 'boss' ? 4.8 : kind === 'brute' ? 2.7 : 1.7;
    const width = kind === 'boss' ? 2.4 : kind === 'brute' ? 1.45 : 0.8;
    this.body = new THREE.Mesh(
      new THREE.DodecahedronGeometry(width * 0.62, 0),
      materials.material(color),
    );
    this.body.scale.set(1, height / (width * 1.2), 0.8);
    this.body.position.y = height * 0.48;
    this.body.castShadow = true;
    this.group.add(this.body);
    this.head = new THREE.Mesh(
      new THREE.IcosahedronGeometry(width * 0.42, 0),
      materials.material(color),
    );
    this.head.position.y = height * 0.88;
    this.head.position.z = -width * 0.22;
    this.head.castShadow = true;
    this.group.add(this.head);
    this.weakPoint = new THREE.Mesh(
      new THREE.OctahedronGeometry(width * 0.16, 0),
      materials.material(PALETTE.orange, PALETTE.orange, 1.5),
    );
    this.weakPoint.position.set(0, height * 0.9, -width * 0.58);
    this.group.add(this.weakPoint);
    const legs = kind === 'spitter' ? 4 : 2;
    for (let index = 0; index < legs; index += 1) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(width * 0.11, width * 0.14, height * 0.45, 5),
        materials.material(color),
      );
      leg.position.set(
        (index % 2 ? 1 : -1) * width * 0.24,
        height * 0.18,
        (index >= 2 ? 1 : -1) * width * 0.2,
      );
      leg.rotation.z = (index % 2 ? 1 : -1) * 0.15;
      this.group.add(leg);
    }
    if (kind === 'boss' || kind === 'brute') {
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(
          new THREE.CylinderGeometry(width * 0.13, width * 0.2, height * 0.58, 6),
          materials.material(color),
        );
        arm.position.set(side * width * 0.62, height * 0.5, 0);
        arm.rotation.z = side * 0.45;
        this.group.add(arm);
      }
    }
    this.group.userData.enemy = this;
    this.lastPosition.copy(this.group.position);
  }

  takeDamage(amount: number, _critical: boolean): number {
    if (!this.alive) return 0;
    const applied = this.armorActive ? amount * 0.25 : amount;
    this.health = Math.max(0, this.health - applied);
    this.body.material.emissive?.setHex?.(0xffffff);
    this.body.material.emissiveIntensity = 0.8;
    if (this.flashTimer !== undefined) window.clearTimeout(this.flashTimer);
    this.flashTimer = window.setTimeout(() => {
      this.flashTimer = undefined;
      if (!this.body.material) return;
      this.body.material.emissive?.setHex?.(0x000000);
      this.body.material.emissiveIntensity = 0;
    }, 55);
    if (this.health <= 0) this.alive = false;
    return applied;
  }

  healthRatio(): number {
    return this.health / this.maxHealth;
  }

  weakPointWorld(out: any): any {
    return this.weakPoint.getWorldPosition(out);
  }

  centerWorld(out: any): any {
    return this.body.getWorldPosition(out);
  }

  dispose(): void {
    if (this.flashTimer !== undefined) window.clearTimeout(this.flashTimer);
    this.flashTimer = undefined;
    this.group.traverse((object: any) => object.geometry?.dispose?.());
    this.group.clear();
  }
}
