import { RewardGuard } from '../src/monetization/AdService';

describe('advertisement rewards', () => {
  it('deduplicates each reward per run', () => {
    const guard = new RewardGuard();
    expect(guard.claim('run-a', 'revive')).toBe(true);
    expect(guard.claim('run-a', 'revive')).toBe(false);
    expect(guard.claim('run-b', 'revive')).toBe(true);
  });
});
