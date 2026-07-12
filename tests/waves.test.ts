import { WaveManager } from '../src/waves/WaveManager';

describe('wave manager', () => {
  it('spawns the entire first wave and completes after enemies are removed', () => {
    let active = 0;
    let completed = 0;
    const manager = new WaveManager('soldier', () => active, () => 35);
    manager.onSpawn = () => { active += 1; };
    manager.onWaveComplete = () => { completed += 1; };
    expect(manager.startNext()).toBe(true);
    for (let i = 0; i < 20; i += 1) manager.update(1);
    expect(active).toBe(6);
    active = 0;
    manager.update(1);
    expect(completed).toBe(1);
    expect(manager.complete).toBe(true);
  });
});
