export type MusicTrack =
  | "menu"
  | "village"
  | "pier"
  | "workshop"
  | "forest"
  | "rooftops"
  | "fortress"
  | "boss"
  | "ending"
  | "rob"
  | "santa"
  | "santaFinal";
const themes: Record<MusicTrack, number[]> = {
  menu: [64, 67, 71, 67, 69, 67, 64, 62, 60, 64, 67, 64, 65, 64, 62, 59],
  village: [60, 64, 67, 72, 71, 67, 64, 62, 60, 67, 69, 64, 62, 59, 60, 67],
  pier: [62, 65, 69, 74, 72, 69, 67, 65, 62, 69, 72, 69, 65, 64, 62, 57],
  workshop: [64, 64, 67, 69, 71, 67, 64, 62, 64, 67, 72, 71, 69, 67, 64, 59],
  forest: [57, 60, 64, 67, 64, 60, 59, 55, 57, 64, 67, 69, 67, 64, 60, 59],
  rooftops: [65, 69, 72, 76, 74, 72, 69, 67, 65, 72, 74, 69, 67, 64, 65, 60],
  fortress: [55, 58, 62, 67, 66, 62, 58, 54, 55, 62, 66, 70, 67, 62, 58, 54],
  boss: [52, 55, 58, 64, 63, 58, 55, 51, 52, 58, 63, 67, 64, 58, 55, 51],
  rob: [48, 55, 60, 63, 62, 55, 51, 48, 55, 60, 67, 63, 62, 58, 55, 51],
  santa: [60, 67, 72, 76, 74, 71, 67, 64, 60, 64, 69, 72, 76, 74, 67, 62],
  santaFinal: [48, 60, 67, 72, 70, 67, 63, 60, 51, 63, 70, 75, 72, 67, 60, 55],
  ending: [60, 64, 67, 72, 76, 74, 72, 67, 69, 72, 76, 79, 76, 72, 67, 60],
};
export class Sound {
  private ctx: AudioContext | null = null;
  private melody = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private track: MusicTrack = "menu";
  private voiceBuffers = new Map<string, AudioBuffer>();
  private voiceFiles: Record<string, string> = {};
  private voiceManifest: Promise<void> | null = null;
  private speaking: AudioBufferSourceNode | null = null;
  music = 0.25;
  effects = 0.5;
  announcer = 0.65;
  muted = false;
  speechFallback = false;
  get state() {
    return this.ctx?.state ?? "locked";
  }
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
      this.interval = setInterval(() => this.musicTick(), 210);
    if (!this.voiceManifest)
      this.voiceManifest = fetch(
        `${import.meta.env.BASE_URL}voices/manifest.json`,
      )
        .then((r) => {
          if (!r.ok) throw Error("Voice manifest unavailable");
          return r.json();
        })
        .then((data) => {
          for (const clip of data.clips || [])
            if (
              typeof clip.id === "string" &&
              typeof clip.file === "string" &&
              /^[a-z0-9-]+\.wav$/.test(clip.file)
            )
              this.voiceFiles[clip.id] = clip.file;
        })
        .catch((error) =>
          console.warn("Recorded announcer unavailable.", error),
        );
  }
  setTrack(track: MusicTrack) {
    if (this.track !== track) {
      this.track = track;
      this.melody = 0;
    }
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
  play(type: string, strength?: string, move?: string, fighter?: string) {
    const v = this.effects;
    if (type === "hit") {
      const kick = ["kick", "heavyKick", "low", "air"].includes(move || "");
      this.tone(
        strength === "heavy" ? 80 : kick ? 110 : 165,
        strength === "heavy" ? 0.2 : 0.1,
        v,
        "sawtooth",
        35,
      );
      if (strength === "heavy") this.tone(65, 0.2, v, "triangle", 28);
    } else if (type === "block") this.tone(720, 0.08, v, "triangle", 260);
    else if (type === "counter") {
      this.tone(880, 0.19, v, "square", 1760);
      this.tone(140, 0.2, v, "sawtooth", 40);
    } else if (type === "ko") this.tone(190, 0.7, v, "sawtooth", 35);
    else if (type === "special" || type === "projectile") {
      const pitch =
        fighter === "nash"
          ? 80
          : fighter === "bucket"
            ? 550
            : fighter === "beardy"
              ? 660
              : fighter === "frost"
                ? 140
                : 220;
      const variant =
        move === "special2" ? 1.25 : move === "special3" ? 0.75 : 1;
      this.tone(
        pitch * variant,
        0.3,
        v,
        fighter === "bucket" || fighter === "beardy" ? "triangle" : "square",
        pitch * variant * (fighter === "frost" ? 0.45 : 3),
      );
      this.tone(pitch * 0.5, 0.25, v * 0.6, "triangle", pitch);
    } else if (type === "super") {
      this.tone(110, 0.7, v, "sawtooth", 880);
      this.tone(440, 0.7, v * 0.6, "triangle", 1320);
    } else if (type === "grab") {
      this.tone(150, 0.1, v * 0.6, "triangle", 90);
    } else if (type === "throw") {
      this.tone(95, 0.25, v, "sawtooth", 32);
      this.tone(260, 0.16, v * 0.5, "square", 65);
    } else if (type === "throwBreak") {
      this.tone(800, 0.16, v, "triangle", 1300);
    } else if (type === "landing") {
      this.tone(65, 0.07, v * 0.35, "triangle", 30);
    } else if (type === "bossPhase") {
      this.tone(70, 0.6, v, "sawtooth", 280);
    } else if (type === "jump") this.tone(190, 0.15, v * 0.5, "triangle", 440);
    else if (type === "guard") this.tone(660, 0.3, v, "triangle", 880);
    else this.tone(660, 0.08, v * 0.6, "square", 990);
  }
  async announce(id: string, text: string) {
    if (this.muted || this.announcer <= 0) return;
    await this.voiceManifest;
    const file = this.voiceFiles[id];
    if (file && this.ctx) {
      try {
        let buffer = this.voiceBuffers.get(id);
        if (!buffer) {
          const r = await fetch(`${import.meta.env.BASE_URL}voices/${file}`);
          if (!r.ok) throw Error("Missing voice " + id);
          buffer = await this.ctx.decodeAudioData(await r.arrayBuffer());
          this.voiceBuffers.set(id, buffer);
        }
        this.speaking?.stop();
        const source = this.ctx.createBufferSource(),
          gain = this.ctx.createGain();
        source.buffer = buffer;
        gain.gain.value = this.announcer;
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
        this.speaking = source;
        source.onended = () => {
          if (this.speaking === source) this.speaking = null;
        };
        return;
      } catch (error) {
        console.warn("Announcer clip failed:", id, error);
      }
    }
    if (this.speechFallback && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const voice = new SpeechSynthesisUtterance(text);
      voice.pitch = 0.7;
      voice.rate = 1.1;
      voice.volume = this.announcer;
      window.speechSynthesis.speak(voice);
    }
  }
  private musicTick() {
    if (!this.ctx || this.ctx.state !== "running") return;
    const notes = themes[this.track],
      note = notes[this.melody % notes.length];
    this.tone(
      440 * 2 ** ((note - 69) / 12),
      0.15,
      this.music * 0.3,
      this.track === "boss" ? "square" : "triangle",
    );
    if (this.melody % 4 === 0)
      this.tone(
        440 * 2 ** ((note - 24 - 69) / 12),
        0.32,
        this.music * 0.3,
        "triangle",
      );
    if (this.melody % 2 === 0)
      this.tone(
        this.melody % 4 === 0 ? 65 : 120,
        0.08,
        this.music * 0.18,
        "square",
        35,
      );
    this.melody++;
  }
  suspend() {
    void this.ctx?.suspend();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }
  resume() {
    if (this.ctx) void this.ctx.resume().catch(() => {});
  }
}
