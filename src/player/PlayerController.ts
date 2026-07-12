import * as THREE from 'three';
import type { InputSnapshot } from '../core/InputManager';
import { CollisionWorld } from '../world/CollisionWorld';
import { PlayerCamera } from './PlayerCamera';
import { PlayerStats } from './PlayerStats';

export class PlayerController {
  readonly root = new THREE.Group(); readonly velocity = new THREE.Vector3();
  grounded = true; private verticalVelocity = 0;

  constructor(readonly cameraController: PlayerCamera, readonly stats: PlayerStats, private readonly collision: CollisionWorld) {
    this.root.add(cameraController.camera); this.root.position.set(0, 0, -2);
  }

  update(delta: number, input: InputSnapshot, isTouch: boolean): void {
    this.cameraController.look(input.lookX, input.lookY, input.aim, isTouch);
    const move = new THREE.Vector3(input.moveX, 0, -input.moveZ);
    if (move.lengthSq() > 1) move.normalize();
    move.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraController.yaw);
    const sprinting = input.sprint && input.moveZ > 0.15 && this.stats.stamina > 0.05;
    const speed = sprinting ? this.stats.sprintSpeed : this.stats.walkSpeed;
    const targetX = move.x * speed; const targetZ = move.z * speed;
    const accel = this.grounded ? 14 : 5;
    this.velocity.x += (targetX - this.velocity.x) * Math.min(1, delta * accel);
    this.velocity.z += (targetZ - this.velocity.z) * Math.min(1, delta * accel);
    if (sprinting) this.stats.stamina = Math.max(0, this.stats.stamina - delta * 0.25);
    else this.stats.stamina = Math.min(1, this.stats.stamina + delta * 0.18 * this.stats.upgrades.multiplier('sprint', 0.18));
    if (input.jump && this.grounded) { this.verticalVelocity = this.stats.jumpStrength; this.grounded = false; }
    if (!this.grounded) this.verticalVelocity -= 18 * delta;
    this.root.position.y += this.verticalVelocity * delta;
    if (this.root.position.y <= 0) { this.root.position.y = 0; this.verticalVelocity = 0; this.grounded = true; }
    const resolved = this.collision.resolveCircle(this.root.position.x + this.velocity.x * delta, this.root.position.z + this.velocity.z * delta, 0.45);
    this.root.position.x = resolved.x; this.root.position.z = resolved.z;
    this.cameraController.update(delta, Math.min(1, move.length()), sprinting, this.grounded);
  }

  safeTeleport(position: any): void { this.root.position.set(position.x, 0, position.z); this.velocity.set(0, 0, 0); }
}
