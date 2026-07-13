import { applyRadialDeadzone, clampLookDelta } from './controlMath';
export class MobileControls {
    input;
    root;
    movePointer;
    lookPointer;
    moveOrigin = { x: 0, y: 0 };
    base;
    knob;
    constructor(input, settings) {
        this.input = input;
        this.root = document.createElement('div');
        this.root.className = 'mobile-controls';
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
        this.base = this.root.querySelector('.stick-base');
        this.knob = this.root.querySelector('.stick-knob');
        this.applySettings(settings);
        this.bindJoystick();
        this.bindLook();
        this.bindHold('.fire', 'fire');
        this.bindHold('.aim', 'aim');
        this.bindHold('.sprint', 'sprint');
        this.bindTap('.reload', () => input.setMobile({ reload: true }));
        this.bindTap('.jump', () => input.setMobile({ jump: true }));
        this.bindTap('.interact', () => input.setMobile({ interact: true }));
        this.bindTap('.weapon', () => input.setMobile({ switchDelta: 1 }));
        this.bindTap('.pause', () => input.setMobile({ pause: true }));
    }
    show(value) {
        const visible = value && this.input.prefersTouchControls();
        if (!visible)
            this.resetInteraction();
        this.root.classList.toggle('visible', visible);
    }
    applySettings(settings) {
        this.root.style.setProperty('--control-opacity', String(settings.controlOpacity));
        this.root.classList.toggle('left-handed', settings.leftHanded);
    }
    dispose() {
        this.resetInteraction();
        this.root.remove();
    }
    resetInteraction() {
        this.movePointer = undefined;
        this.lookPointer = undefined;
        this.knob.style.transform = '';
        this.base.classList.remove('active');
        this.input.resetMobile();
    }
    bindJoystick() {
        const zone = this.root.querySelector('.move-zone');
        zone.addEventListener('pointerdown', (event) => {
            if (this.movePointer !== undefined)
                return;
            this.input.notePointerType(event.pointerType);
            this.movePointer = event.pointerId;
            this.moveOrigin = { x: event.clientX, y: event.clientY };
            this.base.style.left = `${event.clientX}px`;
            this.base.style.top = `${event.clientY}px`;
            this.base.classList.add('active');
            zone.setPointerCapture(event.pointerId);
            event.preventDefault();
        });
        zone.addEventListener('pointermove', (event) => {
            if (event.pointerId !== this.movePointer)
                return;
            const dx = event.clientX - this.moveOrigin.x;
            const dy = event.clientY - this.moveOrigin.y;
            const length = Math.hypot(dx, dy);
            const maximum = 54;
            const scale = length > maximum ? maximum / length : 1;
            const visualX = dx * scale;
            const visualY = dy * scale;
            const movement = applyRadialDeadzone(visualX / maximum, -visualY / maximum);
            this.knob.style.transform = `translate(${visualX}px,${visualY}px)`;
            this.input.setMobile({ moveX: movement.x, moveZ: movement.y });
            event.preventDefault();
        });
        const release = (event) => {
            if (event.pointerId !== this.movePointer)
                return;
            this.movePointer = undefined;
            this.knob.style.transform = '';
            this.base.classList.remove('active');
            this.input.setMobile({ moveX: 0, moveZ: 0 });
        };
        zone.addEventListener('pointerup', release);
        zone.addEventListener('pointercancel', release);
        zone.addEventListener('lostpointercapture', release);
    }
    bindLook() {
        const zone = this.root.querySelector('.look-zone');
        let previous = { x: 0, y: 0 };
        zone.addEventListener('pointerdown', (event) => {
            if (this.lookPointer !== undefined)
                return;
            this.input.notePointerType(event.pointerType);
            this.lookPointer = event.pointerId;
            previous = { x: event.clientX, y: event.clientY };
            zone.setPointerCapture(event.pointerId);
            event.preventDefault();
        });
        zone.addEventListener('pointermove', (event) => {
            if (event.pointerId !== this.lookPointer)
                return;
            this.input.addMobileLook(clampLookDelta(event.clientX - previous.x, 80), clampLookDelta(event.clientY - previous.y, 80));
            previous = { x: event.clientX, y: event.clientY };
            event.preventDefault();
        });
        const release = (event) => {
            if (event.pointerId !== this.lookPointer)
                return;
            this.lookPointer = undefined;
            this.input.setMobile({ lookX: 0, lookY: 0 });
        };
        zone.addEventListener('pointerup', release);
        zone.addEventListener('pointercancel', release);
        zone.addEventListener('lostpointercapture', release);
    }
    bindHold(selector, property) {
        const button = this.root.querySelector(selector);
        let pointerId;
        button.addEventListener('pointerdown', (event) => {
            if (pointerId !== undefined)
                return;
            this.input.notePointerType(event.pointerType);
            pointerId = event.pointerId;
            this.input.setMobile({ [property]: true });
            button.setPointerCapture(event.pointerId);
            event.preventDefault();
        });
        const release = (event) => {
            if (pointerId !== undefined && event.pointerId !== pointerId)
                return;
            pointerId = undefined;
            this.input.setMobile({ [property]: false });
            event.preventDefault();
        };
        button.addEventListener('pointerup', release);
        button.addEventListener('pointercancel', release);
        button.addEventListener('lostpointercapture', release);
    }
    bindTap(selector, action) {
        this.root.querySelector(selector).addEventListener('pointerdown', (event) => {
            this.input.notePointerType(event.pointerType);
            action();
            event.preventDefault();
        });
    }
}
