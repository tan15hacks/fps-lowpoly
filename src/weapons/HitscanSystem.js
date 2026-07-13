export function createHitscanRays(origin, forward, right, up, pellets, spread, range, rng = Math.random) {
    const rays = [];
    const count = Math.max(1, Math.floor(pellets));
    const safeSpread = Math.max(0, spread);
    for (let index = 0; index < count; index += 1) {
        const radius = Math.sqrt(clamp01(rng())) * safeSpread;
        const angle = clamp01(rng()) * Math.PI * 2;
        const horizontal = Math.cos(angle) * radius;
        const vertical = Math.sin(angle) * radius;
        const direction = forward
            .clone()
            .addScaledVector(right, horizontal)
            .addScaledVector(up, vertical)
            .normalize();
        rays.push({ origin: origin.clone(), direction, range: Math.max(0, range) });
    }
    return rays;
}
export function raySphereDistance(origin, direction, center, radius) {
    const safeRadius = Math.max(0, radius);
    const offset = center.clone().sub(origin);
    const projection = offset.dot(direction);
    const closestSq = offset.lengthSq() - projection * projection;
    const radiusSq = safeRadius * safeRadius;
    if (closestSq > radiusSq)
        return undefined;
    const halfChord = Math.sqrt(Math.max(0, radiusSq - closestSq));
    const near = projection - halfChord;
    const far = projection + halfChord;
    if (far < 0)
        return undefined;
    return near < 0 ? 0 : near;
}
const clamp01 = (value) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
