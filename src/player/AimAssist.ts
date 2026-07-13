import * as THREE from 'three';
import { aimAssistScore, isInsideAimCone } from './controlMath';

export type AimAssistBlocker = (target: THREE.Vector3) => boolean;

export function selectAimAssistDirection(
  origin: THREE.Vector3,
  forward: THREE.Vector3,
  targets: readonly THREE.Vector3[],
  maximumRange: number,
  maximumAngleRadians: number,
  isBlocked: AimAssistBlocker = () => false,
): THREE.Vector3 | undefined {
  const normalizedForward = forward.clone().normalize();
  let bestDirection: THREE.Vector3 | undefined;
  let bestScore = Infinity;

  for (const target of targets) {
    const toTarget = target.clone().sub(origin);
    const distance = toTarget.length();
    if (distance <= 0.001 || distance > maximumRange || isBlocked(target)) continue;

    const candidate = toTarget.multiplyScalar(1 / distance);
    const dot = normalizedForward.dot(candidate);
    if (!isInsideAimCone(dot, maximumAngleRadians)) continue;

    const score = aimAssistScore(dot, distance, maximumRange);
    if (score < bestScore) {
      bestScore = score;
      bestDirection = candidate.clone();
    }
  }

  return bestDirection;
}
