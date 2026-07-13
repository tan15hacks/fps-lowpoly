import * as THREE from 'three';
export const PALETTE = {
    sand: 0xb98a57, sandDark: 0x7b5b3e, concrete: 0x72777b, concreteDark: 0x3e464d,
    metal: 0x44515c, metalDark: 0x202a34, orange: 0xd88031, cream: 0xe8d2a6,
    red: 0xc7483f, green: 0x65b66f, blue: 0x4aa8c8, cyan: 0x5ee1e6,
    acid: 0x91d447, purple: 0x715080, black: 0x10151b, white: 0xf2efe6,
    runner: 0x9f5b46, brute: 0x5a6c4c, spitter: 0x6d4c7d, boss: 0x7c3a35,
};
export class LowPolyMaterialFactory {
    cache = new Map();
    material(color, emissive = 0x000000, emissiveIntensity = 0) {
        const key = `${color}-${emissive}-${emissiveIntensity}`;
        let material = this.cache.get(key);
        if (!material) {
            material = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity, roughness: 0.86, metalness: color === PALETTE.metal || color === PALETTE.metalDark ? 0.45 : 0.05, flatShading: true });
            this.cache.set(key, material);
        }
        return material;
    }
    transparent(color, opacity) {
        const key = `t-${color}-${opacity}`;
        let material = this.cache.get(key);
        if (!material) {
            material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
            this.cache.set(key, material);
        }
        return material;
    }
    dispose() { this.cache.forEach((material) => material.dispose()); this.cache.clear(); }
}
