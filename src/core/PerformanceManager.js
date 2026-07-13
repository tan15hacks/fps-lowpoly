export function recommendedQuality() { const memory = navigator.deviceMemory ?? 4; const cores = navigator.hardwareConcurrency ?? 4; if (memory <= 3 || cores <= 4)
    return 'low'; if (memory >= 8 && cores >= 8)
    return 'high'; return 'medium'; }
export function enemyCapForQuality(quality) { return quality === 'low' ? 24 : quality === 'high' ? 50 : 35; }
