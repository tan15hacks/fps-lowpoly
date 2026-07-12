import * as THREE from 'three';
import type { EnemyKind } from '../types/game';
import { LowPolyMaterialFactory, PALETTE } from '../visuals/LowPolyMaterialFactory';

export type PickupKind='coin'|'health'|'armor'|'smgAmmo'|'shotgunAmmo'|'power';
interface Pickup{kind:PickupKind;mesh:any;life:number;phase:number}

export class PickupSystem{
  private pickups:Pickup[]=[];
  onCollect?:(kind:PickupKind,value:number)=>void;
  constructor(private scene:any,private materials:LowPolyMaterialFactory){}
  drop(position:any,enemy:EnemyKind,difficulty:'recruit'|'soldier'|'veteran',coinMultiplier:number):void{
    const coinCount=enemy==='boss'?8:enemy==='brute'?2:1;for(let i=0;i<coinCount;i++)this.spawn('coin',position,Math.max(1,Math.round(1*coinMultiplier)));
    const healthChance=difficulty==='recruit'?0.19:difficulty==='veteran'?0.07:0.12;
    if(Math.random()<healthChance)this.spawn('health',position,18);
    if(Math.random()<0.09)this.spawn('armor',position,12);
    if(Math.random()<0.12)this.spawn(Math.random()<0.68?'smgAmmo':'shotgunAmmo',position,enemy==='boss'?24:8);
    if(Math.random()<0.035)this.spawn('power',position,1);
  }
  spawn(kind:PickupKind,position:any,value:number):void{
    const color={coin:PALETTE.orange,health:PALETTE.green,armor:PALETTE.blue,smgAmmo:PALETTE.cream,shotgunAmmo:PALETTE.red,power:PALETTE.cyan}[kind];
    const geometry=kind==='coin'?new THREE.CylinderGeometry(0.18,0.18,0.06,10):new THREE.OctahedronGeometry(0.25,0);
    const mesh=new THREE.Mesh(geometry,this.materials.material(color,color,0.8));mesh.position.copy(position);mesh.position.x+=(Math.random()-0.5)*0.8;mesh.position.z+=(Math.random()-0.5)*0.8;mesh.position.y=0.55;mesh.userData.value=value;this.scene.add(mesh);this.pickups.push({kind,mesh,life:18,phase:Math.random()*6});
  }
  update(delta:number,player:any,radius:number):void{
    for(let i=this.pickups.length-1;i>=0;i--){const p=this.pickups[i]!;p.life-=delta;p.phase+=delta*3;p.mesh.rotation.y+=delta*2.2;p.mesh.position.y=0.55+Math.sin(p.phase)*0.08;const d=p.mesh.position.distanceTo(player);
      if(d<radius){if(d>0.45)p.mesh.position.lerp(player,Math.min(1,delta*8));else{this.onCollect?.(p.kind,p.mesh.userData.value as number);this.remove(i);continue;}}
      if(p.life<=0)this.remove(i);
    }
  }
  clear():void{for(let i=this.pickups.length-1;i>=0;i--)this.remove(i);}
  private remove(i:number):void{const p=this.pickups[i]!;this.scene.remove(p.mesh);p.mesh.geometry.dispose();this.pickups.splice(i,1);}
}
