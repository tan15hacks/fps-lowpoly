import * as THREE from 'three';
import { AudioManager } from './AudioManager';
import { EventBus } from './EventBus';
import { GameLoop } from './GameLoop';
import { InputManager } from './InputManager';
import { SaveManager } from './SaveManager';
import { SceneManager } from './SceneManager';
import { OutpostMap } from '../world/OutpostMap';
import { LowPolyMaterialFactory, PALETTE } from '../visuals/LowPolyMaterialFactory';
import { ParticleManager } from '../visuals/ParticleManager';
import { ScreenEffects } from '../visuals/ScreenEffects';
import { DamageNumbers } from '../visuals/DamageNumbers';
import { PlayerCamera } from '../player/PlayerCamera';
import { PlayerController } from '../player/PlayerController';
import { PlayerStats } from '../player/PlayerStats';
import { MobileControls } from '../player/MobileControls';
import { selectAimAssistDirection } from '../player/AimAssist';
import { WeaponManager, type ShotEvent } from '../weapons/WeaponManager';
import { ProjectileSystem } from '../combat/ProjectileSystem';
import { PickupSystem, type PickupKind } from '../combat/PickupSystem';
import { EnemyManager } from '../enemies/EnemyManager';
import { WaveManager } from '../waves/WaveManager';
import { OutpostManager } from '../outpost/OutpostManager';
import { UpgradeManager } from '../upgrades/UpgradeManager';
import { UIManager } from '../ui/UIManager';
import { HUD } from '../ui/HUD';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import type {
  Difficulty,
  EnemyKind,
  PowerSystemId,
  RunStats,
  Settings,
  WeaponId,
} from '../types/game';
import { calculateWeaponDamage } from '../utils/combatMath';
import { calculateRunCredits } from '../utils/rewards';
import { updateAchievements } from '../upgrades/AchievementManager';
import { UnavailableAdService } from '../monetization/AdService';
import {
  resolveBackAction,
  shouldPauseForBackground,
  SingleFlightGuard,
  type RunState,
} from './RunLifecycle';

interface ActiveRun {
  id: string;
  difficulty: Difficulty;
  upgrades: UpgradeManager;
  playerStats: PlayerStats;
  player: PlayerController;
  weapons: WeaponManager;
  projectiles: ProjectileSystem;
  pickups: PickupSystem;
  enemies: EnemyManager;
  waves: WaveManager;
  outpost: OutpostManager;
  stats: RunStats;
  state: RunState;
  bossRatio?: number;
  bossName?: string;
  lastKillAt: number;
  combo: number;
  damageAtWaveStart: number;
  deathDialog?: HTMLElement;
}

export class Game {
  readonly canvas: HTMLCanvasElement;
  private readonly save = new SaveManager();
  private readonly bus = new EventBus();
  private readonly materials = new LowPolyMaterialFactory();
  private readonly effects = new ScreenEffects();
  private readonly damageNumbers = new DamageNumbers();
  private readonly tutorial = new TutorialOverlay();
  private readonly ads = new UnavailableAdService();
  private sceneManager!: SceneManager;
  private map!: OutpostMap;
  private input!: InputManager;
  private mobile!: MobileControls;
  private hud!: HUD;
  private ui!: UIManager;
  private audio!: AudioManager;
  private particles!: ParticleManager;
  private loop!: GameLoop;
  private run?: ActiveRun;
  private menuTime = 0;
  private initialized = false;
  private resumeBlockedUntil = 0;
  private readonly startGuard = new SingleFlightGuard();

  constructor(private readonly host: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'game-canvas';
    this.host.appendChild(this.canvas);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    await this.save.load();
    this.sceneManager = new SceneManager(this.canvas, this.save.value.settings);
    this.map = new OutpostMap(this.materials);
    this.sceneManager.scene.add(this.map.group);
    this.input = new InputManager(this.canvas);
    this.audio = new AudioManager(this.save.value.settings);
    this.particles = new ParticleManager(this.sceneManager.scene, this.materials);
    this.hud = new HUD();
    this.hud.setSettings(
      this.save.value.settings.uiScale,
      this.save.value.settings.crosshairSize,
      this.save.value.settings.crosshairOpacity,
      this.save.value.settings.highContrast,
    );
    this.mobile = new MobileControls(this.input, this.save.value.settings);
    this.mobile.show(false);
    this.ui = new UIManager(this.save, {
      onPlay: (difficulty) => void this.startRun(difficulty),
      onResume: () => this.resume(),
      onRestart: () => {
        const difficulty = this.run?.difficulty ?? 'soldier';
        this.abandonRun();
        void this.startRun(difficulty);
      },
      onMainMenu: () => this.returnToMenu(),
      onStartWave: () => this.startWave(),
      onUpgrade: (id) => this.applyUpgrade(id),
      onPower: (id, active) => this.setPower(id, active),
      onSettings: (settings) => this.applySettings(settings),
      onTutorial: () => this.showTutorial(false),
      onRevive: () => this.revive(),
      onResetProgress: () => this.returnToMenu(),
    });

    this.sceneManager.camera.position.set(28, 18, 28);
    this.sceneManager.camera.lookAt(0, 2, 0);

    this.canvas.addEventListener('pointerdown', (event) => {
      void this.audio.unlock().then(() => this.audio.startAmbient());
      this.input.notePointerType(event.pointerType);
      if (this.run?.state !== 'playing') return;
      this.mobile.show(true);
      if (!this.input.prefersTouchControls()) this.input.requestPointerLock();
    });
    this.input.onPointerLockLost = () => {
      if (this.run?.state !== 'playing' || this.input.prefersTouchControls()) return;
      this.resumeBlockedUntil = performance.now() + 250;
      this.input.resetAll();
      this.pause();
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pauseForBackground();
    });
    window.addEventListener('blur', () => this.pauseForBackground());

    this.createRotateOverlay();
    this.loop = new GameLoop(
      (delta, now) => this.update(delta, now),
      () => this.sceneManager.render(),
    );
    this.loop.start();
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      void navigator.serviceWorker.register('./sw.js');
    }
  }

  handleBackButton(): boolean {
    const action = resolveBackAction(this.run?.state, Boolean(this.run?.deathDialog));
    if (action === 'keep-death-dialog' || action === 'consume') return true;
    if (action === 'pause') {
      this.pause();
      return true;
    }
    if (action === 'resume') {
      this.resume();
      return true;
    }
    return this.ui.handleBack();
  }

  pauseForBackground(): void {
    if (shouldPauseForBackground(this.run?.state)) this.pause();
  }

  private async startRun(difficulty: Difficulty): Promise<void> {
    if (!this.startGuard.tryEnter()) return;
    try {
      await this.audio.unlock();
      this.audio.startAmbient();
      this.abandonRun();

      const upgrades = new UpgradeManager();
      const playerStats = new PlayerStats(this.save.value.permanent, upgrades);
      const playerCamera = new PlayerCamera(
        this.sceneManager.camera,
        this.save.value.settings,
      );
      const player = new PlayerController(playerCamera, playerStats, this.map.collision);
      this.sceneManager.scene.add(player.root);
      const projectiles = new ProjectileSystem(
        this.sceneManager.scene,
        this.materials,
        this.map.collision,
      );
      const pickups = new PickupSystem(this.sceneManager.scene, this.materials);
      const enemies = new EnemyManager(
        this.sceneManager.scene,
        this.materials,
        this.map.collision,
        projectiles,
        pickups,
        this.particles,
        this.audio,
      );
      const weapons = new WeaponManager(
        this.sceneManager.camera,
        playerCamera,
        playerStats,
        upgrades,
        this.audio,
        this.save.value.settings,
        this.materials,
      );
      weapons.setAimDirectionResolver((origin, direction, range, maximumAngle) => {
        const targets: THREE.Vector3[] = [];
        for (const enemy of enemies.enemies) {
          if (!enemy.alive) continue;
          targets.push(
            enemy.weakPoint.visible
              ? enemy.weakPointWorld(new THREE.Vector3())
              : enemy.centerWorld(new THREE.Vector3()),
          );
        }
        return selectAimAssistDirection(
          origin,
          direction,
          targets,
          range,
          maximumAngle,
          (target) =>
            this.map.collision.segmentBlocked(
              origin.x,
              origin.z,
              target.x,
              target.z,
            ),
        );
      });
      const waves = new WaveManager(
        difficulty,
        () => enemies.aliveCount(),
        () => this.save.value.settings.maxEnemies,
      );
      const outpost = new OutpostManager(
        this.map.systems,
        enemies,
        playerStats,
        upgrades,
        this.particles,
        this.audio,
      );
      outpost.applyVisuals();
      const stats = createRunStats(difficulty);
      this.run = {
        id: crypto.randomUUID(),
        difficulty,
        upgrades,
        playerStats,
        player,
        weapons,
        projectiles,
        pickups,
        enemies,
        waves,
        outpost,
        stats,
        state: 'between',
        lastKillAt: 0,
        combo: 0,
        damageAtWaveStart: 0,
      };
      this.wireRun(this.run);
      this.ui.hideRoot();
      this.hud.show(true);
      this.mobile.show(false);
      if (!this.save.value.tutorialComplete) this.showTutorial(true);
      else this.showPreparation();
    } finally {
      this.startGuard.leave();
    }
  }

  private wireRun(run: ActiveRun): void {
    run.weapons.onShot = (event) => this.handleShot(event);
    run.projectiles.onPlayerHit = (damage) =>
      this.damagePlayer(damage, run.player.root.position);
    run.enemies.onPlayerDamage = (damage, source) => this.damagePlayer(damage, source);
    run.enemies.onEnemyKilled = (enemy) => this.enemyKilled(enemy.kind);
    run.enemies.onBossHealth = (ratio, name) => {
      if (!this.run) return;
      this.run.bossRatio = ratio;
      this.run.bossName = name;
    };
    run.pickups.onCollect = (kind, value) => this.collectPickup(kind, value);
    run.waves.onSpawn = (kind) =>
      run.enemies.spawn(kind, run.waves.wave, run.difficulty);
    run.waves.onWaveStarted = (definition) => {
      run.damageAtWaveStart = run.stats.damageReceived;
      run.outpost.beginWave();
      this.effects.announce(
        definition.boss ? `BOSS WAVE ${definition.wave}` : `WAVE ${definition.wave}`,
        definition.boss ? 'danger' : 'normal',
      );
      this.audio.play(definition.boss ? 'boss' : 'wave');
    };
    run.waves.onWaveComplete = (wave) => this.waveComplete(wave);
    run.outpost.onTurretDamage = (damage) => {
      run.stats.damageDealt += damage;
    };
  }

  private showTutorial(inRun: boolean): void {
    const previous = this.run?.state;
    if (this.run) this.run.state = 'paused';
    this.tutorial.show(this.input.prefersTouchControls(), () => {
      this.save.mutate((data) => {
        data.tutorialComplete = true;
        const record = data.achievements.tutorial;
        if (record) {
          record.progress = 1;
          record.completedAt ??= new Date().toISOString();
        }
      }, true);
      if (inRun && this.run) {
        this.run.state = previous === 'between' ? 'between' : 'playing';
        this.showPreparation();
      }
    });
  }

  private showPreparation(): void {
    const run = this.run;
    if (!run) return;
    run.state = 'between';
    this.mobile.show(false);
    this.hud.show(false);
    this.ui.showBetween(
      0,
      [],
      run.outpost.power.allocation,
      run.outpost.power.used(),
      run.outpost.power.capacity,
    );
  }

  private startWave(): void {
    const run = this.run;
    if (!run || run.state !== 'between') return;
    if (run.waves.wave === 0 || !run.waves.active) run.waves.startNext();
    this.input.resetAll();
    run.state = 'playing';
    this.hud.show(true);
    this.mobile.show(true);
    this.ui.closePause();
    if (!this.input.prefersTouchControls()) this.input.requestPointerLock();
  }

  private update(delta: number, now: number): void {
    this.particles.update(delta);
    const run = this.run;
    if (!run) {
      this.updateMenu(delta);
      return;
    }

    const input = this.input.snapshot();
    if (input.pause) {
      if (run.state === 'playing') this.pause();
      else if (run.state === 'paused' && performance.now() >= this.resumeBlockedUntil) {
        this.resume();
      }
    }
    if (run.state !== 'playing') return;

    if (input.selectWeapon !== undefined) {
      run.weapons.switchTo(
        (['pistol', 'smg', 'shotgun'] as WeaponId[])[input.selectWeapon]!,
      );
    }
    if (input.switchDelta !== 0) run.weapons.cycle(input.switchDelta);
    run.player.update(delta, input);
    run.weapons.update(
      delta,
      now,
      input.fire,
      input.reload,
      input.aim,
      input.lookSource,
    );
    run.enemies.update(delta, run.player.root.position, run.waves.wave, run.difficulty);
    const playerHead = run.player.root.position
      .clone()
      .add(new THREE.Vector3(0, 1, 0));
    run.projectiles.update(delta, playerHead);
    run.pickups.update(
      delta,
      playerHead,
      1.25 * run.upgrades.multiplier('pickup', 0.4),
    );
    run.outpost.update(delta, run.player.root.position);
    const regenLevel = run.upgrades.level('regen');
    if (
      regenLevel > 0 &&
      run.playerStats.health < run.playerStats.maxHealth * 0.25
    ) {
      run.playerStats.heal(delta * 1.2 * regenLevel);
    }
    run.waves.update(delta);
    run.stats.wave = run.waves.wave;
    run.stats.totalPlaytime = (Date.now() - run.stats.startedAt) / 1000;
    if (run.playerStats.isDead()) this.handleDeath();
    this.effects.setLowHealth(
      run.playerStats.health / run.playerStats.maxHealth < 0.25,
    );
    const weapon = run.weapons.active();
    this.hud.update({
      health: run.playerStats.health,
      maxHealth: run.playerStats.maxHealth,
      armor: run.playerStats.armor,
      maxArmor: run.playerStats.maxArmor,
      stamina: run.playerStats.stamina,
      weapon: run.weapons.activeId,
      weaponName: weapon.definition.name,
      magazine: weapon.magazine,
      reserve: weapon.reserve,
      wave: run.waves.wave,
      remaining: run.waves.remaining(),
      score: run.stats.score,
      power: run.outpost.power.allocation,
      bossRatio: run.bossRatio,
      bossName: run.bossName,
    });
  }

  private updateMenu(delta: number): void {
    this.input.snapshot();
    this.menuTime += delta * 0.14;
    const radius = 38;
    this.sceneManager.camera.position.set(
      Math.cos(this.menuTime) * radius,
      15 + Math.sin(this.menuTime * 0.7) * 3,
      Math.sin(this.menuTime) * radius,
    );
    this.sceneManager.camera.lookAt(0, 2, 0);
    const glow = this.map.systems.generator.userData.glow;
    if (glow) glow.scale.y = 1 + Math.sin(this.menuTime * 10) * 0.05;
  }

  private handleShot(event: ShotEvent): void {
    const run = this.run;
    if (!run) return;
    const permanentLevel =
      event.weapon === 'pistol'
        ? run.playerStats.permanent.pistolDamage
        : event.weapon === 'smg'
          ? run.playerStats.permanent.smgDamage
          : run.playerStats.permanent.shotgunDamage;
    const normalDamage = calculateWeaponDamage(
      event.baseDamage,
      permanentLevel,
      run.upgrades.level('damage'),
      false,
      0,
    );
    const criticalMultiplier = 1.75 + run.upgrades.level('crit') * 0.2;
    const hits = run.enemies.hitRays(
      event.rays,
      normalDamage,
      run.upgrades.level('penetration') > 0,
      1 + run.upgrades.level('weakpoint') * 0.22,
      criticalMultiplier,
    );
    run.stats.shotsFired += event.rays.length;
    run.stats.weaponsUsed[event.weapon] += event.rays.length;
    for (const hit of hits) {
      run.stats.shotsHit += 1;
      run.stats.damageDealt += hit.damage;
      if (hit.critical) run.stats.criticalHits += 1;
      if (this.save.value.settings.hitMarkers) this.effects.hitMarker(hit.critical);
      this.audio.play(hit.critical ? 'critical' : 'hit');
      if (this.save.value.settings.damageNumbers) {
        const projected = hit.point.clone().project(this.sceneManager.camera);
        this.damageNumbers.show(
          hit.damage,
          hit.critical,
          (projected.x * 0.5 + 0.5) * innerWidth,
          (-projected.y * 0.5 + 0.5) * innerHeight,
        );
      }
      const lifeSteal = run.upgrades.level('lifesteal');
      if (lifeSteal > 0) {
        run.playerStats.heal(Math.min(2.5, hit.damage * 0.02 * lifeSteal));
      }
      if (
        run.upgrades.level('ricochet') > 0 &&
        Math.random() < run.upgrades.level('ricochet') * 0.12
      ) {
        const bounce = run.enemies.nearest(hit.point, 8);
        if (bounce && bounce !== hit.enemy) {
          const extra = bounce.takeDamage(normalDamage * 0.55, false);
          run.stats.damageDealt += extra;
        }
      }
      if (
        hit.killed &&
        run.upgrades.level('explosion') > 0 &&
        Math.random() < run.upgrades.level('explosion') * 0.1
      ) {
        run.enemies.damageRadius(
          hit.enemy.group.position,
          3.5,
          45 * run.upgrades.level('explosion'),
        );
      }
    }
  }

  private damagePlayer(amount: number, source: any): void {
    const run = this.run;
    if (!run || run.state !== 'playing') return;
    const dealt = run.playerStats.damage(amount, performance.now() / 1000);
    if (dealt <= 0) return;
    run.stats.damageReceived += dealt;
    run.combo = 0;
    this.effects.damageFlash(Math.min(0.85, dealt / 30));
    run.player.cameraController.addShake(Math.min(1, dealt / 35));
    this.audio.play('damage');
    if (this.save.value.settings.vibration && navigator.vibrate) navigator.vibrate(35);
    const direction = run.player.root.position.clone().sub(source).normalize();
    this.bus.emit('damage-direction', direction);
  }

  private enemyKilled(kind: EnemyKind): void {
    const run = this.run;
    if (!run) return;
    const now = performance.now() / 1000;
    run.combo = now - run.lastKillAt < 3.2 ? run.combo + 1 : 1;
    run.lastKillAt = now;
    run.stats.highestCombo = Math.max(run.stats.highestCombo, run.combo);
    run.stats.enemiesDefeated += 1;
    if (kind === 'runner') run.stats.runnersDefeated += 1;
    else if (kind === 'brute') run.stats.brutesDefeated += 1;
    else if (kind === 'spitter') run.stats.spittersDefeated += 1;
    else run.stats.bossesDefeated += 1;
    const base = kind === 'boss' ? 1000 : kind === 'brute' ? 180 : kind === 'spitter' ? 130 : 80;
    run.stats.score += Math.round(base * (1 + Math.min(2, run.combo * 0.08)));
  }

  private collectPickup(kind: PickupKind, value: number): void {
    const run = this.run;
    if (!run) return;
    this.audio.play('pickup');
    this.particles.burst(
      run.player.root.position.clone().add(new THREE.Vector3(0, 1, 0)),
      kind === 'health' ? PALETTE.green : kind === 'armor' ? PALETTE.blue : PALETTE.orange,
      5,
      2,
    );
    if (kind === 'coin') {
      run.stats.coins += Math.round(value * run.upgrades.multiplier('coins', 0.18));
      run.stats.coinsCollected = run.stats.coins;
    } else if (kind === 'health') run.playerStats.heal(value);
    else if (kind === 'armor') run.playerStats.addArmor(value);
    else if (kind === 'smgAmmo') run.weapons.weapons.smg.reserve += value;
    else if (kind === 'shotgunAmmo') {
      run.weapons.weapons.shotgun.reserve += Math.max(2, Math.round(value / 2));
    } else {
      run.playerStats.addArmor(8);
      run.stats.coins += 5;
    }
  }

  private waveComplete(wave: number): void {
    const run = this.run;
    if (!run || run.state === 'ending') return;
    if (run.stats.damageReceived === run.damageAtWaveStart) {
      const record = this.save.value.achievements.untouched;
      if (record) {
        record.progress = 1;
        record.completedAt ??= new Date().toISOString();
      }
    }
    if (wave >= 15) {
      this.finishRun(true);
      return;
    }
    run.state = 'between';
    this.input.resetAll();
    this.hud.show(false);
    this.mobile.show(false);
    if (document.pointerLockElement) document.exitPointerLock();
    if (wave === 2) {
      run.weapons.unlock('smg');
      this.effects.announce('SMG UNLOCKED', 'success');
    }
    if (wave === 5) {
      run.weapons.unlock('shotgun');
      this.effects.announce('SHOTGUN UNLOCKED', 'success');
    }
    run.outpost.betweenWaveService(() =>
      run.weapons.restock(run.upgrades.multiplier('ammo', 0.25)),
    );
    const choices = run.upgrades.draw(3, run.weapons.unlocked);
    this.ui.showBetween(
      wave,
      choices,
      run.outpost.power.allocation,
      run.outpost.power.used(),
      run.outpost.power.capacity,
    );
    this.audio.play('wave');
  }

  private applyUpgrade(id: string): void {
    const run = this.run;
    if (!run) return;
    run.upgrades.apply(id);
    run.playerStats.applyUpgrade(id);
  }

  private setPower(id: PowerSystemId, active: boolean): boolean {
    const run = this.run;
    if (!run) return false;
    const ok = run.outpost.power.set(id, active);
    if (ok) run.outpost.applyVisuals();
    return ok;
  }

  private pause(): void {
    const run = this.run;
    if (!run || run.state !== 'playing') return;
    run.state = 'paused';
    this.mobile.show(false);
    this.input.resetAll();
    if (document.pointerLockElement) document.exitPointerLock();
    this.ui.showPause(run.upgrades.stacks);
  }

  private resume(): void {
    const run = this.run;
    if (!run || run.state !== 'paused' || run.deathDialog) return;
    this.input.resetAll();
    run.state = 'playing';
    this.ui.closePause();
    this.mobile.show(true);
    if (!this.input.prefersTouchControls()) this.input.requestPointerLock();
  }

  private handleDeath(): void {
    const run = this.run;
    if (!run || run.deathDialog || run.state === 'ending') return;
    run.state = 'paused';
    this.input.resetAll();
    this.mobile.show(false);
    if (document.pointerLockElement) document.exitPointerLock();
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    const canBuy = !run.playerStats.revived && run.stats.coins >= 80;
    modal.innerHTML = `<section class="panel death-panel"><small>DEFENDER DOWN</small><h2>Outpost Overrun</h2><p>${run.playerStats.revived ? 'Revive already used this run.' : canBuy ? 'Spend 80 run coins to revive with 50% health and 3 seconds of protection.' : 'Collect at least 80 run coins to purchase a revive.'}</p><div class="button-row"><button data-revive ${canBuy ? '' : 'disabled'}>REVIVE — 80 COINS</button><button class="danger" data-end>END RUN</button></div></section>`;
    document.body.appendChild(modal);
    run.deathDialog = modal;
    modal
      .querySelector('[data-revive]')!
      .addEventListener('click', () => this.revive());
    modal
      .querySelector('[data-end]')!
      .addEventListener('click', () => this.finishRun(false));
  }

  private revive(): void {
    const run = this.run;
    if (!run || run.playerStats.revived || run.stats.coins < 80) return;
    run.stats.coins -= 80;
    run.playerStats.revived = true;
    run.playerStats.health = run.playerStats.maxHealth * 0.5;
    run.playerStats.armor = 0;
    run.playerStats.invulnerableUntil = performance.now() / 1000 + 3;
    run.player.safeTeleport(this.map.systems.safePosition);
    run.deathDialog?.remove();
    run.deathDialog = undefined;
    this.input.resetAll();
    run.state = 'playing';
    this.mobile.show(true);
    if (!this.input.prefersTouchControls()) this.input.requestPointerLock();
    this.effects.announce('REVIVED', 'success');
  }

  private finishRun(victory: boolean): void {
    const run = this.run;
    if (!run || run.state === 'ending') return;
    run.state = 'ending';
    this.input.resetAll();
    run.deathDialog?.remove();
    run.deathDialog = undefined;
    run.stats.victory = victory;
    run.stats.endedAt = Date.now();
    run.stats.wave = run.waves.wave;
    const credits = Math.round(
      calculateRunCredits(run.stats) *
        (1 + this.save.value.permanent.coinBonus * 0.04),
    );
    this.commitRun(run, credits);
    this.hud.show(false);
    this.mobile.show(false);
    if (document.pointerLockElement) document.exitPointerLock();
    this.audio.play(victory ? 'victory' : 'defeat');
    this.ui.showResults(
      run.stats,
      credits,
      this.ads.available('doubleCredits'),
    );
  }

  private commitRun(run: ActiveRun, credits: number): void {
    this.save.mutate((data) => {
      data.credits += credits;
      const stats = data.stats;
      stats.totalRuns += 1;
      if (run.stats.victory) {
        stats.wins += 1;
        if (run.difficulty === 'soldier') stats.soldierWins += 1;
        if (run.difficulty === 'veteran') stats.veteranWins += 1;
      }
      stats.highestWave = Math.max(stats.highestWave, run.stats.wave);
      stats.enemiesDefeated += run.stats.enemiesDefeated;
      stats.runnersDefeated += run.stats.runnersDefeated;
      stats.brutesDefeated += run.stats.brutesDefeated;
      stats.spittersDefeated += run.stats.spittersDefeated;
      stats.bossesDefeated += run.stats.bossesDefeated;
      stats.shotsFired += run.stats.shotsFired;
      stats.shotsHit += run.stats.shotsHit;
      stats.criticalHits += run.stats.criticalHits;
      stats.damageDealt += run.stats.damageDealt;
      stats.damageReceived += run.stats.damageReceived;
      stats.coinsCollected += run.stats.coins;
      stats.totalPlaytime += (run.stats.endedAt! - run.stats.startedAt) / 1000;
      stats.highestCombo = Math.max(stats.highestCombo, run.stats.highestCombo);
      data.veteranUnlocked =
        data.veteranUnlocked || run.stats.wave >= 10 || run.stats.victory;
      updateAchievements(data, run.stats);
    }, true);
  }

  private returnToMenu(): void {
    this.abandonRun();
    this.ui.showRoot();
    this.ui.showMain();
    this.hud.show(false);
    this.mobile.show(false);
    this.sceneManager.scene.add(this.sceneManager.camera);
    this.sceneManager.camera.position.set(28, 18, 28);
    this.sceneManager.camera.fov = this.save.value.settings.fov;
    this.sceneManager.camera.updateProjectionMatrix();
    this.sceneManager.camera.lookAt(0, 2, 0);
  }

  private abandonRun(): void {
    this.mobile.show(false);
    this.input.resetAll();
    this.tutorial.close();
    if (document.pointerLockElement) document.exitPointerLock();
    const run = this.run;
    if (!run) return;
    run.deathDialog?.remove();
    run.deathDialog = undefined;
    run.player.cameraController.reset();
    run.weapons.onShot = undefined;
    run.projectiles.onPlayerHit = undefined;
    run.pickups.onCollect = undefined;
    run.enemies.onPlayerDamage = undefined;
    run.enemies.onEnemyKilled = undefined;
    run.enemies.onBossHealth = undefined;
    run.outpost.dispose();
    run.enemies.dispose();
    run.projectiles.dispose();
    run.pickups.dispose();
    run.weapons.dispose();
    this.sceneManager.scene.remove(run.player.root);
    this.ui.closePause();
    this.ui.closeBetween();
    this.run = undefined;
    this.effects.setLowHealth(false);
  }

  private applySettings(settings: Settings): void {
    this.sceneManager.applySettings(settings);
    this.audio.setSettings(settings);
    this.mobile.applySettings(settings);
    this.hud.setSettings(
      settings.uiScale,
      settings.crosshairSize,
      settings.crosshairOpacity,
      settings.highContrast,
    );
    this.run?.player.cameraController.setSettings(settings);
    this.run?.weapons.setSettings(settings);
  }

  private createRotateOverlay(): void {
    const overlay = document.createElement('div');
    overlay.className = 'rotate-overlay';
    overlay.innerHTML =
      '<div><span>↻</span><h2>Rotate Your Device</h2><p>Polygon Outpost is designed for landscape play.</p></div>';
    document.body.appendChild(overlay);
  }
}

function createRunStats(difficulty: Difficulty): RunStats {
  return {
    totalRuns: 1,
    wins: 0,
    highestWave: 0,
    enemiesDefeated: 0,
    runnersDefeated: 0,
    brutesDefeated: 0,
    spittersDefeated: 0,
    bossesDefeated: 0,
    shotsFired: 0,
    shotsHit: 0,
    criticalHits: 0,
    damageDealt: 0,
    damageReceived: 0,
    coinsCollected: 0,
    totalPlaytime: 0,
    highestCombo: 0,
    soldierWins: 0,
    veteranWins: 0,
    score: 0,
    wave: 0,
    coins: 0,
    startedAt: Date.now(),
    difficulty,
    victory: false,
    weaponsUsed: { pistol: 0, smg: 0, shotgun: 0 },
  };
}
