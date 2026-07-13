import { WAVES } from '../data/waves';
import { enemyScale } from '../utils/difficulty';
export class WaveManager {
    difficulty;
    activeCount;
    maxActive;
    wave = 0;
    active = false;
    complete = false;
    victory = false;
    queue = [];
    spawnTimer = 0;
    onSpawn;
    onWaveStarted;
    onWaveComplete;
    constructor(difficulty, activeCount, maxActive) {
        this.difficulty = difficulty;
        this.activeCount = activeCount;
        this.maxActive = maxActive;
    }
    startNext() {
        if (this.active || this.wave >= WAVES.length)
            return false;
        this.wave += 1;
        const definition = WAVES[this.wave - 1];
        this.queue = [];
        for (const group of definition.groups)
            for (let i = 0; i < group.count; i += 1)
                this.queue.push({ kind: group.kind, delay: definition.spawnInterval * (0.65 + Math.random() * 0.7) });
        if (definition.boss)
            this.queue.sort((a, b) => (a.kind === 'boss' ? 1 : 0) - (b.kind === 'boss' ? 1 : 0));
        this.active = true;
        this.complete = false;
        this.spawnTimer = 1.3;
        this.onWaveStarted?.(definition);
        return true;
    }
    update(delta) {
        if (!this.active)
            return;
        this.spawnTimer -= delta;
        if (this.queue.length > 0 && this.spawnTimer <= 0 && this.activeCount() < this.maxActive()) {
            const item = this.queue.shift();
            this.onSpawn?.(item.kind);
            const pacing = enemyScale(this.wave, this.difficulty, item.kind).pacing;
            this.spawnTimer = item.delay * pacing;
        }
        if (this.queue.length === 0 && this.activeCount() === 0) {
            this.active = false;
            this.complete = true;
            this.victory = this.wave >= WAVES.length;
            this.onWaveComplete?.(this.wave);
        }
    }
    remaining() { return this.queue.length + this.activeCount(); }
    definition() { return this.wave > 0 ? WAVES[this.wave - 1] : undefined; }
}
