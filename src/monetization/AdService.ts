export type AdReward='revive'|'doubleCredits'|'reroll';
export interface AdService{available(reward:AdReward):boolean;show(reward:AdReward):Promise<boolean>;}
export class UnavailableAdService implements AdService{available(_reward:AdReward):boolean{return false;}async show(_reward:AdReward):Promise<boolean>{return false;}}
export class RewardGuard{private rewarded=new Set<string>();claim(runId:string,reward:AdReward):boolean{const key=`${runId}:${reward}`;if(this.rewarded.has(key))return false;this.rewarded.add(key);return true;}clear():void{this.rewarded.clear();}}
