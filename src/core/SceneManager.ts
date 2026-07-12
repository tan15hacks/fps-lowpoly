import * as THREE from 'three';
import type { Settings } from '../types/game';

export class SceneManager{
  readonly scene=new THREE.Scene();readonly camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.05,120);readonly renderer:any;
  constructor(canvas:HTMLCanvasElement,settings:Settings){this.scene.background=new THREE.Color(0xd79461);this.scene.fog=new THREE.Fog(0xb87d59,26,75);this.renderer=new THREE.WebGLRenderer({canvas,antialias:settings.quality!=='low',powerPreference:'high-performance'});this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;this.renderer.shadowMap.enabled=settings.shadowQuality!=='off';this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.applySettings(settings);this.addLights();window.addEventListener('resize',this.resize);}
  applySettings(settings:Settings):void{const maxRatio=settings.quality==='low'?1:settings.quality==='high'?2:1.5;this.renderer.setPixelRatio(Math.min(devicePixelRatio,maxRatio)*settings.resolutionScale);this.renderer.shadowMap.enabled=settings.shadowQuality!=='off';this.camera.fov=settings.fov;this.resize();}
  render():void{this.renderer.render(this.scene,this.camera);}
  dispose():void{window.removeEventListener('resize',this.resize);this.renderer.dispose();}
  private addLights():void{const hemi=new THREE.HemisphereLight(0xffcf98,0x473f42,2.2);this.scene.add(hemi);const sun=new THREE.DirectionalLight(0xffb66b,2.4);sun.position.set(-24,35,-18);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-38;sun.shadow.camera.right=38;sun.shadow.camera.top=38;sun.shadow.camera.bottom=-38;sun.shadow.camera.near=1;sun.shadow.camera.far=90;this.scene.add(sun);}
  private resize=():void=>{const width=innerWidth,height=innerHeight;this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.renderer.setSize(width,height,false);};
}
