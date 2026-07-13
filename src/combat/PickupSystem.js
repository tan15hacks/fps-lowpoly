import * as THREE from 'three';
import { PALETTE } from '../visuals/LowPolyMaterialFactory';
export class PickupSystem {
    scene;
    materials;
    pickups = [];
    onCollect;
    constructor(scene, materials) {
        this.scene = scene;
        this.materials = materials;
    }
    drop(position, enemy, difficulty, coinMultiplier) {
        const coinCount = enemy === 'boss' ? 8 : enemy === 'brute' ? 2 : 1;
        for (let index = 0; index < coinCount; index += 1) {
            this.spawn('coin', position, Math.max(1, Math.round(coinMultiplier)));
        }
        const healthChance = difficulty === 'recruit' ? 0.19 : difficulty === 'veteran' ? 0.07 : 0.12;
        if (Math.random() < healthChance)
            this.spawn('health', position, 18);
        if (Math.random() < 0.09)
            this.spawn('armor', position, 12);
        if (Math.random() < 0.12) {
            this.spawn(Math.random() < 0.68 ? 'smgAmmo' : 'shotgunAmmo', position, enemy === 'boss' ? 24 : 8);
        }
        if (Math.random() < 0.035)
            this.spawn('power', position, 1);
    }
    spawn(kind, position, value) {
        const color = {
            coin: PALETTE.orange,
            health: PALETTE.green,
            armor: PALETTE.blue,
            smgAmmo: PALETTE.cream,
            shotgunAmmo: PALETTE.red,
            power: PALETTE.cyan,
        }[kind];
        const geometry = kind === 'coin'
            ? new THREE.CylinderGeometry(0.18, 0.18, 0.06, 10)
            : new THREE.OctahedronGeometry(0.25, 0);
        const mesh = new THREE.Mesh(geometry, this.materials.material(color, color, 0.8));
        mesh.position.copy(position);
        mesh.position.x += (Math.random() - 0.5) * 0.8;
        mesh.position.z += (Math.random() - 0.5) * 0.8;
        mesh.position.y = 0.55;
        mesh.userData.value = value;
        this.scene.add(mesh);
        this.pickups.push({ kind, mesh, life: 18, phase: Math.random() * 6 });
    }
    update(delta, player, radius) {
        for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
            const pickup = this.pickups[index];
            pickup.life -= delta;
            pickup.phase += delta * 3;
            pickup.mesh.rotation.y += delta * 2.2;
            pickup.mesh.position.y = 0.55 + Math.sin(pickup.phase) * 0.08;
            const distance = pickup.mesh.position.distanceTo(player);
            if (distance < radius) {
                if (distance > 0.45) {
                    pickup.mesh.position.lerp(player, Math.min(1, delta * 8));
                }
                else {
                    this.onCollect?.(pickup.kind, pickup.mesh.userData.value);
                    this.remove(index);
                    continue;
                }
            }
            if (pickup.life <= 0)
                this.remove(index);
        }
    }
    clear() {
        for (let index = this.pickups.length - 1; index >= 0; index -= 1)
            this.remove(index);
    }
    dispose() {
        this.onCollect = undefined;
        this.clear();
    }
    remove(index) {
        const pickup = this.pickups[index];
        this.scene.remove(pickup.mesh);
        pickup.mesh.geometry.dispose();
        this.pickups.splice(index, 1);
    }
}
