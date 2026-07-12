import { createNeutralMobileInput } from '../src/core/InputManager';

describe('mobile input reset state', () => {
  it('clears every held and one-shot mobile action', () => {
    expect(createNeutralMobileInput()).toEqual({
      moveX: 0,
      moveZ: 0,
      lookX: 0,
      lookY: 0,
      fire: false,
      aim: false,
      jump: false,
      sprint: false,
      reload: false,
      interact: false,
      pause: false,
      switchDelta: 0,
    });
  });

  it('returns a new object for every reset', () => {
    const first = createNeutralMobileInput();
    const second = createNeutralMobileInput();
    first.fire = true;
    expect(second.fire).toBe(false);
    expect(first).not.toBe(second);
  });
});
