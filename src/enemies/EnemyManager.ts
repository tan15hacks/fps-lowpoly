import * as THREE from 'three';
import type { Difficulty, EnemyKind } from '../types/game';
import { AudioManager } from '../core/AudioManager';
import { CollisionWorld } from '../world/CollisionWorld';
import { LowPolyMaterialFactory, PALETTE } from '../visuals/LowPolyMaterialFactory';
import { ParticleManager } from '../visuals/ParticleManager';
import { ProjectileSystem } from '../combat/ProjectileSystem';
import { PickupSystem } from '../combat/PickupSystem';
import { EnemyNavigation } from './EnemyNavigation';
import { Enemy } from './Enemy';
import { SPAWN_POINTS } from '../world/SpawnPoints';
import { raySphereDistance, type HitscanRay } from '../weapons/HitscanSystem';

export interface EnemyHitResult { enemy: Enemy; damage: number; critical: boolean; point: any; killed: boolean }

export class EnemyManager {
  readonly enemies: Enemy[] = [];
  private readonly navigation: EnemyNavigation;
  private readonly center = new THREE.Vector3(); private readonly weak = new THREE.Vector3();
  private readonly timers = new Set<number>(); private disposed = false;
  onPlayerDamage?: (damage: number, source: any) => void;
  onEnemyKilled?: (enemy: Enemy) => void;
  onBossHealth?: (ratio: number, name: string) => void;

  constructor(private scene: any, private materials: LowPolyMaterialFactory, private collision: CollisionWorld, private projectiles: ProjectileSystem, private pickups: PickupSystem, private particles: ParticleManager, private audio: AudioManager) {
    this.navigation = new EnemyNavigation(collision);
  }

  spawn(kind: EnemyKind, wave: number, difficulty: Difficulty, pointIndex?: number): Enemy {
    const enemy = new Enemy(kind, wave, difficulty, this.materials);
    const point = SPAWN_POINTS[pointIndex ?? Math.floor(Math.random() * SPAWN_POINTS.length)]!;
    enemy.group.position.set(point.x + (Math.random() - 0.5) * 2.5, 0, point.z + (Math.random() - 0.5) * 2.5);
    enemy.group.scale.setScalar(0.05); enemy.group.userData.spawnScale = kind === 'boss' ? 1.15 : 1;
    this.scene.add(enemy.group); this.enemies.push(enemy);
    if (kind === 'boss') this.audio.play('boss');
    return enemy;
  }

  update(delta: number, playerPosition: any, wave: number, difficulty: Difficulty): void {
    if (this.disposed) return;
    const positions = this.enemies.filter(e => e.alive).map(e => e.group.position);
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i]!;
      if (!enemy.alive) { this.remove(i, difficulty); continue; }
      const targetScale = enemy.group.userData.spawnScale as number;
      if (enemy.group.scale.x < targetScale * 0.99) enemy.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), Math.min(1, delta * 6));
      enemy.attackTimer -= delta; enemy.specialTimer -= delta; enemy.stateTimer -= delta;
      enemy.body.rotation.y += delta * (enemy.kind === 'runner' ? 1.2 : 0.25);
      const toPlayer = playerPosition.clone().sub(enemy.group.position); toPlayer.y = 0; const distance = toPlayer.length();
      if (toPlayer.lengthSq() > 0.01) enemy.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z) + Math.PI;
      this.updatePhases(enemy, wave);
      if (enemy.stateTimer > 0) { this.updateTelegraph(enemy); continue; }
      if (enemy.group.userData.attackEffect && !enemy.group.userData.attackTriggered) {
        enemy.group.userData.attackTriggered = true;
        const effect = enemy.group.userData.attackEffect as (() => void) | undefined;
        enemy.group.userData.attackEffect = undefined;
        effect?.();
        enemy.group.scale.y = enemy.group.userData.spawnScale as number;
        enemy.body.material.emissive?.setHex?.(0x000000);
        enemy.body.material.emissiveIntensity = 0;
        continue;
      }
      const lineOfSight = this.navigation.hasLineOfSight(enemy.group.position, playerPosition);
      if (enemy.kind === 'spitter') this.updateSpitter(enemy, playerPosition, distance, lineOfSight, delta, positions);
      else if (enemy.kind === 'boss') this.updateBoss(enemy, playerPosition, distance, lineOfSight, delta, wave, difficulty, positions);
      else this.updateMelee(enemy, playerPosition, distance, delta, positions);
      this.navigation.resolve(enemy.group.position, enemy.radius);
      this.updateStuck(enemy, delta);
      if (enemy.kind === 'boss') this.onBossHealth?.(enemy.healthRatio(), wave === 15 ? 'THE COLOSSUS — ENRAGED' : `ARMORED MUTANT MK-${wave / 5}`);
    }
  }

  hitRays(rays: HitscanRay[], damage: number, penetration = false, weakPointScale = 1, criticalMultiplier = 1.75): EnemyHitResult[] {
    const results: EnemyHitResult[] = [];
    for (const ray of rays) {
      const candidates: { enemy: Enemy; distance: number; critical: boolean }[] = [];
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const center = enemy.centerWorld(this.center.clone()); const weak = enemy.weakPointWorld(this.weak.clone());
        const bodyDistance = raySphereDistance(ray.origin, ray.direction, center, enemy.radius * 1.1);
        const weakDistance = raySphereDistance(ray.origin, ray.direction, weak, enemy.radius * 0.32 * weakPointScale);
        const distance = weakDistance ?? bodyDistance;
        if (distance === undefined || distance > ray.range) continue;
        const point = ray.origin.clone().addScaledVector(ray.direction, distance);
        if (this.collision.segmentBlocked(ray.origin.x, ray.origin.z, point.x, point.z)) continue;
        candidates.push({ enemy, distance, critical: weakDistance !== undefined });
      }
      candidates.sort((a, b) => a.distance - b.distance);
      const maxTargets = penetration ? 2 : 1;
      for (const candidate of candidates.slice(0, maxTargets)) {
        const point = ray.origin.clone().addScaledVector(ray.direction, candidate.distance);
        const applied = candidate.enemy.takeDamage(damage * (candidate.critical ? criticalMultiplier : 1), candidate.critical);
        if (applied <= 0) continue;
        this.particles.burst(point, candidate.critical ? PALETTE.orange : PALETTE.red, candidate.critical ? 9 : 5, 2.8);
        results.push({ enemy: candidate.enemy, damage: applied, critical: candidate.critical, point, killed: !candidate.enemy.alive });
      }
    }
    return results;
  }

  nearest(position: any, maxRange: number): Enemy | undefined {
    let best: Enemy | undefined; let bestDistance = maxRange;
    for (const enemy of this.enemies) { if (!enemy.alive) continue; const d = enemy.group.position.distanceTo(position); if (d < bestDistance && this.navigation.hasLineOfSight(position, enemy.group.position)) { best = enemy; bestDistance = d; } }
    return best;
  }

  damageRadius(position: any, radius: number, damage: number): number {
    let hits = 0;
    for (const enemy of this.enemies) { if (!enemy.alive) continue; const d = enemy.group.position.distanceTo(position); if (d <= radius) { enemy.takeDamage(damage * (1 - d / radius * 0.55), false); hits += 1; } }
    return hits;
  }

  aliveCount(): number { return this.enemies.filter(e => e.alive).length; }
  remainingBoss(): Enemy | undefined { return this.enemies.find(e => e.alive && e.kind === 'boss'); }
  clear(): void { this.enemies.forEach(enemy => { this.scene.remove(enemy.group); enemy.dispose(); }); this.enemies.length = 0; this.onBossHealth?.(0, ''); }
  dispose(): void { if (this.disposed) return; this.disposed = true; for (const timer of this.timers) window.clearTimeout(timer); this.timers.clear(); this.clear(); this.onPlayerDamage = undefined; this.onEnemyKilled = undefined; this.onBossHealth = undefined; }

  private updateMelee(enemy: Enemy, player: any, distance: number, delta: number, positions: any[]): void {
    const range = enemy.kind === 'brute' ? 2.4 : 1.25;
    if (distance <= range && enemy.attackTimer <= 0) {
      const windup = enemy.kind === 'brute' ? 0.65 : 0.24;
      this.beginAttack(enemy, windup, () => {
        const currentDistance = enemy.group.position.distanceTo(player);
        if (currentDistance <= range + 0.7 && this.navigation.hasLineOfSight(enemy.group.position, player)) this.onPlayerDamage?.(enemy.damage, enemy.group.position.clone());
        enemy.attackTimer = enemy.attackCooldown;
      });
      return;
    }
    if (enemy.kind === 'brute' && enemy.specialTimer <= 0 && distance < 4.2) {
      this.beginAttack(enemy, 0.9, () => {
        if (enemy.group.position.distanceTo(player) < 3.8) this.onPlayerDamage?.(enemy.damage * 1.25, enemy.group.position.clone());
        this.particles.burst(enemy.group.position.clone().add(new THREE.Vector3(0, 0.2, 0)), PALETTE.sandDark, 16, 5);
        enemy.specialTimer = 6.5;
      }); return;
    }
    const direction = this.navigation.steer(enemy.group.position, player, enemy.radius, positions);
    if (enemy.kind === 'runner' && distance > 2.5 && distance < 6 && enemy.specialTimer <= 0) { direction.multiplyScalar(1.8); enemy.specialTimer = 4.5; }
    enemy.group.position.addScaledVector(direction, enemy.speed * delta);
  }

  private updateSpitter(enemy: Enemy, player: any, distance: number, los: boolean, delta: number, positions: any[]): void {
    if (los && distance >= 6 && distance <= 17 && enemy.attackTimer <= 0) {
      this.beginAttack(enemy, 0.55, () => { const origin = enemy.group.position.clone().add(new THREE.Vector3(0, 1.4, 0)); const target = player.clone().add(new THREE.Vector3(0, 0.8, 0)); this.projectiles.spawn(origin, target, enemy.damage, 10); this.audio.play('acid'); enemy.attackTimer = enemy.attackCooldown; }); return;
    }
    let target = player;
    if (distance < 7) target = enemy.group.position.clone().add(enemy.group.position.clone().sub(player).normalize().multiplyScalar(6));
    else if (distance < 14 && los) { const side = new THREE.Vector3(-(player.z - enemy.group.position.z), 0, player.x - enemy.group.position.x).normalize().multiplyScalar(Math.sin(performance.now() * 0.001 + enemy.group.id) > 0 ? 4 : -4); target = enemy.group.position.clone().add(side); }
    const direction = this.navigation.steer(enemy.group.position, target, enemy.radius, positions); enemy.group.position.addScaledVector(direction, enemy.speed * delta);
  }

  private updateBoss(enemy: Enemy, player: any, distance: number, los: boolean, delta: number, wave: number, difficulty: Difficulty, positions: any[]): void {
    if (enemy.specialTimer <= 0) {
      const choice = Math.random();
      if (choice < 0.28 && distance > 5 && los) {
        this.beginAttack(enemy, 0.8, () => { const direction = player.clone().sub(enemy.group.position).setY(0).normalize(); for (let t = 0; t < 1.2; t += 0.1) { const next = enemy.group.position.clone().addScaledVector(direction, enemy.speed * 0.1 * 4.5); const r = this.collision.resolveCircle(next.x, next.z, enemy.radius); enemy.group.position.set(r.x, 0, r.z); } if (enemy.group.position.distanceTo(player) < 3) this.onPlayerDamage?.(enemy.damage * 1.4, enemy.group.position.clone()); });
      } else if (choice < 0.55) {
        this.beginAttack(enemy, 1.05, () => { if (enemy.group.position.distanceTo(player) < 5.5) this.onPlayerDamage?.(enemy.damage * 1.3, enemy.group.position.clone()); this.particles.burst(enemy.group.position.clone(), PALETTE.orange, 22, 7); });
      } else if (choice < 0.78) {
        this.beginAttack(enemy, 0.75, () => { for (let i = -1; i <= 1; i++) { const origin = enemy.group.position.clone().add(new THREE.Vector3(i * 0.8, 2.7, 0)); const target = player.clone().add(new THREE.Vector3(i * 1.4, 0.7, i * 0.4)); this.projectiles.spawn(origin, target, enemy.damage * 0.65, 9); } });
      } else if (this.enemies.length < 38) {
        this.beginAttack(enemy, 1.1, () => { for (let i = 0; i < (wave === 15 ? 5 : 3); i++) { const summoned = new Enemy('runner', wave, difficulty, this.materials); summoned.group.position.copy(enemy.group.position).add(new THREE.Vector3((Math.random() - 0.5) * 5, 0, (Math.random() - 0.5) * 5)); this.scene.add(summoned.group); this.enemies.push(summoned); } });
      }
      enemy.specialTimer = enemy.healthRatio() < 0.5 ? 3.2 : 4.7;
      return;
    }
    if (distance <= 2.8 && enemy.attackTimer <= 0) { this.beginAttack(enemy, 0.65, () => { if (enemy.group.position.distanceTo(player) < 3.5) this.onPlayerDamage?.(enemy.damage, enemy.group.position.clone()); enemy.attackTimer = 1.5; }); return; }
    const direction = this.navigation.steer(enemy.group.position, player, enemy.radius, positions); enemy.group.position.addScaledVector(direction, enemy.speed * delta * (enemy.healthRatio() < 0.5 ? 1.18 : 1));
  }

  private beginAttack(enemy: Enemy, windup: number, effect: () => void): void {
    enemy.stateTimer = windup; enemy.group.userData.attackEffect = effect; enemy.group.userData.attackTriggered = false;
    enemy.body.material.emissive?.setHex?.(PALETTE.orange); enemy.body.material.emissiveIntensity = 0.7;
  }

  private updateTelegraph(enemy: Enemy): void {
    enemy.group.scale.y = (enemy.group.userData.spawnScale as number) * (1 + Math.sin(performance.now() * 0.02) * 0.025);
  }

  private updatePhases(enemy: Enemy, wave: number): void {
    if (enemy.kind !== 'boss') return;
    const ratio = enemy.healthRatio(); const nextPhase = wave === 15 ? (ratio < 0.25 ? 4 : ratio < 0.5 ? 3 : ratio < 0.75 ? 2 : 1) : (ratio < 0.5 ? 2 : 1);
    if (nextPhase !== enemy.phase) { enemy.phase = nextPhase; enemy.specialTimer = 0.5; enemy.armorActive = true; enemy.weakPoint.visible = false; this.particles.burst(enemy.group.position.clone().add(new THREE.Vector3(0, 2, 0)), PALETTE.cyan, 24, 6); this.schedule(() => { if (enemy.alive) { enemy.armorActive = false; enemy.weakPoint.visible = true; } }, 2800); }
  }

  private updateStuck(enemy: Enemy, delta: number): void {
    const moved = enemy.group.position.distanceTo(enemy.lastPosition); if (moved < 0.03) enemy.stuckTimer += delta; else { enemy.stuckTimer = 0; enemy.lastPosition.copy(enemy.group.position); }
    if (enemy.stuckTimer > 2.5) { const angle = Math.random() * Math.PI * 2; enemy.group.position.x += Math.cos(angle) * 2; enemy.group.position.z += Math.sin(angle) * 2; this.navigation.resolve(enemy.group.position, enemy.radius); enemy.stuckTimer = 0; }
  }

  private schedule(callback: () => void, milliseconds: number): void { const timer = window.setTimeout(() => { this.timers.delete(timer); if (!this.disposed) callback(); }, milliseconds); this.timers.add(timer); }

  private remove(index: number, difficulty: Difficulty): void {
    const enemy = this.enemies[index]!; this.scene.remove(enemy.group); this.audio.play('enemyDeath'); this.particles.burst(enemy.group.position.clone().add(new THREE.Vector3(0, 0.6, 0)), enemy.kind === 'spitter' ? PALETTE.acid : PALETTE.red, enemy.kind === 'boss' ? 28 : 10, enemy.kind === 'boss' ? 8 : 4);
    this.pickups.drop(enemy.group.position, enemy.kind, difficulty, 1); this.onEnemyKilled?.(enemy); this.enemies.splice(index, 1); enemy.dispose(); if (enemy.kind === 'boss') this.onBossHealth?.(0, '');
  }
}
