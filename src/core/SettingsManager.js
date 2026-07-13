export const DEFAULT_SETTINGS = {
    masterVolume: 0.8, musicVolume: 0.5, effectsVolume: 0.8,
    mouseSensitivity: 0.16, touchSensitivity: 0.55, aimSensitivity: 0.65,
    quality: 'medium', shadowQuality: 'low', resolutionScale: 1, maxEnemies: 35,
    fov: 75, cameraShake: 0.7, headBob: 0.65, reducedMotion: false,
    aimAssist: true, autoReload: true, damageNumbers: true, hitMarkers: true,
    vibration: true, leftHanded: false, controlOpacity: 0.72, uiScale: 1,
    crosshairSize: 1, crosshairOpacity: 0.9, highContrast: false,
};
export function sanitizeSettings(input) {
    const out = { ...DEFAULT_SETTINGS, ...(input ?? {}) };
    out.masterVolume = clamp(out.masterVolume, 0, 1);
    out.musicVolume = clamp(out.musicVolume, 0, 1);
    out.effectsVolume = clamp(out.effectsVolume, 0, 1);
    out.mouseSensitivity = clamp(out.mouseSensitivity, 0.03, 0.5);
    out.touchSensitivity = clamp(out.touchSensitivity, 0.1, 1.5);
    out.aimSensitivity = clamp(out.aimSensitivity, 0.2, 1);
    out.resolutionScale = clamp(out.resolutionScale, 0.5, 1.5);
    out.maxEnemies = Math.round(clamp(out.maxEnemies, 20, 50));
    out.fov = clamp(out.fov, 60, 100);
    out.cameraShake = clamp(out.cameraShake, 0, 1);
    out.headBob = clamp(out.headBob, 0, 1);
    out.controlOpacity = clamp(out.controlOpacity, 0.3, 1);
    out.uiScale = clamp(out.uiScale, 0.8, 1.35);
    out.crosshairSize = clamp(out.crosshairSize, 0.6, 1.8);
    out.crosshairOpacity = clamp(out.crosshairOpacity, 0.25, 1);
    if (!['low', 'medium', 'high'].includes(out.quality))
        out.quality = 'medium';
    if (!['off', 'low', 'high'].includes(out.shadowQuality))
        out.shadowQuality = 'low';
    return out;
}
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
