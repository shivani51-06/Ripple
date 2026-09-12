// Short tap-feedback tones only (correct hit / false tap / miss). No
// ambient background audio — that was tried and removed after user testing
// found it unpleasant rather than calming, per direct feedback.
export class RippleAudio {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  private blip(freq: number, durationSec: number, volume: number) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") ctx.resume();
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
