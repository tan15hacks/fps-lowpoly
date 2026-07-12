export type Difficulty = 'recruit' | 'soldier' | 'veteran';
export type WeaponId = 'pistol' | 'smg' | 'shotgun';
export type EnemyKind = 'runner' | 'brute' | 'spitter' | 'boss';
export type UpgradeRarity = 'common' | 'uncommon' | 'rare' | 'epic';
export type PowerSystemId = 'turret' | 'fence' | 'healing' | 'ammo' | 'scanner';

export interface Vec3Like { x: number; y: number; z: number }

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  mouseSensitivity: number;
  touchSensitivity: number;
  aimSensitivity: number;
  quality: 'low' | 'medium' | 'high';
  shadowQuality: 'off' | 'low' | 'high';
  resolutionScale: number;
  maxEnemies: number;
  fov: number;
  cameraShake: number;
  headBob: number;
  reducedMotion: boolean;
  aimAssist: boolean;
  autoReload: boolean;
  damageNumbers: boolean;
  hitMarkers: boolean;
  vibration: boolean;
  leftHanded: boolean;
  controlOpacity: number;
  uiScale: number;
  crosshairSize: number;
  crosshairOpacity: number;
  highContrast: boolean;
}

export interface PermanentLevels {
  health: number;
  armor: number;
  pistolDamage: number;
  smgDamage: number;
  shotgunDamage: number;
  reloadSpeed: number;
  startingAmmo: number;
  coinBonus: number;
  turretEfficiency: number;
  healingEfficiency: number;
}

export interface LifetimeStats {
  totalRuns: number;
  wins: number;
  highestWave: number;
  enemiesDefeated: number;
  runnersDefeated: number;
  brutesDefeated: number;
  spittersDefeated: number;
  bossesDefeated: number;
  shotsFired: number;
  shotsHit: number;
  criticalHits: number;
  damageDealt: number;
  damageReceived: number;
  coinsCollected: number;
  totalPlaytime: number;
  highestCombo: number;
  soldierWins: number;
  veteranWins: number;
}

export interface AchievementRecord {
  id: string;
  progress: number;
  completedAt?: string;
}

export interface SaveData {
  schemaVersion: number;
  credits: number;
  permanent: PermanentLevels;
  settings: Settings;
  tutorialComplete: boolean;
  veteranUnlocked: boolean;
  achievements: Record<string, AchievementRecord>;
  stats: LifetimeStats;
  ownedCosmetics: string[];
  equippedCosmetic: string;
}

export interface RunStats extends LifetimeStats {
  score: number;
  wave: number;
  coins: number;
  startedAt: number;
  endedAt?: number;
  difficulty: Difficulty;
  victory: boolean;
  weaponsUsed: Record<WeaponId, number>;
}

export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  damage: number;
  magazine: number;
  reserve: number;
  fireRate: number;
  reloadTime: number;
  pellets: number;
  spread: number;
  range: number;
  automatic: boolean;
  shellReload: boolean;
}

export interface EnemyDefinition {
  kind: EnemyKind;
  health: number;
  speed: number;
  damage: number;
  attackCooldown: number;
  reward: number;
  radius: number;
}

export interface WaveEntry { kind: EnemyKind; count: number }
export interface WaveDefinition { wave: number; groups: WaveEntry[]; spawnInterval: number; boss: boolean }

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  rarity: UpgradeRarity;
  maxStacks: number;
  requiredWeapon?: WeaponId;
}

export interface PowerAllocation { turret: boolean; fence: boolean; healing: boolean; ammo: boolean; scanner: boolean }
