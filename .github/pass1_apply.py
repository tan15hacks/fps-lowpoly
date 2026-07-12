from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:80]!r}')
    file_path.write_text(text.replace(old, new, 1), encoding='utf-8')


# Game lifecycle and cleanup.
replace_once(
    'src/core/Game.ts',
    "import { UnavailableAdService } from '../monetization/AdService';",
    "import { UnavailableAdService } from '../monetization/AdService';\nimport { resolveBackAction, shouldPauseForBackground, SingleFlightGuard, type RunState } from './RunLifecycle';",
)
replace_once(
    'src/core/Game.ts',
    "  state: 'playing' | 'paused' | 'between' | 'ending';",
    '  state: RunState;',
)
replace_once(
    'src/core/Game.ts',
    '  private menuTime = 0;',
    '  private menuTime = 0;\n  private initialized = false;\n  private readonly startGuard = new SingleFlightGuard();',
)
replace_once(
    'src/core/Game.ts',
    '  async initialize(): Promise<void> {\n    await this.save.load();',
    '  async initialize(): Promise<void> {\n    if (this.initialized) return;\n    this.initialized = true;\n    await this.save.load();',
)
replace_once(
    'src/core/Game.ts',
    '      onRevive: () => this.revive(),\n    });',
    '      onRevive: () => this.revive(),\n      onResetProgress: () => this.returnToMenu(),\n    });',
)
replace_once(
    'src/core/Game.ts',
    "    document.addEventListener('visibilitychange', () => { if (document.hidden && this.run?.state === 'playing') this.pause(); });\n    window.addEventListener('blur', () => { if (this.run?.state === 'playing') this.pause(); });",
    "    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pauseForBackground(); });\n    window.addEventListener('blur', () => this.pauseForBackground());",
)
replace_once(
    'src/core/Game.ts',
    "  handleBackButton(): boolean {\n    if (this.run?.deathDialog) { this.run.deathDialog.remove(); this.run.deathDialog = undefined; return true; }\n    if (this.run?.state === 'playing') { this.pause(); return true; }\n    if (this.run?.state === 'paused') { this.resume(); return true; }\n    if (this.run?.state === 'between') return true;\n    return this.ui.handleBack();\n  }",
    "  handleBackButton(): boolean {\n    const action = resolveBackAction(this.run?.state, Boolean(this.run?.deathDialog));\n    if (action === 'keep-death-dialog' || action === 'consume') return true;\n    if (action === 'pause') { this.pause(); return true; }\n    if (action === 'resume') { this.resume(); return true; }\n    return this.ui.handleBack();\n  }\n\n  pauseForBackground(): void {\n    if (shouldPauseForBackground(this.run?.state)) this.pause();\n  }",
)
replace_once(
    'src/core/Game.ts',
    "  private async startRun(difficulty: Difficulty): Promise<void> {\n    await this.audio.unlock(); this.audio.startAmbient(); this.abandonRun();",
    "  private async startRun(difficulty: Difficulty): Promise<void> {\n    if (!this.startGuard.tryEnter()) return;\n    try {\n      await this.audio.unlock(); this.audio.startAmbient(); this.abandonRun();",
)
replace_once(
    'src/core/Game.ts',
    "    if (!this.save.value.tutorialComplete) this.showTutorial(true); else this.showPreparation();\n  }\n\n  private wireRun",
    "      if (!this.save.value.tutorialComplete) this.showTutorial(true); else this.showPreparation();\n    } finally {\n      this.startGuard.leave();\n    }\n  }\n\n  private wireRun",
)
replace_once(
    'src/core/Game.ts',
    "  private startWave(): void {\n    const run = this.run; if (!run) return;\n    if (run.waves.wave === 0 || !run.waves.active) run.waves.startNext();\n    run.state = 'playing'; this.hud.show(true); this.mobile.show(true); this.ui.closePause();\n    this.input.requestPointerLock();\n  }",
    "  private startWave(): void {\n    const run = this.run; if (!run || run.state !== 'between') return;\n    if (run.waves.wave === 0 || !run.waves.active) run.waves.startNext();\n    this.input.resetAll();\n    run.state = 'playing'; this.hud.show(true); this.mobile.show(true); this.ui.closePause();\n    this.input.requestPointerLock();\n  }",
)
replace_once(
    'src/core/Game.ts',
    "  private pause(): void { const run = this.run; if (!run || run.state !== 'playing') return; run.state = 'paused'; this.mobile.show(false); if (document.pointerLockElement) document.exitPointerLock(); this.ui.showPause(run.upgrades.stacks); }\n  private resume(): void { const run = this.run; if (!run || run.state !== 'paused') return; run.state = 'playing'; this.ui.closePause(); this.mobile.show(true); this.input.requestPointerLock(); }",
    "  private pause(): void { const run = this.run; if (!run || run.state !== 'playing') return; run.state = 'paused'; this.mobile.show(false); this.input.resetAll(); if (document.pointerLockElement) document.exitPointerLock(); this.ui.showPause(run.upgrades.stacks); }\n  private resume(): void { const run = this.run; if (!run || run.state !== 'paused' || run.deathDialog) return; this.input.resetAll(); run.state = 'playing'; this.ui.closePause(); this.mobile.show(true); this.input.requestPointerLock(); }",
)
replace_once(
    'src/core/Game.ts',
    "  private abandonRun(): void { if (!this.run) return; this.run.deathDialog?.remove(); this.run.enemies.clear(); this.run.projectiles.clear(); this.run.pickups.clear(); this.sceneManager.scene.remove(this.run.player.root); this.ui.closePause(); this.ui.closeBetween(); this.run = undefined; this.effects.setLowHealth(false); }",
    "  private abandonRun(): void {\n    this.mobile.show(false); this.input.resetAll(); this.tutorial.close();\n    if (document.pointerLockElement) document.exitPointerLock();\n    const run = this.run; if (!run) return;\n    run.deathDialog?.remove(); run.deathDialog = undefined;\n    run.weapons.onShot = undefined; run.projectiles.onPlayerHit = undefined; run.pickups.onCollect = undefined;\n    run.enemies.onPlayerDamage = undefined; run.enemies.onEnemyKilled = undefined; run.enemies.onBossHealth = undefined;\n    run.outpost.dispose(); run.enemies.dispose(); run.projectiles.dispose(); run.pickups.dispose(); run.weapons.dispose();\n    this.sceneManager.scene.remove(run.player.root); this.ui.closePause(); this.ui.closeBetween();\n    this.run = undefined; this.effects.setLowHealth(false);\n  }",
)

# Capacitor backgrounding must never behave like the Back button.
replace_once(
    'src/main.ts',
    "  void App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {\n    if (!isActive) game.handleBackButton();\n  });",
    "  void App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {\n    if (!isActive) game.pauseForBackground();\n  });",
)

# Settings reset must unwind an active run and its modal.
replace_once(
    'src/ui/UIManager.ts',
    'export interface UIHooks{onPlay:(difficulty:Difficulty)=>void;onResume:()=>void;onRestart:()=>void;onMainMenu:()=>void;onStartWave:()=>void;onUpgrade:(id:string)=>void;onPower:(id:PowerSystemId,active:boolean)=>boolean;onSettings:(settings:Settings)=>void;onTutorial:()=>void;onRevive:()=>void;}',
    'export interface UIHooks{onPlay:(difficulty:Difficulty)=>void;onResume:()=>void;onRestart:()=>void;onMainMenu:()=>void;onStartWave:()=>void;onUpgrade:(id:string)=>void;onPower:(id:PowerSystemId,active:boolean)=>boolean;onSettings:(settings:Settings)=>void;onTutorial:()=>void;onRevive:()=>void;onResetProgress:()=>void;}',
)
replace_once(
    'src/ui/UIManager.ts',
    "  readonly root=document.createElement('div');private screen='main';private pauseRoot?:HTMLDivElement;private betweenRoot?:HTMLDivElement;private resultsRoot?:HTMLDivElement;",
    "  readonly root=document.createElement('div');private screen='main';private pauseRoot?:HTMLDivElement;private betweenRoot?:HTMLDivElement;private resultsRoot?:HTMLDivElement;private settingsModal?:HTMLDivElement;",
)
replace_once(
    'src/ui/UIManager.ts',
    "if(inModal){const modal=document.createElement('div');",
    "if(inModal){this.settingsModal?.remove();const modal=document.createElement('div');this.settingsModal=modal;",
)
replace_once(
    'src/ui/UIManager.ts',
    "modal.querySelector('[data-close]')!.addEventListener('click',()=>modal.remove());",
    "modal.querySelector('[data-close]')!.addEventListener('click',()=>{modal.remove();if(this.settingsModal===modal)this.settingsModal=undefined;});",
)
replace_once(
    'src/ui/UIManager.ts',
    'this.save.replace(createDefaultSave());this.hooks.onSettings(this.save.value.settings);this.showMain();',
    'this.save.replace(createDefaultSave());this.hooks.onSettings(this.save.value.settings);this.hooks.onResetProgress();',
)
replace_once(
    'src/ui/UIManager.ts',
    '  private clearOverlays():void{this.closePause();this.closeBetween();this.resultsRoot?.remove();this.resultsRoot=undefined;}',
    '  private clearOverlays():void{this.closePause();this.closeBetween();this.resultsRoot?.remove();this.resultsRoot=undefined;this.settingsModal?.remove();this.settingsModal=undefined;}',
)

# Enemy-owned callbacks and delayed boss phase restoration must be cancellable.
replace_once(
    'src/enemies/EnemyManager.ts',
    '  private readonly center = new THREE.Vector3(); private readonly weak = new THREE.Vector3();',
    '  private readonly center = new THREE.Vector3(); private readonly weak = new THREE.Vector3();\n  private readonly timers = new Set<number>(); private disposed = false;',
)
replace_once(
    'src/enemies/EnemyManager.ts',
    '  update(delta: number, playerPosition: any, wave: number, difficulty: Difficulty): void {\n    const positions = this.enemies.filter(e => e.alive).map(e => e.group.position);',
    '  update(delta: number, playerPosition: any, wave: number, difficulty: Difficulty): void {\n    if (this.disposed) return;\n    const positions = this.enemies.filter(e => e.alive).map(e => e.group.position);',
)
replace_once(
    'src/enemies/EnemyManager.ts',
    "  clear(): void { this.enemies.forEach(enemy => this.scene.remove(enemy.group)); this.enemies.length = 0; this.onBossHealth?.(0, ''); }",
    "  clear(): void { this.enemies.forEach(enemy => { this.scene.remove(enemy.group); enemy.dispose(); }); this.enemies.length = 0; this.onBossHealth?.(0, ''); }\n  dispose(): void { if (this.disposed) return; this.disposed = true; for (const timer of this.timers) window.clearTimeout(timer); this.timers.clear(); this.clear(); this.onPlayerDamage = undefined; this.onEnemyKilled = undefined; this.onBossHealth = undefined; }",
)
replace_once(
    'src/enemies/EnemyManager.ts',
    "window.setTimeout(() => { if (enemy.alive) { enemy.armorActive = false; enemy.weakPoint.visible = true; } }, 2800);",
    "this.schedule(() => { if (enemy.alive) { enemy.armorActive = false; enemy.weakPoint.visible = true; } }, 2800);",
)
replace_once(
    'src/enemies/EnemyManager.ts',
    '  private remove(index: number, difficulty: Difficulty): void {',
    "  private schedule(callback: () => void, milliseconds: number): void { const timer = window.setTimeout(() => { this.timers.delete(timer); if (!this.disposed) callback(); }, milliseconds); this.timers.add(timer); }\n\n  private remove(index: number, difficulty: Difficulty): void {",
)
replace_once(
    'src/enemies/EnemyManager.ts',
    "    this.pickups.drop(enemy.group.position, enemy.kind, difficulty, 1); this.onEnemyKilled?.(enemy); this.enemies.splice(index, 1); if (enemy.kind === 'boss') this.onBossHealth?.(0, '');",
    "    this.pickups.drop(enemy.group.position, enemy.kind, difficulty, 1); this.onEnemyKilled?.(enemy); this.enemies.splice(index, 1); enemy.dispose(); if (enemy.kind === 'boss') this.onBossHealth?.(0, '');",
)

# Lockfile-based reproducible CI.
for workflow in ('.github/workflows/ci.yml', '.github/workflows/deploy-pages.yml'):
    replace_once(workflow, 'run: npm install', 'run: npm ci')
