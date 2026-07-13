export class DamageNumbers {
    root = document.createElement('div');
    constructor() { this.root.className = 'damage-numbers'; document.body.appendChild(this.root); }
    show(value, critical, screenX, screenY) {
        const item = document.createElement('span');
        item.className = critical ? 'critical' : '';
        item.textContent = String(Math.round(value));
        item.style.left = `${screenX}px`;
        item.style.top = `${screenY}px`;
        this.root.appendChild(item);
        window.setTimeout(() => item.remove(), 650);
    }
    dispose() { this.root.remove(); }
}
