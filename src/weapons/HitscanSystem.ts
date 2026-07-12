import * as THREE from 'three';

export interface HitscanRay { origin: any; direction: any; range: number }
export function createHitscanRays(origin:any,forward:any,right:any,up:any,pellets:number,spread:number,range:number,rng:()=>number=Math.random):HitscanRay[]{
  const rays:HitscanRay[]=[];
  for(let i=0;i<pellets;i+=1){
    const direction=forward.clone().addScaledVector(right,(rng()-0.5)*spread*2).addScaledVector(up,(rng()-0.5)*spread*2).normalize();
    rays.push({origin:origin.clone(),direction,range});
  }
  return rays;
}
export function raySphereDistance(origin:any,direction:any,center:any,radius:number):number|undefined{
  const offset=center.clone().sub(origin);const projection=offset.dot(direction);if(projection<0)return undefined;
  const closestSq=offset.lengthSq()-projection*projection;const radiusSq=radius*radius;if(closestSq>radiusSq)return undefined;
  return projection-Math.sqrt(Math.max(0,radiusSq-closestSq));
}
export const scratchRaycaster=new THREE.Raycaster();
