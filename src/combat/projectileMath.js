export function segmentSphereHit(start, end, center, radius) {
    const safeRadius = Math.max(0, radius);
    const direction = end.clone().sub(start);
    const offset = start.clone().sub(center);
    const a = direction.lengthSq();
    const c = offset.lengthSq() - safeRadius * safeRadius;
    if (c <= 0)
        return { t: 0, point: start.clone() };
    if (a <= Number.EPSILON)
        return undefined;
    const b = 2 * offset.dot(direction);
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0)
        return undefined;
    const root = Math.sqrt(discriminant);
    const first = (-b - root) / (2 * a);
    const second = (-b + root) / (2 * a);
    const t = first >= 0 && first <= 1 ? first : second >= 0 && second <= 1 ? second : undefined;
    if (t === undefined)
        return undefined;
    return {
        t,
        point: start.clone().addScaledVector(direction, t),
    };
}
