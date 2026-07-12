import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
export class AssetManager{private loader=new GLTFLoader();private cache=new Map<string,unknown>();async loadGltf(url:string):Promise<any>{if(this.cache.has(url))return this.cache.get(url);const asset=await this.loader.loadAsync(url);this.cache.set(url,asset);return asset;}clear():void{this.cache.clear();}}
