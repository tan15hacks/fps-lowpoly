export class ScreenEffects {
    damage;
    hit;
    announcement;
    constructor() {
        this.damage = document.createElement('div');
        this.damage.className = 'damage-vignette';
        document.body.appendChild(this.damage);
        this.hit = document.createElement('div');
        this.hit.className = 'hit-marker';
        this.hit.textContent = '×';
        document.body.appendChild(this.hit);
        this.announcement = document.createElement('div');
        this.announcement.className = 'announcement';
        document.body.appendChild(this.announcement);
    }
    damageFlash(intensity = 1) { this.damage.style.opacity = String(Math.min(0.85, intensity)); window.setTimeout(() => { this.damage.style.opacity = '0'; }, 120); }
    hitMarker(critical = false) { this.hit.classList.toggle('critical', critical); this.hit.classList.remove('show'); void this.hit.offsetWidth; this.hit.classList.add('show'); }
    announce(text, tone = 'normal') { this.announcement.textContent = text; this.announcement.dataset.tone = tone; this.announcement.classList.remove('show'); void this.announcement.offsetWidth; this.announcement.classList.add('show'); }
    setLowHealth(active) { this.damage.classList.toggle('low-health', active); }
    dispose() { this.damage.remove(); this.hit.remove(); this.announcement.remove(); }
}
