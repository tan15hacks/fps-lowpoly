import * as THREE from 'three';
import { WEAPONS } from '../data/weapons';
import type { Settings, WeaponId } from '../types/game';
import { UpgradeManager } from '../upgrades/UpgradeManager';
import { AudioManager } from '../core/AudioManager';
import { LowPolyMaterialFactory, PALETTE } from '../visuals/LowPolyMaterialFactory';
import { PlayerCamera } from '../player/PlayerCamera';
import { PlayerStats } from '../player/PlayerStats';
import { Weapon } from './Weapon';
import { createHitscanRays, type HitscanRay } from './HitscanSystem';

export interface ShotEvent { weapon: WeaponId; rays: HitscanRay[]; baseDamage: number }

export class WeaponManager {
  readonly weapons: Record<WeaponId,Weapon> = { pistol:new Weapon(WEAPONS.pistol!), smg:new Weapon(WEAPONS.smg!), shotgun:new Weapon(WEAPONS.shotgun!) };
  readonly unlocked = new Set<WeaponId>(['pistol']);
  activeId:WeaponId='pistol'; private models=new Map<WeaponId,any>(); private muzzle?:any; private swayTime=0;
  onShot?: (event:ShotEvent)=>void; onChanged?:()=>void; private wasFireHeld=false; private muzzleTimer=0;

  constructor(private readonly camera:any,private readonly cameraController:PlayerCamera,private readonly stats:PlayerStats,private readonly upgrades:UpgradeManager,private readonly audio:AudioManager,private settings:Settings,materials:LowPolyMaterialFactory){
    this.weapons.smg.reserve += stats.permanent.startingAmmo*18; this.weapons.shotgun.reserve += stats.permanent.startingAmmo*5;
    this.models.set('pistol',this.createPistol(materials)); this.models.set('smg',this.createSmg(materials)); this.models.set('shotgun',this.createShotgun(materials));
    this.models.forEach(model=>{model.visible=false;camera.add(model);}); this.models.get(this.activeId)!.visible=true;
  }

  setSettings(settings:Settings):void{this.settings=settings;}
  active():Weapon{return this.weapons[this.activeId];}
  unlock(id:WeaponId):void{this.unlocked.add(id);this.switchTo(id);}
  switchTo(id:WeaponId):void{if(!this.unlocked.has(id)||id===this.activeId)return;this.models.get(this.activeId)!.visible=false;this.active().cancelReload();this.activeId=id;this.models.get(id)!.visible=true;this.audio.play('ui');this.onChanged?.();}
  cycle(direction:number):void{const ids=(['pistol','smg','shotgun'] as WeaponId[]).filter(id=>this.unlocked.has(id));const index=ids.indexOf(this.activeId);this.switchTo(ids[(index+(direction>0?1:-1)+ids.length)%ids.length]!);}

  update(delta:number,now:number,fire:boolean,reload:boolean,aiming:boolean):void{
    const weapon=this.active();const capacity=this.capacity(this.activeId);const reloadMultiplier=(1+this.stats.permanent.reloadSpeed*0.06)*this.upgrades.multiplier('reload',0.15);
    if(reload) { if(weapon.startReload(reloadMultiplier)) this.audio.play('reload'); }
    const step=weapon.update(delta,capacity,reloadMultiplier);if(step&&weapon.definition.shellReload)this.audio.play('reload');
    const wantsFire=fire&&(weapon.definition.automatic||!this.wasFireHeld);
    if(wantsFire){
      if(weapon.fire(now)){
        const baseSpread=weapon.definition.spread*(aiming?0.55:1)*this.upgrades.multiplier('recoil',-0.12);
        const forward=this.cameraController.forward();const right=new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion);const up=new THREE.Vector3(0,1,0).applyQuaternion(this.camera.quaternion);
        const origin=this.camera.getWorldPosition(new THREE.Vector3());const rays=createHitscanRays(origin,forward,right,up,weapon.definition.pellets,baseSpread,weapon.definition.range);
        this.onShot?.({weapon:this.activeId,rays,baseDamage:weapon.definition.damage});this.audio.play(this.activeId);this.cameraController.addRecoil(this.activeId==='shotgun'?0.65:this.activeId==='smg'?0.18:0.25);this.flashMuzzle();
      } else if(weapon.magazine<=0 && now-weapon.lastShotAt>0.25){this.audio.play('empty');weapon.lastShotAt=now;if(this.settings.autoReload)weapon.startReload(reloadMultiplier);}
    }
    const model=this.models.get(this.activeId)!;this.swayTime+=delta*(fire?11:5);const recoil=this.activeId==='shotgun'?0.08:0.035;model.position.x=0.34+Math.sin(this.swayTime)*0.006;model.position.y=-0.28+Math.abs(Math.cos(this.swayTime*0.5))*0.006;model.position.z=-0.62+Math.min(0.12,(now-weapon.lastShotAt<0.09?recoil:0));
    this.wasFireHeld=fire;this.muzzleTimer-=delta;if(this.muzzle&&this.muzzleTimer<=0){this.muzzle.visible=false;this.muzzle=undefined;}
  }

  capacity(id:WeaponId):number{const base=this.weapons[id].definition.magazine;if(id==='pistol')return base+this.upgrades.level('pistolMag')*4;if(id==='smg')return base+this.upgrades.level('smgMag')*8;return base+this.upgrades.level('shotgunMag')*2;}
  restock(multiplier=1):void{this.weapons.smg.reserve+=Math.round(45*multiplier);this.weapons.shotgun.reserve+=Math.round(12*multiplier);}

  dispose():void{this.models.forEach(model=>{this.camera.remove(model);});this.models.clear();}
  private flashMuzzle():void{const model=this.models.get(this.activeId)!;const flash=model.userData.muzzle as any;if(flash){flash.visible=true;this.muzzle=flash;this.muzzleTimer=0.045;}}
  private createPistol(m:any):any{const g=new THREE.Group();g.position.set(0.34,-0.28,-0.62);const slide=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.16,0.58),m.material(PALETTE.metal));slide.position.z=-0.15;g.add(slide);const grip=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.34,0.18),m.material(PALETTE.black));grip.position.set(0,-0.22,0.04);grip.rotation.x=-0.2;g.add(grip);this.addMuzzle(g,m,0,-0.06,-0.48);return g;}
  private createSmg(m:any):any{const g=new THREE.Group();g.position.set(0.34,-0.28,-0.62);const body=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.24,0.75),m.material(PALETTE.metal));body.position.z=-0.18;g.add(body);const mag=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.42,0.18),m.material(PALETTE.black));mag.position.set(0,-0.3,-0.12);mag.rotation.x=0.12;g.add(mag);const stock=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.18,0.35),m.material(PALETTE.metalDark));stock.position.z=0.38;g.add(stock);this.addMuzzle(g,m,0,0,-0.63);return g;}
  private createShotgun(m:any):any{const g=new THREE.Group();g.position.set(0.34,-0.28,-0.62);const receiver=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.28,0.65),m.material(PALETTE.metal));receiver.position.z=-0.05;g.add(receiver);const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.95,8),m.material(PALETTE.black));barrel.rotation.x=Math.PI/2;barrel.position.z=-0.7;g.add(barrel);const pump=new THREE.Mesh(new THREE.BoxGeometry(0.31,0.22,0.35),m.material(PALETTE.orange));pump.position.z=-0.45;g.add(pump);this.addMuzzle(g,m,0,0,-1.18);return g;}
  private addMuzzle(group:any,m:any,x:number,y:number,z:number):void{const flash=new THREE.Mesh(new THREE.ConeGeometry(0.13,0.32,6),m.material(PALETTE.orange,PALETTE.orange,3));flash.rotation.x=-Math.PI/2;flash.position.set(x,y,z);flash.visible=false;group.add(flash);group.userData.muzzle=flash;}
}
