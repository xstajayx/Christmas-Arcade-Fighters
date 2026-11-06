import { AnnouncementGate, announcementPriority } from "./announcements";
import { musicFiles, musicOffset, type MusicTrack } from "./music";
export type { MusicTrack } from "./music";
type VoiceClip = {
  id: string;
  file: string;
  compressed?: string;
  quality?: string;
};
type MusicSource = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  track: MusicTrack;
  started: number;
  offset: number;
};
const clamp = (v: number) =>
  Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
export class Sound {
  private gate = new AnnouncementGate();
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private effectsBus!: GainNode;
  private voiceBus!: GainNode;
  private duck!: GainNode;
  private intensityBus!: GainNode;
  private musicFilter!: BiquadFilterNode;
  private noiseBuffer!: AudioBuffer;
  private musicBuffers = new Map<string, AudioBuffer>();
  private voiceBuffers = new Map<string, AudioBuffer>();
  private pending = new Map<string, Promise<AudioBuffer>>();
  private voices = new Map<string, VoiceClip>();
  private manifest: Promise<void> | null = null;
  private abort = new AbortController();
  private track: MusicTrack = "menu";
  private currentMusic: MusicSource | null = null;
  private musicSources = new Set<MusicSource>();
  private musicTicket = 0;
  private speaking: AudioBufferSourceNode | null = null;
  private currentVoice: {
    id: string;
    priority: number;
    ticket: number;
  } | null = null;
  private queue: { id: string; text: string }[] = [];
  private effectsSources = new Set<AudioScheduledSourceNode>();
  private paused = false;
  private disposed = false;
  private variation = 0;
  private intensity = 0;
  private titleSpoken = false;
  private levels = { music: 0.25, effects: 0.5, announcer: 0.65, muted: false };
  speechFallback = false;
  get state() {
    return this.ctx?.state ?? "locked";
  }
  get music() {
    return this.levels.music;
  }
  set music(v: number) {
    this.levels.music = clamp(v);
    this.mix();
  }
  get effects() {
    return this.levels.effects;
  }
  set effects(v: number) {
    this.levels.effects = clamp(v);
    this.mix();
  }
  get announcer() {
    return this.levels.announcer;
  }
  set announcer(v: number) {
    this.levels.announcer = clamp(v);
    if (v <= 0) this.cancelAnnouncements();
    this.mix();
  }
  get muted() {
    return this.levels.muted;
  }
  set muted(v: boolean) {
    this.levels.muted = !!v;
    if (v) {
      this.cancelAnnouncements();
      this.clearEffects();
    }
    this.mix();
    if (!v && this.ctx?.state === "running" && !this.paused)
      void this.startMusic();
  }
  get diagnostics() {
    return {
      state: this.state,
      track: this.track,
      playingTrack: this.currentMusic?.track ?? null,
      position:
        this.currentMusic && this.ctx
          ? this.ctx.currentTime -
            this.currentMusic.started +
            this.currentMusic.offset
          : 0,
      musicSources: this.musicSources.size,
      musicCached: this.musicBuffers.size,
      voiceCached: this.voiceBuffers.size,
      voice: this.currentVoice?.id ?? null,
      queued: this.queue.map((q) => q.id),
      effects: this.effectsSources.size,
      duck: this.duck?.gain.value ?? 1,
      intensity: this.intensity,
      paused: this.paused,
      levels: { ...this.levels },
      voiceQuality:
        "processed robotic fallback; professional recordings missing",
    };
  }
  private ramp(param: AudioParam, value: number, duration = 0.04) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + duration);
  }
  private mix() {
    if (!this.ctx) return;
    this.ramp(this.master.gain, this.muted ? 0 : 0.8);
    this.ramp(this.musicBus.gain, this.music);
    this.ramp(this.effectsBus.gain, this.effects);
    this.ramp(this.voiceBus.gain, this.announcer);
  }
  unlock() {
    if (this.disposed) return;
    const Constructor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Constructor) return;
    try {
      if (!this.ctx) {
        const ctx = (this.ctx = new Constructor());
        this.master = ctx.createGain();
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -8;
        limiter.knee.value = 8;
        limiter.ratio.value = 8;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.15;
        this.master.connect(limiter);
        limiter.connect(ctx.destination);
        this.musicBus = ctx.createGain();
        this.effectsBus = ctx.createGain();
        this.voiceBus = ctx.createGain();
        this.duck = ctx.createGain();
        this.intensityBus = ctx.createGain();
        this.musicFilter = ctx.createBiquadFilter();
        this.musicFilter.type = "lowpass";
        this.musicFilter.frequency.value = 6500;
        this.musicBus.connect(this.duck);
        this.duck.connect(this.intensityBus);
        this.intensityBus.connect(this.musicFilter);
        this.musicFilter.connect(this.master);
        this.effectsBus.connect(this.master);
        this.voiceBus.connect(this.master);
        this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        this.mix();
      }
      if (!this.manifest)
        this.manifest = fetch(
          `${import.meta.env.BASE_URL}voices/manifest.json?v=${__BUILD_ID__}`,
          { signal: this.abort.signal },
        )
          .then((r) => {
            if (!r.ok) throw Error("Voice manifest unavailable");
            return r.json();
          })
          .then((data) => {
            const valid = (f: unknown) =>
              typeof f === "string" &&
              /^(?:studio\/)?[a-z0-9-]+\.(?:wav|mp3|ogg)$/.test(f);
            for (const clip of (data.clips ?? []) as VoiceClip[])
              if (
                valid(clip.file) &&
                (!clip.compressed || valid(clip.compressed))
              )
                this.voices.set(clip.id, clip);
          })
          .catch((error) => {
            if (!this.disposed)
              console.warn("Announcer manifest unavailable.", error);
          });
      if (!this.paused)
        void this.ctx
          .resume()
          .then(() => {
            void this.startMusic();
            // Essential clips only; other speech and all stage music decode on demand.
            void this.manifest?.then(() => {
              if (this.disposed || this.muted) return;
              for (const id of ["fight", "knockout", "super-ready"])
                void this.voiceBuffer(id).catch(() => {});
            });
            if (!this.titleSpoken && this.track === "menu") {
              this.titleSpoken = true;
              void this.announce(
                "christmas-arcade-fighters",
                "Christmas Arcade Fighters!",
              );
            }
          })
          .catch(() => {});
    } catch (error) {
      console.warn("Audio unavailable; continuing silently.", error);
    }
  }
  setTrack(track: MusicTrack) {
    if (
      this.track === track &&
      (this.currentMusic?.track === track || !this.ctx)
    )
      return;
    this.track = track;
    this.setIntensity(0);
    if (this.ctx?.state === "running" && !this.paused) void this.startMusic();
  }
  setIntensity(phase: number) {
    this.intensity = Math.max(0, Math.min(2, phase));
    if (this.ctx) {
      this.ramp(this.intensityBus.gain, 1 + this.intensity * 0.06, 1.2);
      this.ramp(this.musicFilter.frequency, 6500 + this.intensity * 1800, 1.2);
    }
  }
  private async buffer(
    key: string,
    files: string[],
    cache: Map<string, AudioBuffer>,
    limit: number,
  ) {
    const cached = cache.get(key);
    if (cached) {
      cache.delete(key);
      cache.set(key, cached);
      return cached;
    }
    const inflight = this.pending.get(key);
    if (inflight) return inflight;
    const task = (async () => {
      let lastError: unknown;
      for (const file of files)
        try {
          const response = await fetch(
            `${import.meta.env.BASE_URL}${file}?v=${__BUILD_ID__}`,
            { signal: this.abort.signal },
          );
          if (!response.ok) throw Error(`Audio ${response.status}: ${file}`);
          const bytes = await response.arrayBuffer();
          if (!this.ctx || this.disposed) throw Error("Audio disposed");
          const decoded = await this.ctx.decodeAudioData(bytes);
          if (this.disposed) throw Error("Audio disposed");
          cache.set(key, decoded);
          while (cache.size > limit) cache.delete(cache.keys().next().value!);
          return decoded;
        } catch (error) {
          lastError = error;
          if (this.disposed) break;
        }
      throw lastError;
    })();
    this.pending.set(key, task);
    try {
      return await task;
    } finally {
      if (this.pending.get(key) === task) this.pending.delete(key);
    }
  }
  private voiceBuffer(id: string) {
    const clip = this.voices.get(id);
    if (!clip) return Promise.reject(Error("Missing voice: " + id));
    return this.buffer(
      "voice:" + id,
      [clip.compressed, clip.file]
        .filter((x): x is string => !!x)
        .map((f) => "voices/" + f),
      this.voiceBuffers,
      40,
    );
  }
  private async startMusic() {
    if (
      !this.ctx ||
      this.muted ||
      this.paused ||
      this.ctx.state !== "running" ||
      this.currentMusic?.track === this.track
    )
      return;
    const ticket = ++this.musicTicket,
      track = this.track;
    try {
      const buffer = await this.buffer(
        "music:" + track,
        musicFiles(track),
        this.musicBuffers,
        2,
      );
      if (
        !this.ctx ||
        ticket !== this.musicTicket ||
        this.muted ||
        this.paused ||
        this.disposed
      )
        return;
      const ctx = this.ctx,
        old = this.currentMusic;
      for (const item of this.musicSources)
        if (item !== old) {
          this.musicSources.delete(item);
          item.source.stop();
        }
      const source = ctx.createBufferSource(),
        gain = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      gain.connect(this.musicBus);
      const offset = old
        ? musicOffset(
            old.track,
            track,
            ctx.currentTime - old.started + old.offset,
            buffer.duration,
          )
        : 0;
      const item = { source, gain, track, offset, started: ctx.currentTime };
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.45);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        this.musicSources.delete(item);
        if (this.currentMusic === item) this.currentMusic = null;
      };
      this.musicSources.add(item);
      this.currentMusic = item;
      source.start(0, offset);
      if (old) {
        this.ramp(old.gain.gain, 0, 0.45);
        old.source.stop(ctx.currentTime + 0.46);
      }
    } catch (error) {
      if (!this.disposed && ticket === this.musicTicket)
        console.warn("Music unavailable:", track, error);
    }
  }
  private register(
    source: AudioScheduledSourceNode,
    nodes: AudioNode[],
    duration: number,
    delay = 0,
  ) {
    if (!this.ctx) return;
    if (this.effectsSources.size >= 24) {
      const oldest = this.effectsSources.values().next().value!;
      this.effectsSources.delete(oldest);
      oldest.stop();
    }
    this.effectsSources.add(source);
    source.onended = () => {
      this.effectsSources.delete(source);
      source.disconnect();
      nodes.forEach((n) => n.disconnect());
    };
    source.start(this.ctx.currentTime + delay);
    source.stop(this.ctx.currentTime + delay + duration);
  }
  tone(
    freq: number,
    duration: number,
    volume: number,
    type: OscillatorType = "triangle",
    end?: number,
    delay = 0,
  ) {
    if (
      !this.ctx ||
      this.muted ||
      this.paused ||
      this.ctx.state !== "running" ||
      volume <= 0
    )
      return;
    const ctx = this.ctx,
      source = ctx.createOscillator(),
      gain = ctx.createGain(),
      at = ctx.currentTime + delay;
    source.type = type;
    source.frequency.setValueAtTime(freq, at);
    if (end)
      source.frequency.exponentialRampToValueAtTime(
        Math.max(10, end),
        at + duration,
      );
    gain.gain.setValueAtTime(0.001, at);
    gain.gain.linearRampToValueAtTime(volume * 0.18, at + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    source.connect(gain);
    gain.connect(this.effectsBus);
    this.register(source, [gain], duration, delay);
  }
  private noise(duration: number, volume: number, cutoff = 1600, delay = 0) {
    if (!this.ctx || this.muted || this.paused || this.ctx.state !== "running")
      return;
    const ctx = this.ctx,
      source = ctx.createBufferSource(),
      gain = ctx.createGain(),
      filter = ctx.createBiquadFilter(),
      at = ctx.currentTime + delay;
    source.buffer = this.noiseBuffer;
    filter.type = "bandpass";
    filter.frequency.value = cutoff;
    filter.Q.value = 0.65;
    gain.gain.setValueAtTime(0.001, at);
    gain.gain.linearRampToValueAtTime(volume * 0.22, at + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.effectsBus);
    this.register(source, [gain, filter], duration, delay);
  }
  play(type: string, strength?: string, move?: string, fighter?: string) {
    const pitch = [0.97, 1.02, 1, 1.04][this.variation++ % 4];
    const bell = (root: number, level = 0.6) => {
      this.tone(root, 0.35, level, "sine");
      this.tone(root * 2.76, 0.16, level * 0.3, "sine");
    };
    if (type === "hit" || type === "counter") {
      const heavy = strength === "heavy" || move === "super",
        kick = /kick|low|air/i.test(move ?? "");
      this.noise(heavy ? 0.19 : 0.09, heavy ? 0.85 : 0.45, kick ? 1100 : 1900);
      this.tone(
        (heavy ? 85 : kick ? 125 : 175) * pitch,
        heavy ? 0.23 : 0.11,
        heavy ? 1.1 : 0.7,
        "triangle",
        32,
      );
      if (move === "super") this.tone(55, 0.32, 0.7, "sine", 25);
      if (type === "counter") bell(880, 0.35);
    } else if (type === "block" || type === "throwBreak") {
      this.noise(0.07, 0.4, 3300);
      this.tone(720 * pitch, 0.1, 0.55, "triangle", 350);
    } else if (type === "projectileImpact") {
      if (fighter === "santa") {
        bell(1320);
        bell(1760, 0.3);
        this.noise(0.25, 0.4, 5500);
      } else if (fighter === "rob") {
        this.noise(0.22, 1, 900);
        this.tone(75, 0.3, 1.2, "triangle", 26);
        this.noise(0.16, 0.45, 3500, 0.04);
      } else {
        this.noise(0.15, 0.7, 2200);
        bell(660, 0.25);
      }
    } else if (type === "projectile") {
      if (fighter === "rob") {
        this.noise(0.15, 0.65, 650);
        this.tone(170, 0.24, 1, "triangle", 55);
      } else if (fighter === "santa") {
        bell(880);
        this.tone(440, 0.27, 0.4, "sine", 1760);
      } else {
        this.tone(220 * pitch, 0.24, 0.7, "triangle", 880);
        this.noise(0.1, 0.25, 2800);
      }
    } else if (type === "special") {
      this.noise(0.18, 0.45, 1900);
      this.tone(160 * pitch, 0.22, 0.65, "triangle", 480);
    } else if (type === "super") {
      this.tone(75, 0.4, 1.1, "sawtooth", 620);
      this.noise(0.5, 0.6, 2600);
      bell(880);
      this.tone(55, 0.45, 0.9, "triangle", 30, 0.18);
    } else if (type === "grab") {
      this.noise(0.08, 0.4, 900);
      this.tone(145, 0.12, 0.6, "triangle", 80);
    } else if (type === "throw") {
      this.noise(0.25, 0.65, 1200);
      this.tone(120, 0.28, 1.1, "triangle", 28);
    } else if (type === "landing") {
      this.noise(0.1, 0.25, 500);
      this.tone(70 * pitch, 0.1, 0.35, "triangle", 28);
    } else if (type === "ko") {
      this.noise(0.4, 0.8, 1100);
      this.tone(150, 0.65, 1.2, "triangle", 25);
      bell(660, 0.4);
    } else if (type === "bossPhase" || type === "bossIntro") {
      this.tone(55, 0.7, 0.9, "triangle", 110);
      bell(440, 0.65);
      bell(660, 0.4);
    } else if (type === "unlock") {
      [523, 659, 784, 1047].forEach((f, i) =>
        this.tone(f, 0.4, 0.65, "sine", undefined, i * 0.09),
      );
    } else if (type === "cancel") this.tone(660, 0.1, 0.45, "triangle", 330);
    else if (type === "confirm" || type === "select") {
      bell(type === "select" ? 784 : 1047, 0.45);
      this.tone(523, 0.12, 0.35, "triangle");
    } else if (type === "menu" || type === "countdown")
      this.tone(type === "menu" ? 880 : 1047, 0.08, 0.4, "triangle", 660);
    else if (type === "ready" || type === "guard") {
      bell(1320, 0.4);
      this.tone(660, 0.2, 0.3, "sine", 1320);
    } else if (type === "jump")
      this.tone(190 * pitch, 0.1, 0.22, "triangle", 380);
  }
  async announce(id: string, text: string) {
    if (
      !this.ctx ||
      this.paused ||
      this.disposed ||
      this.muted ||
      this.announcer <= 0
    )
      return;
    const priority = announcementPriority(id);
    if (
      this.currentVoice &&
      this.currentVoice.priority >= priority &&
      (priority === 5 || /^(round-one|round-two)$/.test(id))
    ) {
      if (
        this.currentVoice.id !== id &&
        !this.queue.some((q) => q.id === id) &&
        this.queue.length < 3
      )
        this.queue.push({ id, text });
      return;
    }
    const ticket = this.gate.reserve(id, performance.now());
    if (ticket === null) {
      this.drain();
      return;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    const previous = this.speaking;
    this.speaking = null;
    previous?.stop();
    this.currentVoice = { id, priority, ticket };
    try {
      await this.manifest;
      if (!this.gate.current(ticket)) return;
      const buffer = await this.voiceBuffer(id);
      if (
        !this.gate.current(ticket) ||
        !this.ctx ||
        this.paused ||
        this.muted ||
        this.announcer <= 0
      )
        return;
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.voiceBus);
      this.speaking = source;
      this.gate.started(ticket, performance.now(), buffer.duration);
      this.ramp(this.duck.gain, priority >= 3 ? 0.28 : 0.55, 0.07);
      source.onended = () => {
        source.disconnect();
        if (this.speaking === source) {
          this.speaking = null;
          this.finish(ticket);
        }
      };
      source.start();
    } catch (error) {
      if (!this.gate.current(ticket)) return;
      // Explicit accessibility fallback only; never represented as production voice-over.
      if (this.speechFallback && "speechSynthesis" in window) {
        const speech = new SpeechSynthesisUtterance(text);
        speech.volume = this.announcer;
        speech.pitch = 0.7;
        this.ramp(this.duck.gain, 0.28, 0.07);
        speech.onend = speech.onerror = () => this.finish(ticket);
        window.speechSynthesis.speak(speech);
      } else {
        if (!this.disposed)
          console.warn("Announcer clip unavailable:", id, error);
        this.finish(ticket);
      }
    }
  }
  private finish(ticket: number) {
    if (!this.gate.current(ticket)) return;
    this.gate.release(ticket);
    this.currentVoice = null;
    if (!this.queue.length) this.ramp(this.duck.gain, 1, 0.3);
    this.drain();
  }
  private drain() {
    if (!this.currentVoice) {
      const next = this.queue.shift();
      if (next) void this.announce(next.id, next.text);
    }
  }
  private cancelAnnouncements() {
    this.gate.cancel();
    this.queue = [];
    this.currentVoice = null;
    const previous = this.speaking;
    this.speaking = null;
    previous?.stop();
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
    if (this.ctx) this.ramp(this.duck.gain, 1, 0.2);
  }
  private clearEffects() {
    for (const source of this.effectsSources) source.stop();
    this.effectsSources.clear();
  }
  enterScene() {
    this.cancelAnnouncements();
    this.clearEffects();
  }
  suspend() {
    this.paused = true;
    this.cancelAnnouncements();
    this.clearEffects();
    void this.ctx?.suspend().catch(() => {});
  }
  resume() {
    this.paused = false;
    if (this.ctx)
      void this.ctx
        .resume()
        .then(() => this.startMusic())
        .catch(() => {});
  }
  dispose() {
    this.disposed = true;
    this.musicTicket++;
    this.abort.abort();
    this.enterScene();
    for (const item of this.musicSources) item.source.stop();
    this.musicSources.clear();
    this.currentMusic = null;
    this.musicBuffers.clear();
    this.voiceBuffers.clear();
    this.pending.clear();
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
