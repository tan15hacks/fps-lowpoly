export class RecoilSystem {
    value = 0;
    kick(amount) { this.value = Math.min(1.5, this.value + amount); }
    update(delta) { this.value = Math.max(0, this.value - delta * 5.5); return this.value; }
}
