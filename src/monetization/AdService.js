export class UnavailableAdService {
    available(_reward) { return false; }
    async show(_reward) { return false; }
}
export class RewardGuard {
    rewarded = new Set();
    claim(runId, reward) { const key = `${runId}:${reward}`; if (this.rewarded.has(key))
        return false; this.rewarded.add(key); return true; }
    clear() { this.rewarded.clear(); }
}
