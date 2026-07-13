export class TutorialOverlay {
    root;
    index = 0;
    desktop = [['MOVE', 'Use W A S D to move around the courtyard.'], ['LOOK', 'Click the game, then move the mouse to look.'], ['FIRE', 'Left-click to fire. Aim for glowing weak points.'], ['RELOAD', 'Press R before your magazine runs dry.'], ['WEAPONS', 'Use 1–3 or the mouse wheel to switch weapons.'], ['PICKUPS', 'Walk near glowing drops to collect them.'], ['POWER GRID', 'Between waves, choose which outpost systems receive power.'], ['UPGRADES', 'Choose one temporary upgrade after each wave.']];
    mobile = [['MOVE', 'Use the left joystick to move.'], ['LOOK', 'Drag the right side of the screen to look.'], ['FIRE', 'Hold FIRE and aim at glowing weak points.'], ['RELOAD', 'Tap R to reload.'], ['WEAPONS', 'Tap SWAP to change weapons.'], ['PICKUPS', 'Move near glowing drops to collect them.'], ['POWER GRID', 'Between waves, choose which outpost systems receive power.'], ['UPGRADES', 'Choose one temporary upgrade after each wave.']];
    show(isMobile, onComplete) { this.index = 0; const steps = isMobile ? this.mobile : this.desktop; this.root = document.createElement('div'); this.root.className = 'tutorial'; this.root.innerHTML = `<section class="panel tutorial-panel"><small>FIELD TRAINING</small><h2></h2><p></p><div class="tutorial-progress"></div><div class="button-row"><button data-skip>Skip</button><button class="primary" data-next>Next</button></div></section>`; document.body.appendChild(this.root); const render = () => { const step = steps[this.index]; this.root.querySelector('h2').textContent = step[0]; this.root.querySelector('p').textContent = step[1]; this.root.querySelector('.tutorial-progress').textContent = `${this.index + 1} / ${steps.length}`; this.root.querySelector('[data-next]').textContent = this.index === steps.length - 1 ? 'Deploy' : 'Next'; }; const finish = () => { this.root?.remove(); this.root = undefined; onComplete(); }; this.root.querySelector('[data-skip]').addEventListener('click', finish); this.root.querySelector('[data-next]').addEventListener('click', () => { if (this.index >= steps.length - 1)
        finish();
    else {
        this.index++;
        render();
    } }); render(); }
    close() { this.root?.remove(); this.root = undefined; }
}
