// Small procedural ambience so the game doesn't need shipped audio assets.
// Everything here is soft on purpose — this is an anti-doomscrolling app,
// not an arcade game, so even the "wrong tap" cue stays gentle.
export class RippleAudio {
  private ctx: AudioContext | null = null;
  private padGain: GainNode | null = null;
  private muted = false;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.padGain) {
      this.padGain.gain.setTargetAtTime(muted ? 0 : 0.05, this.ensureContext().currentTime, 0.4);
    }
  }

  startAmbience() {
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") ctx.resume();
    if (this.padGain) return;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    this.padGain = gain;
    gain.gain.setTargetAtTime(this.muted ? 0 : 0.05, ctx.currentTime, 1.2);

    for (const freq of [110, 165, 220]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.05;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.4;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      osc.start();
      lfo.start();
    }
  }

  stopAmbience() {
    if (!this.padGain || !this.ctx) return;
    this.padGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6);
  }

  private blip(freq: number, durationSec: number, volume: number) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    osc.start(now);
    osc.stop(now + durationSec + 0.05);
  }

  correctHit() {
    this.blip(660, 0.18, 0.09);
  }

  falseTap() {
    this.blip(180, 0.22, 0.06);
  }

  miss() {
    this.blip(140, 0.28, 0.04);
  }
}
