import * as THREE from 'three';
import { clampLookDelta, damp } from './controlMath';
export class PlayerCamera {
    camera;
    settings;
    yaw = 0;
    pitch = 0;
    bobTime = 0;
    recoil = 0;
    shake = 0;
    currentFov;
    constructor(camera, settings) {
        this.camera = camera;
        this.settings = settings;
        this.camera.rotation.order = 'YXZ';
        this.currentFov = settings.fov;
    }
    setSettings(settings) {
        this.settings = settings;
    }
    look(dx, dy, aiming, source) {
        const base = source === 'touch'
            ? this.settings.touchSensitivity * 0.004
            : this.settings.mouseSensitivity * 0.0025;
        const sensitivity = base * (aiming ? this.settings.aimSensitivity : 1);
        this.yaw -= clampLookDelta(dx) * sensitivity;
        this.pitch -= clampLookDelta(dy) * sensitivity;
        this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    }
    addRecoil(amount) {
        this.recoil = Math.min(2.2, this.recoil + Math.max(0, amount));
        this.shake = Math.min(1, this.shake + Math.max(0, amount) * 0.3);
    }
    addShake(amount) {
        this.shake = Math.min(1, this.shake + Math.max(0, amount));
    }
    update(delta, moving, sprinting, grounded, aiming) {
        this.recoil = Math.max(0, this.recoil - delta * 5.2);
        this.shake = Math.max(0, this.shake - delta * 4);
        if (moving > 0.1 && grounded)
            this.bobTime += delta * (sprinting ? 12 : 8);
        const reduced = this.settings.reducedMotion ? 0 : 1;
        const bob = Math.sin(this.bobTime) * 0.035 * moving * this.settings.headBob * reduced;
        const sway = Math.cos(this.bobTime * 0.5) * 0.018 * moving * this.settings.headBob * reduced;
        const shakeX = (Math.random() - 0.5) * this.shake * 0.025 * this.settings.cameraShake * reduced;
        const shakeY = (Math.random() - 0.5) * this.shake * 0.025 * this.settings.cameraShake * reduced;
        const renderedPitch = Math.max(-1.5, Math.min(1.5, this.pitch - this.recoil * 0.035 + shakeY));
        this.camera.rotation.set(renderedPitch, this.yaw + shakeX, sway);
        this.camera.position.set(0, 1.68 + bob, 0);
        const targetFov = aiming ? Math.max(52, this.settings.fov - 12) : this.settings.fov;
        this.currentFov = damp(this.currentFov, targetFov, 12, delta);
        if (Math.abs(this.camera.fov - this.currentFov) > 0.001) {
            this.camera.fov = this.currentFov;
            this.camera.updateProjectionMatrix();
        }
    }
    reset() {
        this.yaw = 0;
        this.pitch = 0;
        this.bobTime = 0;
        this.recoil = 0;
        this.shake = 0;
        this.currentFov = this.settings.fov;
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.set(0, 0, 0);
        this.camera.position.set(0, 1.68, 0);
        this.camera.fov = this.currentFov;
        this.camera.updateProjectionMatrix();
    }
    forward() {
        return new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    }
}
