import {
  clampLookDelta,
  detectInitialInputMode,
  inputModeForPointer,
  type InputMode,
  type LookInputSource,
} from '../player/controlMath';

export interface InputSnapshot {
  moveX: number;
  moveZ: number;
  lookX: number;
  lookY: number;
  lookSource: LookInputSource;
  fire: boolean;
  aim: boolean;
  jump: boolean;
  sprint: boolean;
  reload: boolean;
  interact: boolean;
  pause: boolean;
  switchDelta: number;
  selectWeapon?: number;
}

export interface MobileInputState {
  moveX: number;
  moveZ: number;
  lookX: number;
  lookY: number;
  fire: boolean;
  aim: boolean;
  jump: boolean;
  sprint: boolean;
  reload: boolean;
  interact: boolean;
  pause: boolean;
  switchDelta: number;
}

export const createNeutralMobileInput = (): MobileInputState => ({
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
  private keys = new Set<string>();
  private mouseButtons = new Set<number>();
  private lookX = 0;
  private lookY = 0;
  private switchDelta = 0;
  private justPressed = new Set<string>();
  private mobile: MobileInputState = createNeutralMobileInput();
  private inputMode: InputMode;
  private lastLookSource: LookInputSource;
  private suppressMouseUntilRelease = false;
  private hadPointerLock = false;
  private lastWheelAt = -Infinity;
  onPointerLockLost?: () => void;

  constructor(private readonly canvas: HTMLCanvasElement) {
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

  requestPointerLock(): void {
    if (this.prefersTouchControls() || this.isPointerLocked()) return;
    this.suppressMouseUntilRelease = true;
    try {
      const result = this.canvas.requestPointerLock();
      void Promise.resolve(result).catch(() => {
        this.suppressMouseUntilRelease = false;
      });
    } catch {
      this.suppressMouseUntilRelease = false;
    }
  }

  isPointerLocked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  isTouchDevice(): boolean {
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    return (navigator.maxTouchPoints ?? 0) > 0 || coarse;
  }

  prefersTouchControls(): boolean {
    return this.inputMode === 'touch';
  }

  notePointerType(pointerType: string): boolean {
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

  setMobile(partial: Partial<MobileInputState>): void {
    Object.assign(this.mobile, partial);
  }

  addMobileLook(deltaX: number, deltaY: number): void {
    this.notePointerType('touch');
    this.mobile.lookX = clampLookDelta(this.mobile.lookX + deltaX);
    this.mobile.lookY = clampLookDelta(this.mobile.lookY + deltaY);
  }

  resetMobile(): void {
    this.mobile = createNeutralMobileInput();
  }

  resetAll(): void {
    this.keys.clear();
    this.mouseButtons.clear();
    this.justPressed.clear();
    this.lookX = 0;
    this.lookY = 0;
    this.switchDelta = 0;
    this.suppressMouseUntilRelease = false;
    this.resetMobile();
  }

  snapshot(): InputSnapshot {
    const hasTouchLook = this.mobile.lookX !== 0 || this.mobile.lookY !== 0;
    const hasMouseLook = this.lookX !== 0 || this.lookY !== 0;
    if (hasTouchLook) this.lastLookSource = 'touch';
    else if (hasMouseLook) this.lastLookSource = 'mouse';

    const snap: InputSnapshot = {
      moveX: clamp(
        (this.keys.has('KeyD') ? 1 : 0) -
          (this.keys.has('KeyA') ? 1 : 0) +
          this.mobile.moveX,
        -1,
        1,
      ),
      moveZ: clamp(
        (this.keys.has('KeyW') ? 1 : 0) -
          (this.keys.has('KeyS') ? 1 : 0) +
          this.mobile.moveZ,
        -1,
        1,
      ),
      lookX: clampLookDelta(this.lookX + this.mobile.lookX),
      lookY: clampLookDelta(this.lookY + this.mobile.lookY),
      lookSource: this.lastLookSource,
      fire: this.mouseButtons.has(0) || this.mobile.fire,
      aim: this.mouseButtons.has(2) || this.mobile.aim,
      jump: this.justPressed.has('Space') || this.mobile.jump,
      sprint:
        this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.mobile.sprint,
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

  dispose(): void {
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

  private onKeyDown = (event: KeyboardEvent): void => {
    if (isInteractiveTarget(event.target)) return;
    this.keys.add(event.code);
    if (!event.repeat) this.justPressed.add(event.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isPointerLocked()) return;
    this.notePointerType('mouse');
    this.lookX = clampLookDelta(this.lookX + event.movementX);
    this.lookY = clampLookDelta(this.lookY + event.movementY);
  };

  private onMouseDown = (event: MouseEvent): void => {
    if (this.suppressMouseUntilRelease || !this.isPointerLocked()) return;
    this.notePointerType('mouse');
    this.mouseButtons.add(event.button);
  };

  private onMouseUp = (event: MouseEvent): void => {
    this.mouseButtons.delete(event.button);
    if (this.suppressMouseUntilRelease) this.suppressMouseUntilRelease = false;
  };

  private onWheel = (event: WheelEvent): void => {
    if (!this.isPointerLocked()) return;
    const now = event.timeStamp || performance.now();
    if (now - this.lastWheelAt >= 160 && event.deltaY !== 0) {
      this.switchDelta = Math.sign(event.deltaY);
      this.lastWheelAt = now;
    }
    event.preventDefault();
  };

  private onPointerLockChange = (): void => {
    const locked = this.isPointerLocked();
    if (locked) {
      this.hadPointerLock = true;
      this.notePointerType('mouse');
      return;
    }
    if (!this.hadPointerLock) return;
    this.hadPointerLock = false;
    this.mouseButtons.clear();
    this.lookX = 0;
    this.lookY = 0;
    this.switchDelta = 0;
    this.suppressMouseUntilRelease = false;
    this.onPointerLockLost?.();
  };

  private onBlur = (): void => {
    this.resetAll();
  };

  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
  const element = target as { tagName?: string; isContentEditable?: boolean } | null;
  if (!element) return false;
  const tagName = element.tagName?.toUpperCase();
  return (
    element.isContentEditable === true ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    tagName === 'BUTTON'
  );
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));
