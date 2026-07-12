import type { Difficulty, RunStats } from '../types/game';

export function difficultyMultiplier(difficulty: Difficulty): number {
  return difficulty === 'recruit' ? 0.8 : difficulty === 'veteran' ? 1.5 : 1;
}

export function calculateRunCredits(stats: Pick<RunStats, 'wave' | 'enemiesDefeated' | 'bossesDefeated' | 'shotsFired' | 'shotsHit' | 'coins' | 'victory' | 'difficulty'>): number {
  const accuracy = stats.shotsFired > 0 ? stats.shotsHit / stats.shotsFired : 0;
  const raw = stats.wave * 22 + stats.enemiesDefeated * 2 + stats.bossesDefeated * 80 + stats.coins * 0.35 + accuracy * 120 + (stats.victory ? 500 : 0);
  return Math.max(0, Math.round(raw * difficultyMultiplier(stats.difficulty)));
}
