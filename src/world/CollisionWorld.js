export class CollisionWorld {
    obstacles = [];
    boundary = 31;
    addBox(x, z, width, depth, height = 4) {
        this.obstacles.push({ minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2, height });
    }
    resolveCircle(x, z, radius) {
        let px = Math.max(-this.boundary + radius, Math.min(this.boundary - radius, x));
        let pz = Math.max(-this.boundary + radius, Math.min(this.boundary - radius, z));
        for (const box of this.obstacles) {
            const nearestX = Math.max(box.minX, Math.min(px, box.maxX));
            const nearestZ = Math.max(box.minZ, Math.min(pz, box.maxZ));
            const dx = px - nearestX;
            const dz = pz - nearestZ;
            const distanceSq = dx * dx + dz * dz;
            if (distanceSq < radius * radius) {
                if (distanceSq > 0.00001) {
                    const distance = Math.sqrt(distanceSq);
                    px = nearestX + (dx / distance) * radius;
                    pz = nearestZ + (dz / distance) * radius;
                }
                else {
                    const left = Math.abs(px - box.minX);
                    const right = Math.abs(box.maxX - px);
                    const top = Math.abs(pz - box.minZ);
                    const bottom = Math.abs(box.maxZ - pz);
                    const min = Math.min(left, right, top, bottom);
                    if (min === left)
                        px = box.minX - radius;
                    else if (min === right)
                        px = box.maxX + radius;
                    else if (min === top)
                        pz = box.minZ - radius;
                    else
                        pz = box.maxZ + radius;
                }
            }
        }
        return { x: px, z: pz };
    }
    segmentBlocked(ax, az, bx, bz) {
        const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5);
        for (let i = 1; i < steps; i += 1) {
            const t = i / steps;
            const x = ax + (bx - ax) * t;
            const z = az + (bz - az) * t;
            if (this.obstacles.some((box) => x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ))
                return true;
        }
        return false;
    }
}
