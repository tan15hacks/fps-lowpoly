import { WAVES } from '../src/data/waves';
import { WaveManager } from '../src/waves/WaveManager';

describe('full wave progression', () => {
  it('completes all 15 waves with an active limit of one', () => {
    let active = 0;
    const completed: number[] = [];
    const manager = new WaveManager('soldier', () => active, () => 1, () => 0.2);
    manager.onSpawn = () => {
      expect(active).toBeLessThan(1);
      active += 1;
      return true;
    };
    manager.onWaveComplete = (wave) => completed.push(wave);

    for (let expectedWave = 1; expectedWave <= WAVES.length; expectedWave += 1) {
      expect(manager.startNext()).toBe(true);
      let safety = 0;
      while (manager.active && safety < 1000) {
        manager.update(10);
        if (active > 0) active = 0;
        manager.update(0);
        safety += 1;
      }
      expect(safety).toBeLessThan(1000);
      expect(manager.wave).toBe(expectedWave);
      expect(manager.complete).toBe(true);
    }

    expect(completed).toEqual(WAVES.map((wave) => wave.wave));
    expect(manager.victory).toBe(true);
    expect(manager.startNext()).toBe(false);
  });

  it('retains a queued enemy when the spawn target rejects it', () => {
    let attempts = 0;
    let active = 0;
    const manager = new WaveManager('soldier', () => active, () => 2, () => 0);
    manager.onSpawn = () => {
      attempts += 1;
      if (attempts === 1) return false;
      active += 1;
      return true;
    };

    manager.startNext();
    const initialRemaining = manager.remaining();
    manager.update(2);
    expect(manager.remaining()).toBe(initialRemaining);
    expect(active).toBe(0);

    manager.update(1);
    expect(manager.remaining()).toBe(initialRemaining);
    expect(active).toBe(1);
  });

  it('emits completion only once', () => {
    let active = 0;
    let completions = 0;
    const manager = new WaveManager('soldier', () => active, () => 20, () => 0);
    manager.onSpawn = () => {
      active += 1;
      return true;
    };
    manager.onWaveComplete = () => {
      completions += 1;
    };

    manager.startNext();
    for (let index = 0; index < 20; index += 1) manager.update(10);
    active = 0;
    manager.update(0);
    manager.update(10);
    manager.update(10);
    expect(completions).toBe(1);
  });
});
