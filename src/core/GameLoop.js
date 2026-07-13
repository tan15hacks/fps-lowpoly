export class GameLoop {
    update;
    render;
    running = false;
    frame = 0;
    previous = performance.now();
    accumulator = 0;
    fixed = 1 / 60;
    constructor(update, render) {
        this.update = update;
        this.render = render;
    }
    start() { if (this.running)
        return; this.running = true; this.previous = performance.now(); this.frame = requestAnimationFrame(this.tick); }
    stop() { this.running = false; cancelAnimationFrame(this.frame); }
    tick = (time) => { if (!this.running)
        return; const frameDelta = Math.min(0.1, (time - this.previous) / 1000); this.previous = time; this.accumulator += frameDelta; while (this.accumulator >= this.fixed) {
        this.update(this.fixed, time / 1000);
        this.accumulator -= this.fixed;
    } this.render(this.accumulator / this.fixed); this.frame = requestAnimationFrame(this.tick); };
}
