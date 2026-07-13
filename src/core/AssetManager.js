import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
export class AssetManager {
    loader = new GLTFLoader();
    cache = new Map();
    async loadGltf(url) { if (this.cache.has(url))
        return this.cache.get(url); const asset = await this.loader.loadAsync(url); this.cache.set(url, asset); return asset; }
    clear() { this.cache.clear(); }
}
