import type { EnemyDefinition } from '../types/game';

export const ENEMIES: Record<string, EnemyDefinition> = {
  runner: { kind: 'runner', health: 55, speed: 4.2, damage: 9, attackCooldown: 0.8, reward: 5, radius: 0.55 },
  brute: { kind: 'brute', health: 260, speed: 1.8, damage: 24, attackCooldown: 2.4, reward: 18, radius: 1.05 },
  spitter: { kind: 'spitter', health: 90, speed: 2.5, damage: 14, attackCooldown: 2.2, reward: 12, radius: 0.65 },
  boss: { kind: 'boss', health: 1500, speed: 2.1, damage: 30, attackCooldown: 2.0, reward: 120, radius: 1.5 },
};
