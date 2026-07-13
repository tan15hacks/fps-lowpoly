export function resolveBackAction(state, hasDeathDialog) {
    if (hasDeathDialog)
        return 'keep-death-dialog';
    if (state === 'playing')
        return 'pause';
    if (state === 'paused')
        return 'resume';
    if (state === 'between' || state === 'ending')
        return 'consume';
    return 'delegate';
}
export function shouldPauseForBackground(state) {
    return state === 'playing';
}
export class SingleFlightGuard {
    active = false;
    tryEnter() {
        if (this.active)
            return false;
        this.active = true;
        return true;
    }
    leave() {
        this.active = false;
    }
    get isActive() {
        return this.active;
    }
}
