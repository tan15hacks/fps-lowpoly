import { ACHIEVEMENTS } from '../data/achievements';
import type { AchievementRecord, PermanentLevels, SaveData } from '../types/game';
import { DEFAULT_SETTINGS, sanitizeSettings } from './SettingsManager';

const DB_NAME = 'polygon-outpost';
const STORE_NAME = 'save';
const SAVE_KEY = 'profile';
export const SAVE_SCHEMA_VERSION = 2;

const zeroStats = () => ({
  totalRuns: 0, wins: 0, highestWave: 0, enemiesDefeated: 0, runnersDefeated: 0,
  brutesDefeated: 0, spittersDefeated: 0, bossesDefeated: 0, shotsFired: 0,
  shotsHit: 0, criticalHits: 0, damageDealt: 0, damageReceived: 0,
  coinsCollected: 0, totalPlaytime: 0, highestCombo: 0, soldierWins: 0, veteranWins: 0,
});

export function defaultPermanent(): PermanentLevels {
  return { health: 0, armor: 0, pistolDamage: 0, smgDamage: 0, shotgunDamage: 0, reloadSpeed: 0, startingAmmo: 0, coinBonus: 0, turretEfficiency: 0, healingEfficiency: 0 };
}

export function createDefaultSave(): SaveData {
  const achievements: Record<string, AchievementRecord> = {};
  for (const achievement of ACHIEVEMENTS) achievements[achievement.id] = { id: achievement.id, progress: 0 };
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    credits: 0,
    permanent: defaultPermanent(),
    settings: { ...DEFAULT_SETTINGS },
    tutorialComplete: false,
    veteranUnlocked: false,
    achievements,
    stats: zeroStats(),
    ownedCosmetics: ['standard'],
    equippedCosmetic: 'standard',
  };
}

export function migrateSave(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object') return createDefaultSave();
  const input = raw as Partial<SaveData> & { schemaVersion?: number };
  const base = createDefaultSave();
  const permanent = { ...base.permanent, ...(input.permanent ?? {}) };
  for (const key of Object.keys(permanent) as (keyof PermanentLevels)[]) permanent[key] = Math.round(clamp(permanent[key], 0, 5));
  const achievements = { ...base.achievements, ...(input.achievements ?? {}) };
  const owned = Array.isArray(input.ownedCosmetics) ? input.ownedCosmetics.filter((item): item is string => typeof item === 'string') : ['standard'];
  if (!owned.includes('standard')) owned.unshift('standard');
  const equipped = typeof input.equippedCosmetic === 'string' && owned.includes(input.equippedCosmetic) ? input.equippedCosmetic : 'standard';
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    credits: Math.round(clamp(input.credits ?? 0, 0, 99_999_999)),
    permanent,
    settings: sanitizeSettings(input.settings),
    tutorialComplete: Boolean(input.tutorialComplete),
    veteranUnlocked: Boolean(input.veteranUnlocked),
    achievements,
    stats: { ...base.stats, ...(input.stats ?? {}) },
    ownedCosmetics: [...new Set(owned)],
    equippedCosmetic: equipped,
  };
}

export function validateImportedSave(raw: unknown): { valid: boolean; save?: SaveData; reason?: string } {
  if (!raw || typeof raw !== 'object') return { valid: false, reason: 'Save file is not a JSON object.' };
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.schemaVersion !== 'number') return { valid: false, reason: 'Missing schema version.' };
  if (candidate.credits !== undefined && (typeof candidate.credits !== 'number' || candidate.credits < 0)) return { valid: false, reason: 'Invalid credit balance.' };
  return { valid: true, save: migrateSave(raw) };
}

export class SaveManager {
  private data: SaveData = createDefaultSave();
  private db?: IDBDatabase;
  private timer?: number;

  get value(): SaveData { return this.data; }

  async load(): Promise<SaveData> {
    try {
      this.db = await this.openDb();
      const value = await this.idbGet();
      this.data = migrateSave(value ?? this.readFallback());
    } catch {
      this.data = migrateSave(this.readFallback());
    }
    return this.data;
  }

  replace(data: SaveData): void { this.data = migrateSave(data); this.saveNow(); }
  mutate(mutator: (data: SaveData) => void, immediate = false): void {
    mutator(this.data);
    this.data = migrateSave(this.data);
    if (immediate) void this.saveNow(); else this.scheduleSave();
  }

  scheduleSave(): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.saveNow(), 400);
  }

  async saveNow(): Promise<void> {
    const serialized = JSON.stringify(this.data);
    localStorage.setItem('polygon-outpost-save', serialized);
    if (!this.db) return;
    await new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(this.data, SAVE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }).catch(() => undefined);
  }

  exportJson(): string { return JSON.stringify(this.data, null, 2); }

  private readFallback(): unknown {
    try { return JSON.parse(localStorage.getItem('polygon-outpost-save') ?? 'null'); } catch { return null; }
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private idbGet(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction(STORE_NAME).objectStore(STORE_NAME).get(SAVE_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
