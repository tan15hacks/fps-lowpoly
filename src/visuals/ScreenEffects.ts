export class ScreenEffects {
  private readonly damage: HTMLDivElement; private readonly hit: HTMLDivElement; private readonly announcement: HTMLDivElement;
  constructor() {
    this.damage = document.createElement('div'); this.damage.className = 'damage-vignette'; document.body.appendChild(this.damage);
    this.hit = document.createElement('div'); this.hit.className = 'hit-marker'; this.hit.textContent = '×'; document.body.appendChild(this.hit);
    this.announcement = document.createElement('div'); this.announcement.className = 'announcement'; document.body.appendChild(this.announcement);
  }
  damageFlash(intensity = 1): void { this.damage.style.opacity = String(Math.min(0.85,intensity)); window.setTimeout(()=>{this.damage.style.opacity='0';},120); }
  hitMarker(critical = false): void { this.hit.classList.toggle('critical', critical); this.hit.classList.remove('show'); void this.hit.offsetWidth; this.hit.classList.add('show'); }
  announce(text: string, tone: 'normal'|'danger'|'success'='normal'): void { this.announcement.textContent=text; this.announcement.dataset.tone=tone; this.announcement.classList.remove('show'); void this.announcement.offsetWidth; this.announcement.classList.add('show'); }
  setLowHealth(active: boolean): void { this.damage.classList.toggle('low-health', active); }
  dispose(): void { this.damage.remove(); this.hit.remove(); this.announcement.remove(); }
}
