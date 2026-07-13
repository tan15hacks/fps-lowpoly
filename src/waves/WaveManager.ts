import { WAVES } from '../data/waves';
import type { Difficulty, EnemyKind, WaveDefinition } from '../types/game';
import { enemyScale } from '../utils/difficulty';
import { SPAWN_POINTS } from '../world/SpawnPoints';
import {
  activeEnemyLimit,
  buildWaveQueue,
  type WaveQueueItem,
} from './waveQueue';

export class WaveManager {
  wave = 0;
  active = false;
  complete = false;
  victory = false;
  private queue: WaveQueueItem[] = [];
  private spawnTimer = 0;
  private completionEmitted = false;
  onSpawn?: (kind: EnemyKind, spawnIndex: number) => boolean | void;
  onWaveStarted?: (definition: WaveDefinition) => void;
  onWaveComplete?: (wave: number) => void;

  constructor(
    private readonly difficulty: Difficulty,
    private readonly activeCount: () => number,
    private readonly maxActive: () => number,
    private readonly rng: () => number = Math.random,
  ) {}

  startNext(): boolean {
    if (this.active || this.wave >= WAVES.length) return false;
    this.wave += 1;
    const definition = WAVES[this.wave - 1]!;
    this.queue = buildWaveQueue(definition, SPAWN_POINTS.length, this.rng);
    this.active = true;
    this.complete = false;
    this.victory = false;
    this.completionEmitted = false;
    this.spawnTimer = 1.3;
    this.onWaveStarted?.(definition);
    return true;
  }

  update(delta: number): void {
    if (!this.active) return;
    this.spawnTimer -= Math.max(0, delta);
    const limit = activeEnemyLimit(this.maxActive());
    let safety = 0;

    while (
      this.queue.length > 0 &&
      this.spawnTimer <= 0 &&
      this.activeCount() < limit &&
      safety < limit + 1
    ) {
      const item = this.queue[0]!;
      const accepted = this.onSpawn?.(item.kind, item.spawnIndex) !== false;
      if (!accepted) {
        this.spawnTimer = 0.2;
        break;
      }

      this.queue.shift();
      const pacing = enemyScale(this.wave, this.difficulty, item.kind).pacing;
      this.spawnTimer += Math.max(0.05, item.delay * pacing);
      safety += 1;
    }

    if (
      this.queue.length === 0 &&
      this.activeCount() === 0 &&
      !this.completionEmitted
    ) {
      this.completionEmitted = true;
      this.active = false;
      this.complete = true;
      this.victory = this.wave >= WAVES.length;
      this.onWaveComplete?.(this.wave);
    }
  }

  remaining(): number {
    return this.queue.length + Math.max(0, this.activeCount());
  }

  definition(): WaveDefinition | undefined {
    return this.wave > 0 ? WAVES[this.wave - 1] : undefined;
  }
}
