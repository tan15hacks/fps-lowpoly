export class CapacitorAdService {
    ids = { revive: import.meta.env.VITE_ADMOB_REWARDED_REVIVE_ID, doubleCredits: import.meta.env.VITE_ADMOB_REWARDED_DOUBLE_CREDITS_ID, reroll: import.meta.env.VITE_ADMOB_REWARDED_REROLL_ID };
    available(_reward) { return false; }
    async show(_reward) { return false; }
    configured(reward) { return Boolean(this.ids[reward]); }
}
