import { aimAssistScore, isInsideAimCone } from './controlMath';
export function selectAimAssistDirection(origin, forward, targets, maximumRange, maximumAngleRadians, isBlocked = () => false) {
    const normalizedForward = forward.clone().normalize();
    let bestDirection;
    let bestScore = Infinity;
    for (const target of targets) {
        const toTarget = target.clone().sub(origin);
        const distance = toTarget.length();
        if (distance <= 0.001 || distance > maximumRange || isBlocked(target))
            continue;
        const candidate = toTarget.multiplyScalar(1 / distance);
        const dot = normalizedForward.dot(candidate);
        if (!isInsideAimCone(dot, maximumAngleRadians))
            continue;
        const score = aimAssistScore(dot, distance, maximumRange);
        if (score < bestScore) {
            bestScore = score;
            bestDirection = candidate.clone();
        }
    }
    return bestDirection;
}
