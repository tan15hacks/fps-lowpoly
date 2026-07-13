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
import { activeEnemyLimit, summonAllowance } from '../waves/waveQueue';

export interface EnemyHitResult {
  enemy: Enemy;
  damage: number;
  critical: boolean;
  point: any;
  killed: boolean;
}

export class EnemyManager {
  readonly enemies: Enemy[] = [];
  private readonly navigation: EnemyNavigation;
  private readonly center = new THREE.Vector3();
  private readonly weak = new THREE.Vector3();
  private disposed = false;
  onPlayerDamage?: (damage: number, source: any) => void;
  onEnemyKilled?: (enemy: Enemy) => void;
  onBossHealth?: (ratio: number, name: string) => void;

  constructor(
    private scene: any,
    private materials: LowPolyMaterialFactory,
    private collision: CollisionWorld,
    private projectiles: ProjectileSystem,
    private pickups: PickupSystem,
    private particles: ParticleManager,
    private audio: AudioManager,
    private readonly maxActive: () => number = () => 35,
    private readonly rng: () => number = Math.random,
  ) {
    this.navigation = new EnemyNavigation(collision);
  }

  spawn(
    kind: EnemyKind,
    wave: number,
    difficulty: Difficulty,
    pointIndex?: number,
  ): Enemy | undefined {
    if (!this.hasCapacity()) return undefined;
    const normalizedIndex =
      ((pointIndex ?? Math.floor(this.rng() * SPAWN_POINTS.length)) %
        SPAWN_POINTS.length +
        SPAWN_POINTS.length) %
      SPAWN_POINTS.length;
    const point = SPAWN_POINTS[normalizedIndex]!;
    const desired = new THREE.Vector3(
      point.x + (this.rng() - 0.5) * 2.5,
      0,
      point.z + (this.rng() - 0.5) * 2.5,
    );
    return this.createEnemyAt(kind, wave, difficulty, desired, true);
  }

  update(
    delta: number,
    playerPosition: any,
    wave: number,
    difficulty: Difficulty,
  ): void {
    if (this.disposed) return;
    const positions = this.enemies
      .filter((enemy) => enemy.alive)
      .map((enemy) => enemy.group.position);

    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index]!;
      if (!enemy.alive) {
        this.remove(index, difficulty);
        continue;
      }

      const targetScale = enemy.spawnScale;
      if (enemy.group.scale.x < targetScale * 0.99) {
        enemy.group.scale.lerp(
          new THREE.Vector3(targetScale, targetScale, targetScale),
          Math.min(1, delta * 6),
        );
      }

      enemy.attackTimer -= delta;
      enemy.specialTimer -= delta;
      enemy.stateTimer -= delta;
      this.updatePhaseArmor(enemy, delta);
      enemy.body.rotation.y += delta * (enemy.kind === 'runner' ? 1.2 : 0.25);

      const toPlayer = playerPosition.clone().sub(enemy.group.position);
      toPlayer.y = 0;
      const distance = toPlayer.length();
      if (toPlayer.lengthSq() > 0.01) {
        enemy.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z) + Math.PI;
      }

      this.updatePhases(enemy, wave);
      if (enemy.stateTimer > 0) {
        this.updateTelegraph(enemy);
        enemy.stuckTimer = 0;
        enemy.stuckSampleTimer = 0;
        enemy.lastPosition.copy(enemy.group.position);
        continue;
      }

      if (enemy.group.userData.attackEffect && !enemy.group.userData.attackTriggered) {
        enemy.group.userData.attackTriggered = true;
        const effect = enemy.group.userData.attackEffect as (() => void) | undefined;
        enemy.group.userData.attackEffect = undefined;
        effect?.();
        enemy.group.scale.y = enemy.spawnScale;
        enemy.body.material.emissive?.setHex?.(0x000000);
        enemy.body.material.emissiveIntensity = 0;
        continue;
      }

      const lineOfSight = this.navigation.hasLineOfSight(
        enemy.group.position,
        playerPosition,
      );
      if (enemy.kind === 'spitter') {
        this.updateSpitter(
          enemy,
          playerPosition,
          distance,
          lineOfSight,
          delta,
          positions,
        );
      } else if (enemy.kind === 'boss') {
        this.updateBoss(
          enemy,
          playerPosition,
          distance,
          lineOfSight,
          delta,
          wave,
          difficulty,
          positions,
        );
      } else {
        this.updateMelee(enemy, playerPosition, distance, delta, positions);
      }

      this.navigation.resolve(enemy.group.position, enemy.radius);
      this.updateStuck(enemy, delta, playerPosition);
      if (enemy.kind === 'boss') {
        this.onBossHealth?.(
          enemy.healthRatio(),
          wave === 15 ? 'THE COLOSSUS — ENRAGED' : `ARMORED MUTANT MK-${wave / 5}`,
        );
      }
    }
  }

  hitRays(
    rays: HitscanRay[],
    damage: number,
    penetration = false,
    weakPointScale = 1,
    criticalMultiplier = 1.75,
  ): EnemyHitResult[] {
    const results: EnemyHitResult[] = [];
    for (const ray of rays) {
      const candidates: { enemy: Enemy; distance: number; critical: boolean }[] = [];
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const center = enemy.centerWorld(this.center.clone());
        const weak = enemy.weakPointWorld(this.weak.clone());
        const bodyDistance = raySphereDistance(
          ray.origin,
          ray.direction,
          center,
          enemy.radius * 1.1,
        );
        const weakDistance = raySphereDistance(
          ray.origin,
          ray.direction,
          weak,
          enemy.radius * 0.32 * weakPointScale,
        );
        const distance = weakDistance ?? bodyDistance;
        if (distance === undefined || distance > ray.range) continue;
        const point = ray.origin.clone().addScaledVector(ray.direction, distance);
        if (
          this.collision.segmentBlocked(
            ray.origin.x,
            ray.origin.z,
            point.x,
            point.z,
          )
        ) {
          continue;
        }
        candidates.push({
          enemy,
          distance,
          critical: weakDistance !== undefined,
        });
      }
      candidates.sort((left, right) => left.distance - right.distance);
      const maxTargets = penetration ? 2 : 1;
      for (const candidate of candidates.slice(0, maxTargets)) {
        const point = ray.origin
          .clone()
          .addScaledVector(ray.direction, candidate.distance);
        const applied = candidate.enemy.takeDamage(
          damage * (candidate.critical ? criticalMultiplier : 1),
          candidate.critical,
        );
        if (applied <= 0) continue;
        this.particles.burst(
          point,
          candidate.critical ? PALETTE.orange : PALETTE.red,
          candidate.critical ? 9 : 5,
          2.8,
        );
        results.push({
          enemy: candidate.enemy,
          damage: applied,
          critical: candidate.critical,
          point,
          killed: !candidate.enemy.alive,
        });
      }
    }
    return results;
  }

  nearest(position: any, maxRange: number): Enemy | undefined {
    let best: Enemy | undefined;
    let bestDistance = maxRange;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const distance = enemy.group.position.distanceTo(position);
      if (
        distance < bestDistance &&
        this.navigation.hasLineOfSight(position, enemy.group.position)
      ) {
        best = enemy;
        bestDistance = distance;
      }
    }
    return best;
  }

  damageRadius(position: any, radius: number, damage: number): number {
    let hits = 0;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const distance = enemy.group.position.distanceTo(position);
      if (distance <= radius) {
        const applied = enemy.takeDamage(
          damage * (1 - (distance / radius) * 0.55),
          false,
        );
        if (applied > 0) hits += 1;
      }
    }
    return hits;
  }

  aliveCount(): number {
    return this.enemies.reduce(
      (count, enemy) => count + (enemy.alive ? 1 : 0),
      0,
    );
  }

  remainingBoss(): Enemy | undefined {
    return this.enemies.find((enemy) => enemy.alive && enemy.kind === 'boss');
  }

  clear(): void {
    this.enemies.forEach((enemy) => {
      this.scene.remove(enemy.group);
      enemy.dispose();
    });
    this.enemies.length = 0;
    this.onBossHealth?.(0, '');
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.onPlayerDamage = undefined;
    this.onEnemyKilled = undefined;
    this.onBossHealth = undefined;
  }

  private hasCapacity(): boolean {
    return this.aliveCount() < activeEnemyLimit(this.maxActive());
  }

  private createEnemyAt(
    kind: EnemyKind,
    wave: number,
    difficulty: Difficulty,
    desired: THREE.Vector3,
    allowGateFallback: boolean,
  ): Enemy | undefined {
    if (!this.hasCapacity()) return undefined;
    const enemy = new Enemy(kind, wave, difficulty, this.materials);
    const position = this.resolveSpawnPosition(
      desired,
      enemy.radius,
      allowGateFallback,
    );
    if (!position) {
      enemy.dispose();
      return undefined;
    }

    enemy.group.position.copy(position);
    enemy.lastPosition.copy(position);
    this.scene.add(enemy.group);
    this.enemies.push(enemy);
    if (kind === 'boss') this.audio.play('boss');
    return enemy;
  }

  private resolveSpawnPosition(
    desired: THREE.Vector3,
    radius: number,
    allowGateFallback: boolean,
  ): THREE.Vector3 | undefined {
    const candidates: THREE.Vector3[] = [desired.clone()];
    const baseAngle = this.rng() * Math.PI * 2;
    for (let ring = 1; ring <= 3; ring += 1) {
      const distance = ring * 1.8;
      for (let step = 0; step < 8; step += 1) {
        const angle = baseAngle + (step / 8) * Math.PI * 2;
        candidates.push(
          desired
            .clone()
            .add(
              new THREE.Vector3(
                Math.cos(angle) * distance,
                0,
                Math.sin(angle) * distance,
              ),
            ),
        );
      }
    }

    if (allowGateFallback) {
      for (const gate of SPAWN_POINTS) {
        candidates.push(new THREE.Vector3(gate.x, 0, gate.z));
      }
    }

    for (const candidate of candidates) {
      const resolved = this.resolveGeometry(candidate, radius);
      if (resolved && this.isCrowdClear(resolved, radius)) return resolved;
    }
    return undefined;
  }

  private resolveGeometry(
    candidate: THREE.Vector3,
    radius: number,
  ): THREE.Vector3 | undefined {
    const limit = this.collision.boundary - radius;
    let x = clamp(candidate.x, -limit, limit);
    let z = clamp(candidate.z, -limit, limit);
    for (let iteration = 0; iteration < 3; iteration += 1) {
      const resolved = this.collision.resolveCircle(x, z, radius);
      x = clamp(resolved.x, -limit, limit);
      z = clamp(resolved.z, -limit, limit);
    }

    const point = new THREE.Vector3(x, 0, z);
    if (!this.isGeometryClear(point, radius)) return undefined;
    return point;
  }

  private isGeometryClear(position: THREE.Vector3, radius: number): boolean {
    const limit = this.collision.boundary - radius;
    if (Math.abs(position.x) > limit || Math.abs(position.z) > limit) return false;
    for (const obstacle of this.collision.obstacles) {
      const nearestX = clamp(position.x, obstacle.minX, obstacle.maxX);
      const nearestZ = clamp(position.z, obstacle.minZ, obstacle.maxZ);
      const dx = position.x - nearestX;
      const dz = position.z - nearestZ;
      if (dx * dx + dz * dz < radius * radius - 0.0001) return false;
    }
    return true;
  }

  private isCrowdClear(position: THREE.Vector3, radius: number): boolean {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const minimum = radius + enemy.radius + 0.25;
      if (enemy.group.position.distanceToSquared(position) < minimum * minimum) {
        return false;
      }
    }
    return true;
  }

  private updateMelee(
    enemy: Enemy,
    player: any,
    distance: number,
    delta: number,
    positions: any[],
  ): void {
    const range = enemy.kind === 'brute' ? 2.4 : 1.25;
    if (distance <= range && enemy.attackTimer <= 0) {
      const windup = enemy.kind === 'brute' ? 0.65 : 0.24;
      this.beginAttack(enemy, windup, () => {
        const currentDistance = enemy.group.position.distanceTo(player);
        if (
          currentDistance <= range + 0.7 &&
          this.navigation.hasLineOfSight(enemy.group.position, player)
        ) {
          this.onPlayerDamage?.(enemy.damage, enemy.group.position.clone());
        }
        enemy.attackTimer = enemy.attackCooldown;
      });
      return;
    }

    if (enemy.kind === 'brute' && enemy.specialTimer <= 0 && distance < 4.2) {
      this.beginAttack(enemy, 0.9, () => {
        if (enemy.group.position.distanceTo(player) < 3.8) {
          this.onPlayerDamage?.(enemy.damage * 1.25, enemy.group.position.clone());
        }
        this.particles.burst(
          enemy.group.position.clone().add(new THREE.Vector3(0, 0.2, 0)),
          PALETTE.sandDark,
          16,
          5,
        );
        enemy.specialTimer = 6.5;
      });
      return;
    }

    const direction = this.navigation.steer(
      enemy.group.position,
      player,
      enemy.radius,
      positions,
    );
    if (
      enemy.kind === 'runner' &&
      distance > 2.5 &&
      distance < 6 &&
      enemy.specialTimer <= 0
    ) {
      direction.multiplyScalar(1.8);
      enemy.specialTimer = 4.5;
    }
    enemy.group.position.addScaledVector(direction, enemy.speed * delta);
  }

  private updateSpitter(
    enemy: Enemy,
    player: any,
    distance: number,
    lineOfSight: boolean,
    delta: number,
    positions: any[],
  ): void {
    if (
      lineOfSight &&
      distance >= 6 &&
      distance <= 17 &&
      enemy.attackTimer <= 0
    ) {
      this.beginAttack(enemy, 0.55, () => {
        const origin = enemy.group.position
          .clone()
          .add(new THREE.Vector3(0, 1.4, 0));
        const target = player.clone().add(new THREE.Vector3(0, 0.8, 0));
        this.projectiles.spawn(origin, target, enemy.damage, 10);
        this.audio.play('acid');
        enemy.attackTimer = enemy.attackCooldown;
      });
      return;
    }

    let target = player;
    if (distance < 7) {
      target = enemy.group.position
        .clone()
        .add(
          enemy.group.position.clone().sub(player).normalize().multiplyScalar(6),
        );
    } else if (distance < 14 && lineOfSight) {
      const side = new THREE.Vector3(
        -(player.z - enemy.group.position.z),
        0,
        player.x - enemy.group.position.x,
      )
        .normalize()
        .multiplyScalar(
          Math.sin(performance.now() * 0.001 + enemy.group.id) > 0 ? 4 : -4,
        );
      target = enemy.group.position.clone().add(side);
    }
    const direction = this.navigation.steer(
      enemy.group.position,
      target,
      enemy.radius,
      positions,
    );
    enemy.group.position.addScaledVector(direction, enemy.speed * delta);
  }

  private updateBoss(
    enemy: Enemy,
    player: any,
    distance: number,
    lineOfSight: boolean,
    delta: number,
    wave: number,
    difficulty: Difficulty,
    positions: any[],
  ): void {
    if (enemy.specialTimer <= 0) {
      const choice = this.rng();
      const requestedSummons = wave === 15 ? 5 : 3;
      const availableSummons = summonAllowance(
        this.aliveCount(),
        this.maxActive(),
        requestedSummons,
      );

      if (choice < 0.28 && distance > 5 && lineOfSight) {
        this.beginAttack(enemy, 0.8, () => {
          const direction = player
            .clone()
            .sub(enemy.group.position)
            .setY(0)
            .normalize();
          for (let step = 0; step < 12; step += 1) {
            const next = enemy.group.position
              .clone()
              .addScaledVector(direction, enemy.speed * 0.45);
            const resolved = this.collision.resolveCircle(
              next.x,
              next.z,
              enemy.radius,
            );
            enemy.group.position.set(resolved.x, 0, resolved.z);
          }
          if (enemy.group.position.distanceTo(player) < 3) {
            this.onPlayerDamage?.(
              enemy.damage * 1.4,
              enemy.group.position.clone(),
            );
          }
        });
      } else if (choice < 0.55) {
        this.beginAttack(enemy, 1.05, () => {
          if (enemy.group.position.distanceTo(player) < 5.5) {
            this.onPlayerDamage?.(
              enemy.damage * 1.3,
              enemy.group.position.clone(),
            );
          }
          this.particles.burst(
            enemy.group.position.clone(),
            PALETTE.orange,
            22,
            7,
          );
        });
      } else if (choice < 0.78 || availableSummons <= 0) {
        this.beginBossVolley(enemy, player);
      } else {
        this.beginAttack(enemy, 1.1, () => {
          this.summonRunners(enemy, wave, difficulty, requestedSummons);
        });
      }

      enemy.specialTimer = enemy.healthRatio() < 0.5 ? 3.2 : 4.7;
      return;
    }

    if (distance <= 2.8 && enemy.attackTimer <= 0) {
      this.beginAttack(enemy, 0.65, () => {
        if (enemy.group.position.distanceTo(player) < 3.5) {
          this.onPlayerDamage?.(enemy.damage, enemy.group.position.clone());
        }
        enemy.attackTimer = 1.5;
      });
      return;
    }

    const direction = this.navigation.steer(
      enemy.group.position,
      player,
      enemy.radius,
      positions,
    );
    enemy.group.position.addScaledVector(
      direction,
      enemy.speed * delta * (enemy.healthRatio() < 0.5 ? 1.18 : 1),
    );
  }

  private beginBossVolley(enemy: Enemy, player: any): void {
    this.beginAttack(enemy, 0.75, () => {
      for (let index = -1; index <= 1; index += 1) {
        const origin = enemy.group.position
          .clone()
          .add(new THREE.Vector3(index * 0.8, 2.7, 0));
        const target = player
          .clone()
          .add(new THREE.Vector3(index * 1.4, 0.7, index * 0.4));
        this.projectiles.spawn(origin, target, enemy.damage * 0.65, 9);
      }
    });
  }

  private summonRunners(
    boss: Enemy,
    wave: number,
    difficulty: Difficulty,
    requested: number,
  ): number {
    const allowed = summonAllowance(
      this.aliveCount(),
      this.maxActive(),
      requested,
    );
    let spawned = 0;
    for (let index = 0; index < allowed; index += 1) {
      const angle =
        (index / Math.max(1, allowed)) * Math.PI * 2 + this.rng() * 0.35;
      const distance = boss.radius + 2.2 + (index % 2) * 1.1;
      const desired = boss.group.position
        .clone()
        .add(
          new THREE.Vector3(
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance,
          ),
        );
      if (this.createEnemyAt('runner', wave, difficulty, desired, false)) {
        spawned += 1;
      }
    }
    return spawned;
  }

  private beginAttack(enemy: Enemy, windup: number, effect: () => void): void {
    enemy.stateTimer = windup;
    enemy.group.userData.attackEffect = effect;
    enemy.group.userData.attackTriggered = false;
    enemy.body.material.emissive?.setHex?.(PALETTE.orange);
    enemy.body.material.emissiveIntensity = 0.7;
  }

  private updateTelegraph(enemy: Enemy): void {
    enemy.group.scale.y =
      enemy.spawnScale *
      (1 + Math.sin(performance.now() * 0.02) * 0.025);
  }

  private updatePhases(enemy: Enemy, wave: number): void {
    if (enemy.kind !== 'boss') return;
    const ratio = enemy.healthRatio();
    const nextPhase =
      wave === 15
        ? ratio < 0.25
          ? 4
          : ratio < 0.5
            ? 3
            : ratio < 0.75
              ? 2
              : 1
        : ratio < 0.5
          ? 2
          : 1;
    if (nextPhase === enemy.phase) return;

    enemy.phase = nextPhase;
    enemy.specialTimer = 0.5;
    enemy.armorActive = true;
    enemy.phaseArmorTimer = 2.8;
    enemy.weakPoint.visible = false;
    this.particles.burst(
      enemy.group.position.clone().add(new THREE.Vector3(0, 2, 0)),
      PALETTE.cyan,
      24,
      6,
    );
  }

  private updatePhaseArmor(enemy: Enemy, delta: number): void {
    if (!enemy.armorActive) return;
    enemy.phaseArmorTimer = Math.max(0, enemy.phaseArmorTimer - delta);
    if (enemy.phaseArmorTimer > 0) return;
    enemy.armorActive = false;
    enemy.weakPoint.visible = true;
  }

  private updateStuck(enemy: Enemy, delta: number, target: any): void {
    enemy.stuckSampleTimer += delta;
    if (enemy.stuckSampleTimer < 0.45) return;

    const sampleDuration = enemy.stuckSampleTimer;
    enemy.stuckSampleTimer = 0;
    const moved = enemy.group.position.distanceTo(enemy.lastPosition);
    const minimumMovement = Math.max(0.12, enemy.speed * sampleDuration * 0.1);
    const closeEnough =
      enemy.group.position.distanceTo(target) <
      (enemy.kind === 'boss'
        ? 4
        : enemy.kind === 'brute'
          ? 2.8
          : enemy.kind === 'spitter'
            ? 5.5
            : 1.7);

    if (moved < minimumMovement && !closeEnough) {
      enemy.stuckTimer += sampleDuration;
    } else {
      enemy.stuckTimer = 0;
    }
    enemy.lastPosition.copy(enemy.group.position);

    if (enemy.stuckTimer < 2.4) return;
    const recovery = this.findRecoveryPosition(enemy, target);
    if (recovery) {
      enemy.group.position.copy(recovery);
      enemy.lastPosition.copy(recovery);
    }
    enemy.stuckTimer = 0;
  }

  private findRecoveryPosition(enemy: Enemy, target: any): THREE.Vector3 | undefined {
    const forward = target.clone().sub(enemy.group.position).setY(0);
    if (forward.lengthSq() <= 0.001) forward.set(0, 0, -1);
    else forward.normalize();
    const side = new THREE.Vector3(-forward.z, 0, forward.x);
    const distance = Math.max(2.2, enemy.radius * 2.4);
    const offsets = [
      forward.clone().multiplyScalar(distance),
      side.clone().multiplyScalar(distance),
      side.clone().multiplyScalar(-distance),
      forward.clone().multiplyScalar(-distance * 0.8),
      forward.clone().add(side).normalize().multiplyScalar(distance),
      forward.clone().sub(side).normalize().multiplyScalar(distance),
    ];

    for (const offset of offsets) {
      const desired = enemy.group.position.clone().add(offset);
      const resolved = this.resolveSpawnPosition(desired, enemy.radius, false);
      if (
        resolved &&
        resolved.distanceToSquared(enemy.group.position) >= 0.75 * 0.75
      ) {
        return resolved;
      }
    }
    return undefined;
  }

  private remove(index: number, difficulty: Difficulty): void {
    const enemy = this.enemies[index]!;
    this.scene.remove(enemy.group);
    this.audio.play('enemyDeath');
    this.particles.burst(
      enemy.group.position.clone().add(new THREE.Vector3(0, 0.6, 0)),
      enemy.kind === 'spitter' ? PALETTE.acid : PALETTE.red,
      enemy.kind === 'boss' ? 28 : 10,
      enemy.kind === 'boss' ? 8 : 4,
    );
    this.pickups.drop(enemy.group.position, enemy.kind, difficulty, 1);
    this.onEnemyKilled?.(enemy);
    this.enemies.splice(index, 1);
    enemy.dispose();
    if (enemy.kind === 'boss') this.onBossHealth?.(0, '');
  }
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(maximum, value));
