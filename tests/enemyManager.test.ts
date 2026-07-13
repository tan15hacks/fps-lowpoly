import * as THREE from 'three';
import { EnemyManager } from '../src/enemies/EnemyManager';
import { CollisionWorld } from '../src/world/CollisionWorld';
import { LowPolyMaterialFactory } from '../src/visuals/LowPolyMaterialFactory';

function createManager(
  maximum = 3,
  rng: () => number = () => 0.5,
  collision = new CollisionWorld(),
) {
  const scene = new THREE.Scene();
  const materials = new LowPolyMaterialFactory();
  const manager = new EnemyManager(
    scene,
    materials,
    collision,
    { spawn: vi.fn() } as any,
    { drop: vi.fn() } as any,
    { burst: vi.fn() } as any,
    { play: vi.fn() } as any,
    () => maximum,
    rng,
  );
  return { manager, materials, collision };
}

describe('enemy manager', () => {
  it('never spawns beyond the configured active cap', () => {
    const { manager, materials } = createManager(2);
    expect(manager.spawn('runner', 1, 'soldier', 0)).toBeDefined();
    expect(manager.spawn('runner', 1, 'soldier', 2)).toBeDefined();
    expect(manager.spawn('runner', 1, 'soldier', 4)).toBeUndefined();
    expect(manager.aliveCount()).toBe(2);
    manager.dispose();
    materials.dispose();
  });

  it('collision-resolves a gate spawn outside an obstacle and arena edge', () => {
    const collision = new CollisionWorld();
    collision.addBox(-27, -24, 4, 4);
    const { manager, materials } = createManager(2, () => 0.5, collision);
    const enemy = manager.spawn('runner', 1, 'soldier', 0)!;
    const position = enemy.group.position;
    const obstacle = collision.obstacles[0]!;
    const nearestX = Math.max(obstacle.minX, Math.min(position.x, obstacle.maxX));
    const nearestZ = Math.max(obstacle.minZ, Math.min(position.z, obstacle.maxZ));
    const distance = Math.hypot(position.x - nearestX, position.z - nearestZ);

    expect(distance).toBeGreaterThanOrEqual(enemy.radius - 0.001);
    expect(Math.abs(position.x)).toBeLessThanOrEqual(collision.boundary - enemy.radius);
    expect(Math.abs(position.z)).toBeLessThanOrEqual(collision.boundary - enemy.radius);
    manager.dispose();
    materials.dispose();
  });

  it('caps boss summons and initializes them through the normal spawn path', () => {
    const { manager, materials } = createManager(3, () => 0.9);
    const boss = manager.spawn('boss', 15, 'soldier', 0)!;
    boss.specialTimer = -1;
    const player = new THREE.Vector3(0, 0, 0);

    manager.update(0.016, player, 15, 'soldier');
    manager.update(1.2, player, 15, 'soldier');

    expect(manager.aliveCount()).toBeLessThanOrEqual(3);
    const summons = manager.enemies.filter((enemy) => enemy.kind === 'runner');
    expect(summons).toHaveLength(2);
    for (const summon of summons) {
      expect(summon.group.userData.spawnScale).toBe(1);
      expect(Number.isFinite(summon.group.scale.x)).toBe(true);
      expect(summon.lastPosition.distanceTo(summon.group.position)).toBe(0);
    }
    manager.dispose();
    materials.dispose();
  });

  it('keeps a newer boss armor phase active for its full duration', () => {
    const { manager, materials } = createManager(1, () => 0.5);
    const boss = manager.spawn('boss', 15, 'soldier', 0)!;
    boss.specialTimer = 999;
    const player = new THREE.Vector3(0, 0, 0);

    boss.health = boss.maxHealth * 0.7;
    manager.update(0, player, 15, 'soldier');
    expect(boss.phase).toBe(2);
    expect(boss.armorActive).toBe(true);

    boss.health = boss.maxHealth * 0.45;
    manager.update(1, player, 15, 'soldier');
    expect(boss.phase).toBe(3);
    expect(boss.phaseArmorTimer).toBeCloseTo(2.8, 5);

    manager.update(2, player, 15, 'soldier');
    expect(boss.armorActive).toBe(true);
    manager.update(0.9, player, 15, 'soldier');
    expect(boss.armorActive).toBe(false);
    expect(boss.weakPoint.visible).toBe(true);
    manager.dispose();
    materials.dispose();
  });

  it('uses a collision-resolved recovery position for a stuck enemy', () => {
    const { manager, materials } = createManager(2, () => 0.5);
    const enemy = manager.spawn('runner', 1, 'soldier', 0)!;
    const before = enemy.group.position.clone();
    enemy.speed = 0;
    enemy.stuckTimer = 2.4;
    enemy.stuckSampleTimer = 0.45;
    enemy.lastPosition.copy(enemy.group.position);

    manager.update(0, new THREE.Vector3(0, 0, 0), 1, 'soldier');

    expect(enemy.group.position.distanceTo(before)).toBeGreaterThan(0.75);
    expect(enemy.stuckTimer).toBe(0);
    manager.dispose();
    materials.dispose();
  });
});
