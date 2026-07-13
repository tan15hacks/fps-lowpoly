export function enemyScale(wave, difficulty, kind) {
    const mode = difficulty === 'recruit' ? 0.82 : difficulty === 'veteran' ? 1.22 : 1;
    const boss = kind === 'boss' ? 1 + Math.floor(wave / 5) * 0.34 : 1;
    return {
        health: (1 + Math.max(0, wave - 1) * 0.085) * mode * boss,
        damage: (1 + Math.max(0, wave - 1) * 0.045) * mode,
        speed: Math.min(1.18, 1 + Math.max(0, wave - 1) * 0.008) * (difficulty === 'veteran' ? 1.05 : 1),
        pacing: difficulty === 'recruit' ? 1.18 : difficulty === 'veteran' ? 0.82 : 1,
    };
}
