import { calculateRunCredits } from '../src/utils/rewards';
import { enemyScale } from '../src/utils/difficulty';

describe('difficulty and rewards', () => {
  it('rewards veteran more than recruit', () => {
    const base = { wave: 10, enemiesDefeated: 100, bossesDefeated: 2, shotsFired: 100, shotsHit: 70, coins: 80, victory: false };
    expect(calculateRunCredits({ ...base, difficulty: 'veteran' })).toBeGreaterThan(calculateRunCredits({ ...base, difficulty: 'recruit' }));
  });
  it('scales enemy health by wave', () => {
    expect(enemyScale(12, 'soldier', 'runner').health).toBeGreaterThan(enemyScale(1, 'soldier', 'runner').health);
  });
});
