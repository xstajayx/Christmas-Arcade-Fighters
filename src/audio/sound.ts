export class Sound {
  private ctx: AudioContext | null = null;
  private melody = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  music = 0.25;
  effects = 0.5;
  muted = false;
  unlock() {
    if (typeof AudioContext === "undefined") return;
    try {
      if (!this.ctx) this.ctx = new AudioContext();
    } catch (error) {
      console.warn("Audio unavailable; continuing silently.", error);
      return;
    }
    void this.ctx.resume().catch(() => {});
    if (!this.interval)
      this.interval = setInterval(() => this.musicTick(), 240);
  }
  tone(
    freq: number,
    duration: number,
    volume: number,
    type: OscillatorType = "square",
    end?: number,
  ) {
    if (!this.ctx || this.muted || volume <= 0) return;
    const ctx = this.ctx,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (end)
      o.frequency.exponentialRampToValueAtTime(end, ctx.currentTime + duration);
    g.gain.setValueAtTime(volume * 0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + duration);
  }
  play(type: string) {
    const v = this.effects;
    if (type === "hit") this.tone(130, 0.13, v, "sawtooth", 40);
    else if (type === "block") this.tone(680, 0.07, v, "triangle", 240);
    else if (type === "ko") this.tone(190, 0.7, v, "sawtooth", 35);
    else if (type === "special") {
      this.tone(180, 0.4, v, "square", 1100);
      this.tone(220, 0.35, v, "triangle", 880);
    } else if (type === "jump") this.tone(190, 0.15, v * 0.5, "triangle", 440);
    else this.tone(660, 0.08, v * 0.6, "square", 990);
  }
  private musicTick() {
    if (!this.ctx || this.ctx.state !== "running") return;
    const notes = [
      64, 67, 71, 67, 69, 67, 64, 62, 60, 64, 67, 64, 65, 64, 62, 59, 60, 64,
      67, 72, 71, 67, 69, 71, 72, 67, 64, 62, 60, 59, 60, 67,
    ];
    const note = notes[this.melody % notes.length];
    this.tone(
      440 * Math.pow(2, (note - 69) / 12),
      0.16,
      this.music * 0.35,
      "triangle",
    );
    if (this.melody % 4 === 0)
      this.tone(110, 0.3, this.music * 0.25, "triangle");
    this.melody++;
  }
  suspend() {
    void this.ctx?.suspend();
  }
  resume() {
    if (this.ctx) void this.ctx.resume();
  }
}
