import * as THREE from 'three';
import { DEFAULT_SETTINGS } from '../src/core/SettingsManager';
import { PlayerCamera } from '../src/player/PlayerCamera';

describe('player camera', () => {
  it('resets the menu camera to the player eye position', () => {
    const camera = new THREE.PerspectiveCamera(75, 1, 0.05, 120);
    camera.position.set(28, 18, 28);
    const controller = new PlayerCamera(camera, { ...DEFAULT_SETTINGS });

    controller.reset();

    expect(camera.position.x).toBe(0);
    expect(camera.position.y).toBeCloseTo(1.68, 6);
    expect(camera.position.z).toBe(0);
    expect(camera.fov).toBe(DEFAULT_SETTINGS.fov);
  });

  it('smoothly enters ADS and returns to the configured FOV', () => {
    const camera = new THREE.PerspectiveCamera(75, 1, 0.05, 120);
    const settings = { ...DEFAULT_SETTINGS, cameraShake: 0, headBob: 0 };
    const controller = new PlayerCamera(camera, settings);
    controller.reset();

    controller.update(1 / 60, 0, false, true, true);
    expect(camera.fov).toBeLessThan(settings.fov);
    expect(camera.fov).toBeGreaterThanOrEqual(settings.fov - 12);

    for (let index = 0; index < 120; index += 1) {
      controller.update(1 / 60, 0, false, true, false);
    }
    expect(camera.fov).toBeCloseTo(settings.fov, 3);
  });

  it('uses the active look source instead of touchscreen capability', () => {
    const mouseCamera = new THREE.PerspectiveCamera(75, 1, 0.05, 120);
    const touchCamera = new THREE.PerspectiveCamera(75, 1, 0.05, 120);
    const settings = { ...DEFAULT_SETTINGS, mouseSensitivity: 0.1, touchSensitivity: 1 };
    const mouse = new PlayerCamera(mouseCamera, settings);
    const touch = new PlayerCamera(touchCamera, settings);

    mouse.look(10, 0, false, 'mouse');
    touch.look(10, 0, false, 'touch');

    expect(Math.abs(touch.yaw)).toBeGreaterThan(Math.abs(mouse.yaw));
  });
});
