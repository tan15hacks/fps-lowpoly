import { WAVES } from '../src/data/waves';
import {
  activeEnemyLimit,
  buildWaveQueue,
  summonAllowance,
} from '../src/waves/waveQueue';
import type { WaveDefinition } from '../src/types/game';

describe('wave queue construction', () => {
  it('places a boss first and rotates spawn gates', () => {
    const queue = buildWaveQueue(WAVES[4]!, 4, () => 0);
    expect(queue[0]?.kind).toBe('boss');
    for (let index = 1; index < queue.length; index += 1) {
      expect(queue[index]?.spawnIndex).not.toBe(queue[index - 1]?.spawnIndex);
    }
  });

  it('interleaves normal enemy groups instead of exhausting one group first', () => {
    const definition: WaveDefinition = {
      wave: 1,
      groups: [
        { kind: 'runner', count: 2 },
        { kind: 'brute', count: 2 },
        { kind: 'spitter', count: 1 },
      ],
      spawnInterval: 1,
      boss: false,
    };
    const queue = buildWaveQueue(definition, 8, () => 0.25);
    expect(queue.map((item) => item.kind)).toEqual([
      'runner',
      'brute',
      'spitter',
      'runner',
      'brute',
    ]);
  });

  it('sanitizes active limits and caps boss summons to available slots', () => {
    expect(activeEnemyLimit(Number.NaN)).toBe(1);
    expect(activeEnemyLimit(3.9)).toBe(3);
    expect(summonAllowance(8, 10, 5)).toBe(2);
    expect(summonAllowance(10, 10, 5)).toBe(0);
  });
});
