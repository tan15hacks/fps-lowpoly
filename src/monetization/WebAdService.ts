import type { AdReward,AdService } from './AdService';
export class WebAdService implements AdService{available(_reward:AdReward):boolean{return false;}async show(_reward:AdReward):Promise<boolean>{return false;}}
