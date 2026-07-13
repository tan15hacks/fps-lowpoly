import { clampLookDelta, detectInitialInputMode, inputModeForPointer, } from '../player/controlMath';
export const createNeutralMobileInput = () => ({
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
export class InputManager {
    canvas;
    keys = new Set();
    mouseButtons = new Set();
    lookX = 0;
    lookY = 0;
    switchDelta = 0;
    justPressed = new Set();
    mobile = createNeutralMobileInput();
    inputMode;
    lastLookSource;
    suppressMouseUntilRelease = false;
    hadPointerLock = false;
    lastWheelAt = -Infinity;
    onPointerLockLost;
    constructor(canvas) {
        this.canvas = canvas;
        const supportsMatchMedia = typeof matchMedia === 'function';
        const coarse = supportsMatchMedia && matchMedia('(pointer: coarse)').matches;
        const fine = supportsMatchMedia && matchMedia('(any-pointer: fine)').matches;
        this.inputMode = detectInitialInputMode(coarse, fine, navigator.maxTouchPoints ?? 0);
        this.lastLookSource = this.inputMode === 'touch' ? 'touch' : 'mouse';
        window.addEventListener('keydown', this.onKeyDown, { passive: false });
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('mouseup', this.onMouseUp);
        window.addEventListener('wheel', this.onWheel, { passive: false });
        window.addEventListener('blur', this.onBlur);
        document.addEventListener('pointerlockchange', this.onPointerLockChange);
        this.canvas.addEventListener('contextmenu', this.onContextMenu);
    }
    requestPointerLock() {
        if (this.prefersTouchControls() || this.isPointerLocked())
            return;
        this.suppressMouseUntilRelease = true;
        try {
            const result = this.canvas.requestPointerLock();
            void Promise.resolve(result).catch(() => {
                this.suppressMouseUntilRelease = false;
            });
        }
        catch {
            this.suppressMouseUntilRelease = false;
        }
    }
    isPointerLocked() {
        return document.pointerLockElement === this.canvas;
    }
    isTouchDevice() {
        const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
        return (navigator.maxTouchPoints ?? 0) > 0 || coarse;
    }
    prefersTouchControls() {
        return this.inputMode === 'touch';
    }
    notePointerType(pointerType) {
        const next = inputModeForPointer(pointerType, this.inputMode);
        const changed = next !== this.inputMode;
        this.inputMode = next;
        this.lastLookSource = next === 'touch' ? 'touch' : 'mouse';
        if (changed) {
            this.mouseButtons.clear();
            this.mobile.fire = false;
            this.mobile.aim = false;
            this.mobile.sprint = false;
        }
        return changed;
    }
    setMobile(partial) {
        Object.assign(this.mobile, partial);
    }
    addMobileLook(deltaX, deltaY) {
        this.notePointerType('touch');
        this.mobile.lookX = clampLookDelta(this.mobile.lookX + deltaX);
        this.mobile.lookY = clampLookDelta(this.mobile.lookY + deltaY);
    }
    resetMobile() {
        this.mobile = createNeutralMobileInput();
    }
    resetAll() {
        this.keys.clear();
        this.mouseButtons.clear();
        this.justPressed.clear();
        this.lookX = 0;
        this.lookY = 0;
        this.switchDelta = 0;
        this.suppressMouseUntilRelease = false;
        this.resetMobile();
    }
    snapshot() {
        const hasTouchLook = this.mobile.lookX !== 0 || this.mobile.lookY !== 0;
        const hasMouseLook = this.lookX !== 0 || this.lookY !== 0;
        if (hasTouchLook)
            this.lastLookSource = 'touch';
        else if (hasMouseLook)
            this.lastLookSource = 'mouse';
        const snap = {
            moveX: clamp((this.keys.has('KeyD') ? 1 : 0) -
                (this.keys.has('KeyA') ? 1 : 0) +
                this.mobile.moveX, -1, 1),
            moveZ: clamp((this.keys.has('KeyW') ? 1 : 0) -
                (this.keys.has('KeyS') ? 1 : 0) +
                this.mobile.moveZ, -1, 1),
            lookX: clampLookDelta(this.lookX + this.mobile.lookX),
            lookY: clampLookDelta(this.lookY + this.mobile.lookY),
            lookSource: this.lastLookSource,
            fire: this.mouseButtons.has(0) || this.mobile.fire,
            aim: this.mouseButtons.has(2) || this.mobile.aim,
            jump: this.justPressed.has('Space') || this.mobile.jump,
            sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.mobile.sprint,
            reload: this.justPressed.has('KeyR') || this.mobile.reload,
            interact: this.justPressed.has('KeyE') || this.mobile.interact,
            pause: this.justPressed.has('Escape') || this.mobile.pause,
            switchDelta: this.switchDelta + this.mobile.switchDelta,
            selectWeapon: this.justPressed.has('Digit1')
                ? 0
                : this.justPressed.has('Digit2')
                    ? 1
                    : this.justPressed.has('Digit3')
                        ? 2
                        : undefined,
        };
        this.lookX = 0;
        this.lookY = 0;
        this.switchDelta = 0;
        this.justPressed.clear();
        this.mobile.lookX = 0;
        this.mobile.lookY = 0;
        this.mobile.jump = false;
        this.mobile.reload = false;
        this.mobile.interact = false;
        this.mobile.pause = false;
        this.mobile.switchDelta = 0;
        return snap;
    }
    dispose() {
        this.resetAll();
        this.onPointerLockLost = undefined;
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('mouseup', this.onMouseUp);
        window.removeEventListener('wheel', this.onWheel);
        window.removeEventListener('blur', this.onBlur);
        document.removeEventListener('pointerlockchange', this.onPointerLockChange);
        this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    }
    onKeyDown = (event) => {
        if (isInteractiveTarget(event.target))
            return;
        this.keys.add(event.code);
        if (!event.repeat)
            this.justPressed.add(event.code);
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
            event.preventDefault();
        }
    };
    onKeyUp = (event) => {
        this.keys.delete(event.code);
    };
    onMouseMove = (event) => {
        if (!this.isPointerLocked())
            return;
        this.notePointerType('mouse');
        this.lookX = clampLookDelta(this.lookX + event.movementX);
        this.lookY = clampLookDelta(this.lookY + event.movementY);
    };
    onMouseDown = (event) => {
        if (this.suppressMouseUntilRelease || !this.isPointerLocked())
            return;
        this.notePointerType('mouse');
        this.mouseButtons.add(event.button);
    };
    onMouseUp = (event) => {
        this.mouseButtons.delete(event.button);
        if (this.suppressMouseUntilRelease)
            this.suppressMouseUntilRelease = false;
    };
    onWheel = (event) => {
        if (!this.isPointerLocked())
            return;
        const now = event.timeStamp || performance.now();
        if (now - this.lastWheelAt >= 160 && event.deltaY !== 0) {
            this.switchDelta = Math.sign(event.deltaY);
            this.lastWheelAt = now;
        }
        event.preventDefault();
    };
    onPointerLockChange = () => {
        const locked = this.isPointerLocked();
        if (locked) {
            this.hadPointerLock = true;
            this.notePointerType('mouse');
            return;
        }
        if (!this.hadPointerLock)
            return;
        this.hadPointerLock = false;
        this.mouseButtons.clear();
        this.lookX = 0;
        this.lookY = 0;
        this.switchDelta = 0;
        this.suppressMouseUntilRelease = false;
        this.onPointerLockLost?.();
    };
    onBlur = () => {
        this.resetAll();
    };
    onContextMenu = (event) => {
        event.preventDefault();
    };
}
export function isInteractiveTarget(target) {
    const element = target;
    if (!element)
        return false;
    const tagName = element.tagName?.toUpperCase();
    return (element.isContentEditable === true ||
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        tagName === 'BUTTON');
}
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
