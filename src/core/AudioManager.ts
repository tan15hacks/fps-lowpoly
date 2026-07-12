import type { Settings } from '../types/game';

export type SoundId = 'ui'|'pistol'|'smg'|'shotgun'|'reload'|'empty'|'hit'|'critical'|'pickup'|'damage'|'enemyAttack'|'enemyDeath'|'wave'|'boss'|'victory'|'defeat'|'turret'|'acid';

export class AudioManager {
  private context?: AudioContext; private master?: GainNode; private ambient?: OscillatorNode;
  constructor(private settings: Settings) {}

  setSettings(settings: Settings): void { this.settings = settings; if (this.master) this.master.gain.value = settings.masterVolume; }

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext(); this.master = this.context.createGain(); this.master.gain.value = this.settings.masterVolume; this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  startAmbient(): void {
    if (!this.context || !this.master || this.ambient) return;
    const osc = this.context.createOscillator(); const gain = this.context.createGain();
    osc.type = 'sine'; osc.frequency.value = 52; gain.gain.value = 0.018 * this.settings.musicVolume;
    osc.connect(gain).connect(this.master); osc.start(); this.ambient = osc;
  }

  stopAmbient(): void { this.ambient?.stop(); this.ambient = undefined; }

  play(id: SoundId): void {
    if (!this.context || !this.master || this.settings.effectsVolume <= 0) return;
    const now = this.context.currentTime;
    const configs: Record<SoundId, [number, number, OscillatorType, number]> = {
      ui:[460,0.05,'sine',0.08], pistol:[145,0.08,'square',0.16], smg:[190,0.045,'sawtooth',0.11], shotgun:[80,0.16,'square',0.25],
      reload:[330,0.06,'triangle',0.08], empty:[90,0.035,'square',0.08], hit:[720,0.03,'sine',0.07], critical:[1050,0.08,'triangle',0.1],
      pickup:[620,0.12,'sine',0.08], damage:[65,0.14,'sawtooth',0.15], enemyAttack:[115,0.12,'square',0.1], enemyDeath:[72,0.18,'sawtooth',0.12],
      wave:[520,0.28,'triangle',0.1], boss:[48,0.65,'sawtooth',0.16], victory:[740,0.55,'sine',0.12], defeat:[110,0.7,'triangle',0.12],
      turret:[235,0.04,'square',0.07], acid:[290,0.18,'sine',0.08],
    };
    const [frequency,duration,type,volume] = configs[id];
    const osc = this.context.createOscillator(); const gain = this.context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, now); osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * 0.55), now + duration);
    gain.gain.setValueAtTime(volume * this.settings.effectsVolume, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.master); osc.start(now); osc.stop(now + duration + 0.02);
  }
}
