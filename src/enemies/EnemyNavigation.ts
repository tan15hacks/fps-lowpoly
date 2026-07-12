import * as THREE from 'three';
import { CollisionWorld } from '../world/CollisionWorld';

export class EnemyNavigation{
  constructor(private collision:CollisionWorld){}
  steer(position:any,target:any,radius:number,neighbors:any[]):any{
    const desired=target.clone().sub(position);desired.y=0;if(desired.lengthSq()>0.001)desired.normalize();
    const ahead=position.clone().addScaledVector(desired,radius*2.8);
    for(const obstacle of this.collision.obstacles){if(ahead.x>obstacle.minX-radius&&ahead.x<obstacle.maxX+radius&&ahead.z>obstacle.minZ-radius&&ahead.z<obstacle.maxZ+radius){
      const left=new THREE.Vector3(-desired.z,0,desired.x);const testLeft=position.clone().addScaledVector(left,radius*2);const leftBlocked=this.collision.resolveCircle(testLeft.x,testLeft.z,radius);const leftMoved=Math.hypot(leftBlocked.x-testLeft.x,leftBlocked.z-testLeft.z)>0.05;desired.addScaledVector(left,leftMoved?-1.2:1.2).normalize();break;
    }}
    for(const neighbor of neighbors){if(neighbor===position)continue;const away=position.clone().sub(neighbor);const dist=away.length();if(dist>0&&dist<radius*2.2)desired.addScaledVector(away.normalize(),(radius*2.2-dist)*0.7);}
    return desired.normalize();
  }
  resolve(position:any,radius:number):void{const r=this.collision.resolveCircle(position.x,position.z,radius);position.x=r.x;position.z=r.z;}
  hasLineOfSight(a:any,b:any):boolean{return !this.collision.segmentBlocked(a.x,a.z,b.x,b.z);}
}
