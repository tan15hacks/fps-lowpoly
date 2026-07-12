import * as THREE from 'three';
import { LowPolyMaterialFactory, PALETTE } from '../visuals/LowPolyMaterialFactory';
import { CollisionWorld } from '../world/CollisionWorld';

interface Projectile { mesh:any; velocity:any; life:number; damage:number; radius:number }
interface Hazard { mesh:any; life:number; damage:number; tick:number }

export class ProjectileSystem {
  private projectiles:Projectile[]=[];private hazards:Hazard[]=[];private pool:any[]=[];
  onPlayerHit?:(damage:number)=>void;
  constructor(private scene:any,private materials:LowPolyMaterialFactory,private collision:CollisionWorld){}
  spawn(origin:any,target:any,damage:number,speed=10):void{
    const mesh=this.pool.pop()??new THREE.Mesh(new THREE.IcosahedronGeometry(0.16,0),this.materials.material(PALETTE.acid,PALETTE.acid,2));
    mesh.visible=true;mesh.position.copy(origin);this.scene.add(mesh);const velocity=target.clone().sub(origin).normalize().multiplyScalar(speed);this.projectiles.push({mesh,velocity,life:4,damage,radius:0.25});
  }
  update(delta:number,playerPosition:any):void{
    for(let i=this.projectiles.length-1;i>=0;i--){const p=this.projectiles[i]!;p.life-=delta;const previous=p.mesh.position.clone();p.mesh.position.addScaledVector(p.velocity,delta);p.mesh.rotation.x+=delta*8;
      const hitWall=this.collision.segmentBlocked(previous.x,previous.z,p.mesh.position.x,p.mesh.position.z);
      const hitPlayer=p.mesh.position.distanceTo(playerPosition)<0.75;
      if(hitPlayer){this.onPlayerHit?.(p.damage);this.removeProjectile(i);}
      else if(hitWall||p.life<=0){this.createHazard(p.mesh.position,p.damage*0.32);this.removeProjectile(i);}
    }
    for(let i=this.hazards.length-1;i>=0;i--){const h=this.hazards[i]!;h.life-=delta;h.tick-=delta;h.mesh.rotation.z+=delta;h.mesh.material.opacity=Math.min(0.45,h.life*0.2);
      const flatDistance=Math.hypot(h.mesh.position.x-playerPosition.x,h.mesh.position.z-playerPosition.z);
      if(flatDistance<1.6&&h.tick<=0){this.onPlayerHit?.(h.damage);h.tick=0.65;}
      if(h.life<=0){this.scene.remove(h.mesh);h.mesh.geometry.dispose();this.hazards.splice(i,1);}
    }
  }
  clear():void{for(let i=this.projectiles.length-1;i>=0;i--)this.removeProjectile(i);this.hazards.forEach(h=>{this.scene.remove(h.mesh);h.mesh.geometry.dispose();});this.hazards=[];}
  private removeProjectile(index:number):void{const p=this.projectiles[index]!;this.scene.remove(p.mesh);p.mesh.visible=false;this.pool.push(p.mesh);this.projectiles.splice(index,1);}
  private createHazard(position:any,damage:number):void{const mesh=new THREE.Mesh(new THREE.CircleGeometry(1.6,12),this.materials.transparent(PALETTE.acid,0.4));mesh.rotation.x=-Math.PI/2;mesh.position.copy(position);mesh.position.y=0.04;this.scene.add(mesh);this.hazards.push({mesh,life:4.2,damage,tick:0});}
}
