import { WAVES } from '../data/waves';
import type { Difficulty, EnemyKind, WaveDefinition } from '../types/game';
import { enemyScale } from '../utils/difficulty';

interface QueueItem { kind: EnemyKind; delay: number }

export class WaveManager {
  wave = 0; active = false; complete = false; victory = false;
  private queue: QueueItem[] = []; private spawnTimer = 0;
  onSpawn?: (kind: EnemyKind) => void; onWaveStarted?: (definition: WaveDefinition) => void; onWaveComplete?: (wave: number) => void;

  constructor(private readonly difficulty: Difficulty, private readonly activeCount: () => number, private readonly maxActive: () => number) {}

  startNext(): boolean {
    if (this.active || this.wave >= WAVES.length) return false;
    this.wave += 1; const definition = WAVES[this.wave - 1]!; this.queue = [];
    for (const group of definition.groups) for (let i = 0; i < group.count; i += 1) this.queue.push({ kind: group.kind, delay: definition.spawnInterval * (0.65 + Math.random() * 0.7) });
    if (definition.boss) this.queue.sort((a, b) => (a.kind === 'boss' ? 1 : 0) - (b.kind === 'boss' ? 1 : 0));
    this.active = true; this.complete = false; this.spawnTimer = 1.3; this.onWaveStarted?.(definition); return true;
  }

  update(delta: number): void {
    if (!this.active) return;
    this.spawnTimer -= delta;
    if (this.queue.length > 0 && this.spawnTimer <= 0 && this.activeCount() < this.maxActive()) {
      const item = this.queue.shift()!; this.onSpawn?.(item.kind); const pacing = enemyScale(this.wave, this.difficulty, item.kind).pacing; this.spawnTimer = item.delay * pacing;
    }
    if (this.queue.length === 0 && this.activeCount() === 0) {
      this.active = false; this.complete = true; this.victory = this.wave >= WAVES.length; this.onWaveComplete?.(this.wave);
    }
  }

  remaining(): number { return this.queue.length + this.activeCount(); }
  definition(): WaveDefinition | undefined { return this.wave > 0 ? WAVES[this.wave - 1] : undefined; }
}
