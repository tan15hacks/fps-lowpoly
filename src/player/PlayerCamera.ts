import * as THREE from 'three';
import type { Settings } from '../types/game';

export class PlayerCamera {
  yaw = 0; pitch = 0; private bobTime = 0; private recoil = 0; private shake = 0;
  constructor(readonly camera: any, private settings: Settings) { this.camera.rotation.order = 'YXZ'; }
  setSettings(settings: Settings): void { this.settings = settings; this.camera.fov = settings.fov; this.camera.updateProjectionMatrix(); }
  look(dx: number, dy: number, aiming: boolean, touch: boolean): void {
    const base = touch ? this.settings.touchSensitivity * 0.004 : this.settings.mouseSensitivity * 0.0025;
    const sensitivity = base * (aiming ? this.settings.aimSensitivity : 1);
    this.yaw -= dx * sensitivity; this.pitch -= dy * sensitivity; this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
  }
  addRecoil(amount: number): void { this.recoil += amount; this.shake = Math.min(1, this.shake + amount * 0.3); }
  addShake(amount: number): void { this.shake = Math.min(1, this.shake + amount); }
  update(delta: number, moving: number, sprinting: boolean, grounded: boolean): void {
    this.recoil = Math.max(0, this.recoil - delta * 5.2);
    this.shake = Math.max(0, this.shake - delta * 4);
    if (moving > 0.1 && grounded) this.bobTime += delta * (sprinting ? 12 : 8);
    const reduced = this.settings.reducedMotion ? 0 : 1;
    const bob = Math.sin(this.bobTime) * 0.035 * moving * this.settings.headBob * reduced;
    const sway = Math.cos(this.bobTime * 0.5) * 0.018 * moving * this.settings.headBob * reduced;
    const shakeX = (Math.random() - 0.5) * this.shake * 0.025 * this.settings.cameraShake * reduced;
    const shakeY = (Math.random() - 0.5) * this.shake * 0.025 * this.settings.cameraShake * reduced;
    this.camera.rotation.set(this.pitch - this.recoil * 0.035 + shakeY, this.yaw + shakeX, sway);
    this.camera.position.y = 1.68 + bob;
  }
  forward(): any { return new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize(); }
}
