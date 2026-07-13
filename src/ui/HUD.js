export class HUD {
    root = document.createElement('div');
    constructor() { this.root.className = 'hud'; this.root.innerHTML = `<div class="hud-top"><div class="wave">WAVE <b data-wave>0</b><span data-remaining></span></div><div class="score">SCORE <b data-score>0</b></div></div><div class="bars"><label>HEALTH<div class="bar health"><i data-health></i></div><span data-health-text></span></label><label>ARMOR<div class="bar armor"><i data-armor></i></div><span data-armor-text></span></label><label>STAMINA<div class="bar stamina"><i data-stamina></i></div></label></div><div class="ammo"><small data-weapon></small><strong data-mag>0</strong><span>/ <b data-reserve>0</b></span></div><div class="power-icons" data-power></div><div class="boss-bar hidden" data-boss><span data-boss-name></span><div class="bar"><i data-boss-fill></i></div></div><div class="interact-prompt" data-interact></div><div class="crosshair"><i></i><i></i><i></i><i></i></div>`; document.body.appendChild(this.root); }
    show(value) { this.root.classList.toggle('visible', value); }
    update(d) {
        this.text('[data-wave]', String(d.wave));
        this.text('[data-remaining]', d.remaining > 0 ? ` • ${d.remaining} LEFT` : '');
        this.text('[data-score]', d.score.toLocaleString());
        this.width('[data-health]', d.health / d.maxHealth);
        this.width('[data-armor]', d.armor / d.maxArmor);
        this.width('[data-stamina]', d.stamina);
        this.text('[data-health-text]', `${Math.ceil(d.health)} / ${Math.ceil(d.maxHealth)}`);
        this.text('[data-armor-text]', `${Math.ceil(d.armor)} / ${Math.ceil(d.maxArmor)}`);
        this.text('[data-weapon]', d.weaponName);
        this.text('[data-mag]', String(d.magazine));
        this.text('[data-reserve]', d.reserve > 900 ? '∞' : String(d.reserve));
        this.text('[data-interact]', d.interact ?? '');
        const power = this.root.querySelector('[data-power]');
        power.innerHTML = Object.entries(d.power).filter(([, active]) => active).map(([id]) => `<span>${id.toUpperCase()}</span>`).join('');
        const boss = this.root.querySelector('[data-boss]');
        boss.classList.toggle('hidden', d.bossRatio === undefined || d.bossRatio <= 0);
        if (d.bossRatio !== undefined) {
            this.width('[data-boss-fill]', d.bossRatio);
            this.text('[data-boss-name]', d.bossName ?? 'BOSS');
        }
    }
    setSettings(uiScale, crosshairSize, crosshairOpacity, highContrast) { this.root.style.setProperty('--ui-scale', String(uiScale)); this.root.style.setProperty('--crosshair-scale', String(crosshairSize)); this.root.style.setProperty('--crosshair-opacity', String(crosshairOpacity)); this.root.classList.toggle('high-contrast', highContrast); }
    dispose() { this.root.remove(); }
    text(selector, value) { const e = this.root.querySelector(selector); if (e)
        e.textContent = value; }
    width(selector, ratio) { const e = this.root.querySelector(selector); if (e)
        e.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`; }
}
