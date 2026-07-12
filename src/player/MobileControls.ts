import type { Settings } from '../types/game';
import { InputManager } from '../core/InputManager';

export class MobileControls {
  readonly root: HTMLDivElement;
  private movePointer?: number; private lookPointer?: number;
  private moveOrigin = { x: 0, y: 0 };

  constructor(private readonly input: InputManager, settings: Settings) {
    this.root = document.createElement('div'); this.root.className = 'mobile-controls';
    this.root.innerHTML = `
      <div class="move-zone"><div class="stick-base"><div class="stick-knob"></div></div></div>
      <div class="look-zone"></div>
      <button class="touch-btn fire" aria-label="Fire">FIRE</button>
      <button class="touch-btn aim" aria-label="Aim">AIM</button>
      <button class="touch-btn reload" aria-label="Reload">R</button>
      <button class="touch-btn jump" aria-label="Jump">JUMP</button>
      <button class="touch-btn sprint" aria-label="Sprint">RUN</button>
      <button class="touch-btn interact" aria-label="Interact">USE</button>
      <button class="touch-btn weapon" aria-label="Switch weapon">SWAP</button>
      <button class="touch-btn pause" aria-label="Pause">Ⅱ</button>`;
    document.body.appendChild(this.root);
    this.applySettings(settings);
    this.bindJoystick(); this.bindLook();
    this.bindHold('.fire', 'fire'); this.bindHold('.aim', 'aim'); this.bindHold('.sprint', 'sprint');
    this.bindTap('.reload', () => input.setMobile({ reload: true }));
    this.bindTap('.jump', () => input.setMobile({ jump: true }));
    this.bindTap('.interact', () => input.setMobile({ interact: true }));
    this.bindTap('.weapon', () => input.setMobile({ switchDelta: 1 }));
    this.bindTap('.pause', () => input.setMobile({ pause: true }));
  }

  show(value: boolean): void { this.root.classList.toggle('visible', value && this.input.isTouchDevice()); }
  applySettings(settings: Settings): void {
    this.root.style.setProperty('--control-opacity', String(settings.controlOpacity));
    this.root.classList.toggle('left-handed', settings.leftHanded);
  }
  dispose(): void { this.root.remove(); }

  private bindJoystick(): void {
    const zone = this.root.querySelector<HTMLElement>('.move-zone')!;
    const base = this.root.querySelector<HTMLElement>('.stick-base')!;
    const knob = this.root.querySelector<HTMLElement>('.stick-knob')!;
    zone.addEventListener('pointerdown', (event) => { this.movePointer = event.pointerId; this.moveOrigin = { x: event.clientX, y: event.clientY }; base.style.left = `${event.clientX}px`; base.style.top = `${event.clientY}px`; base.classList.add('active'); zone.setPointerCapture(event.pointerId); event.preventDefault(); });
    zone.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.movePointer) return;
      const dx = event.clientX - this.moveOrigin.x; const dy = event.clientY - this.moveOrigin.y;
      const length = Math.hypot(dx, dy); const max = 54; const scale = length > max ? max / length : 1;
      const x = dx * scale; const y = dy * scale; knob.style.transform = `translate(${x}px,${y}px)`;
      this.input.setMobile({ moveX: x / max, moveZ: -y / max }); event.preventDefault();
    });
    const release = (event: PointerEvent): void => { if (event.pointerId !== this.movePointer) return; this.movePointer = undefined; knob.style.transform = ''; base.classList.remove('active'); this.input.setMobile({ moveX: 0, moveZ: 0 }); };
    zone.addEventListener('pointerup', release); zone.addEventListener('pointercancel', release);
  }

  private bindLook(): void {
    const zone = this.root.querySelector<HTMLElement>('.look-zone')!;
    let previous = { x: 0, y: 0 };
    zone.addEventListener('pointerdown', (event) => { if (this.lookPointer !== undefined) return; this.lookPointer = event.pointerId; previous = { x: event.clientX, y: event.clientY }; zone.setPointerCapture(event.pointerId); event.preventDefault(); });
    zone.addEventListener('pointermove', (event) => { if (event.pointerId !== this.lookPointer) return; this.input.setMobile({ lookX: event.clientX - previous.x, lookY: event.clientY - previous.y }); previous = { x: event.clientX, y: event.clientY }; event.preventDefault(); });
    const release = (event: PointerEvent): void => { if (event.pointerId === this.lookPointer) this.lookPointer = undefined; };
    zone.addEventListener('pointerup', release); zone.addEventListener('pointercancel', release);
  }

  private bindHold(selector: string, property: 'fire' | 'aim' | 'sprint'): void {
    const button = this.root.querySelector<HTMLElement>(selector)!;
    button.addEventListener('pointerdown', (event) => { this.input.setMobile({ [property]: true }); button.setPointerCapture(event.pointerId); event.preventDefault(); });
    const release = (event: PointerEvent): void => { this.input.setMobile({ [property]: false }); event.preventDefault(); };
    button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release);
  }

  private bindTap(selector: string, action: () => void): void { this.root.querySelector<HTMLElement>(selector)!.addEventListener('pointerdown', (event) => { action(); event.preventDefault(); }); }
}
