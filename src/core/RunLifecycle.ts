export type RunState = 'playing' | 'paused' | 'between' | 'ending';

export type BackAction = 'keep-death-dialog' | 'pause' | 'resume' | 'consume' | 'delegate';

export function resolveBackAction(state: RunState | undefined, hasDeathDialog: boolean): BackAction {
  if (hasDeathDialog) return 'keep-death-dialog';
  if (state === 'playing') return 'pause';
  if (state === 'paused') return 'resume';
  if (state === 'between' || state === 'ending') return 'consume';
  return 'delegate';
}

export function shouldPauseForBackground(state: RunState | undefined): boolean {
  return state === 'playing';
}

export class SingleFlightGuard {
  private active = false;

  tryEnter(): boolean {
    if (this.active) return false;
    this.active = true;
    return true;
  }

  leave(): void {
    this.active = false;
  }

  get isActive(): boolean {
    return this.active;
  }
}
