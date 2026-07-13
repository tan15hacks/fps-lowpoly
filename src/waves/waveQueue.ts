import type { EnemyKind, WaveDefinition } from '../types/game';

export interface WaveQueueItem {
  kind: EnemyKind;
  delay: number;
  spawnIndex: number;
}

export function buildWaveQueue(
  definition: WaveDefinition,
  spawnPointCount: number,
  rng: () => number = Math.random,
): WaveQueueItem[] {
  const safeSpawnCount = Math.max(1, Math.floor(spawnPointCount));
  const bosses: EnemyKind[] = [];
  const groups = definition.groups
    .filter((group) => group.count > 0)
    .map((group) => ({ kind: group.kind, remaining: Math.floor(group.count) }));

  for (const group of groups) {
    if (group.kind !== 'boss') continue;
    for (let index = 0; index < group.remaining; index += 1) bosses.push('boss');
    group.remaining = 0;
  }

  const ordered: EnemyKind[] = [...bosses];
  while (groups.some((group) => group.remaining > 0)) {
    for (const group of groups) {
      if (group.remaining <= 0) continue;
      ordered.push(group.kind);
      group.remaining -= 1;
    }
  }

  let previousSpawn = -1;
  return ordered.map((kind) => {
    const spawnIndex = chooseSpawnIndex(safeSpawnCount, previousSpawn, rng);
    previousSpawn = spawnIndex;
    return {
      kind,
      spawnIndex,
      delay: definition.spawnInterval * (0.65 + clampUnit(rng()) * 0.7),
    };
  });
}

export function chooseSpawnIndex(
  spawnPointCount: number,
  previousIndex: number,
  rng: () => number = Math.random,
): number {
  const count = Math.max(1, Math.floor(spawnPointCount));
  let index = Math.min(count - 1, Math.floor(clampUnit(rng()) * count));
  if (count > 1 && index === previousIndex) index = (index + 1) % count;
  return index;
}

export function activeEnemyLimit(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

export function summonAllowance(
  activeCount: number,
  maximumActive: number,
  requested: number,
): number {
  const available = Math.max(0, activeEnemyLimit(maximumActive) - Math.max(0, activeCount));
  return Math.min(Math.max(0, Math.floor(requested)), available);
}

const clampUnit = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.min(0.999999, value)) : 0;
