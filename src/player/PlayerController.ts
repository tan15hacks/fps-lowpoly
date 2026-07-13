import * as THREE from 'three';
import type { InputSnapshot } from '../core/InputManager';
import { CollisionWorld } from '../world/CollisionWorld';
import { PlayerCamera } from './PlayerCamera';
import { PlayerStats } from './PlayerStats';

export class PlayerController {
  readonly root = new THREE.Group();
  readonly velocity = new THREE.Vector3();
  grounded = true;
  private verticalVelocity = 0;
  private readonly move = new THREE.Vector3();
  private readonly upAxis = new THREE.Vector3(0, 1, 0);

  constructor(
    readonly cameraController: PlayerCamera,
    readonly stats: PlayerStats,
    private readonly collision: CollisionWorld,
  ) {
    this.root.add(cameraController.camera);
    this.cameraController.reset();
    this.root.position.set(0, 0, -2);
  }

  update(delta: number, input: InputSnapshot): void {
    this.cameraController.look(input.lookX, input.lookY, input.aim, input.lookSource);
    this.move.set(input.moveX, 0, -input.moveZ);
    if (this.move.lengthSq() > 1) this.move.normalize();
    this.move.applyAxisAngle(this.upAxis, this.cameraController.yaw);

    const sprinting = input.sprint && input.moveZ > 0.15 && this.stats.stamina > 0.05;
    const speed = sprinting ? this.stats.sprintSpeed : this.stats.walkSpeed;
    const targetX = this.move.x * speed;
    const targetZ = this.move.z * speed;
    const acceleration = this.grounded ? 14 : 5;
    const blend = Math.min(1, delta * acceleration);
    this.velocity.x += (targetX - this.velocity.x) * blend;
    this.velocity.z += (targetZ - this.velocity.z) * blend;

    if (sprinting) this.stats.stamina = Math.max(0, this.stats.stamina - delta * 0.25);
    else {
      this.stats.stamina = Math.min(
        1,
        this.stats.stamina +
          delta * 0.18 * this.stats.upgrades.multiplier('sprint', 0.18),
      );
    }

    if (input.jump && this.grounded) {
      this.verticalVelocity = this.stats.jumpStrength;
      this.grounded = false;
    }
    if (!this.grounded) this.verticalVelocity -= 18 * delta;
    this.root.position.y += this.verticalVelocity * delta;
    if (this.root.position.y <= 0) {
      this.root.position.y = 0;
      this.verticalVelocity = 0;
      this.grounded = true;
    }

    const resolved = this.collision.resolveCircle(
      this.root.position.x + this.velocity.x * delta,
      this.root.position.z + this.velocity.z * delta,
      0.45,
    );
    this.root.position.x = resolved.x;
    this.root.position.z = resolved.z;
    this.cameraController.update(
      delta,
      Math.min(1, this.move.length()),
      sprinting,
      this.grounded,
      input.aim,
    );
  }

  safeTeleport(position: { x: number; z: number }): void {
    this.root.position.set(position.x, 0, position.z);
    this.velocity.set(0, 0, 0);
    this.verticalVelocity = 0;
    this.grounded = true;
  }
}
