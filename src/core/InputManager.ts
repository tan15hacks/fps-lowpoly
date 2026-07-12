export interface InputSnapshot {
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

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('blur', this.onBlur);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  requestPointerLock(): void {
    if (!this.isTouchDevice()) void this.canvas.requestPointerLock();
  }

  isPointerLocked(): boolean {
    return document.pointerLockElement === this.canvas || this.isTouchDevice();
  }

  isTouchDevice(): boolean {
    return navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
  }

  setMobile(partial: Partial<MobileInputState>): void {
    Object.assign(this.mobile, partial);
  }

  resetMobile(): void {
    this.mobile = createNeutralMobileInput();
    this.lookX = 0;
    this.lookY = 0;
    this.switchDelta = 0;
  }

  resetAll(): void {
    this.keys.clear();
    this.mouseButtons.clear();
    this.justPressed.clear();
    this.resetMobile();
  }

  snapshot(): InputSnapshot {
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
      lookX: this.lookX + this.mobile.lookX,
      lookY: this.lookY + this.mobile.lookY,
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
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('blur', this.onBlur);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
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
    if (document.pointerLockElement === this.canvas) {
      this.lookX += event.movementX;
      this.lookY += event.movementY;
    }
  };

  private onMouseDown = (event: MouseEvent): void => {
    this.mouseButtons.add(event.button);
  };

  private onMouseUp = (event: MouseEvent): void => {
    this.mouseButtons.delete(event.button);
  };

  private onWheel = (event: WheelEvent): void => {
    if (this.isPointerLocked()) {
      this.switchDelta += Math.sign(event.deltaY);
      event.preventDefault();
    }
  };

  private onBlur = (): void => {
    this.resetAll();
  };

  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));
