import type { AdReward,AdService } from './AdService';
export class CapacitorAdService implements AdService{
  private ids:Record<AdReward,string|undefined>={revive:import.meta.env.VITE_ADMOB_REWARDED_REVIVE_ID,doubleCredits:import.meta.env.VITE_ADMOB_REWARDED_DOUBLE_CREDITS_ID,reroll:import.meta.env.VITE_ADMOB_REWARDED_REROLL_ID};
  available(_reward:AdReward):boolean{return false;}
  async show(_reward:AdReward):Promise<boolean>{return false;}
  configured(reward:AdReward):boolean{return Boolean(this.ids[reward]);}
}
