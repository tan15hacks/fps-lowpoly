import { resolveBackAction, shouldPauseForBackground, SingleFlightGuard } from '../src/core/RunLifecycle';

describe('run lifecycle transitions', () => {
  it('never dismisses the death dialog through the system back button', () => {
    expect(resolveBackAction('paused', true)).toBe('keep-death-dialog');
  });

  it('pauses only a currently playing run when the app backgrounds', () => {
    expect(shouldPauseForBackground('playing')).toBe(true);
    expect(shouldPauseForBackground('paused')).toBe(false);
    expect(shouldPauseForBackground('between')).toBe(false);
    expect(shouldPauseForBackground('ending')).toBe(false);
    expect(shouldPauseForBackground(undefined)).toBe(false);
  });

  it('maps back-button behavior without changing unrelated states', () => {
    expect(resolveBackAction('playing', false)).toBe('pause');
    expect(resolveBackAction('paused', false)).toBe('resume');
    expect(resolveBackAction('between', false)).toBe('consume');
    expect(resolveBackAction('ending', false)).toBe('consume');
    expect(resolveBackAction(undefined, false)).toBe('delegate');
  });

  it('rejects duplicate asynchronous starts until the first start releases', () => {
    const guard = new SingleFlightGuard();
    expect(guard.tryEnter()).toBe(true);
    expect(guard.tryEnter()).toBe(false);
    expect(guard.isActive).toBe(true);
    guard.leave();
    expect(guard.isActive).toBe(false);
    expect(guard.tryEnter()).toBe(true);
  });
});
