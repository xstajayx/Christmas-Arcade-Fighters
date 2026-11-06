// Original deterministic 16-bar arrangements. No recordings, samples, APIs or borrowed songs.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unlinkSync } from "node:fs";
const scores = JSON.parse(readFileSync("src/audio/music.json", "utf8"));
const rate = 32000,
  tau = Math.PI * 2;
const frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);
mkdirSync("public/audio/music", { recursive: true });
const tracks = [];
for (const [id, score] of Object.entries(scores)) {
  const beat = 60 / score.bpm,
    length = 64 * beat;
  const samples = new Float32Array(Math.round(length * rate));
  let seed = [...id].reduce((n, ch) => n * 31 + ch.charCodeAt(0), 1) >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed / 4294967296) * 2 - 1;
  };
  const heavy = score.style === "kingpin",
    epic = score.style.startsWith("finale"),
    intense = score.style.endsWith("intense");
  function note(time, midi, duration, volume, voice) {
    const start = Math.round(time * rate),
      f = frequency(midi),
      count = Math.round(duration * rate);
    let previous = 0;
    for (let i = 0; i < count; i++) {
      const t = i / rate,
        p = tau * f * t;
      const attack = Math.min(1, t / (voice === "strings" ? 0.08 : 0.004));
      const release = Math.min(
        1,
        (duration - t) / (voice === "strings" ? 0.15 : 0.025),
      );
      let wave,
        decay = Math.exp(
          -t * (voice === "strings" ? 0.8 : voice === "bass" ? 10 : 5),
        );
      if (voice === "bell")
        wave =
          Math.sin(p) +
          0.4 * Math.sin(p * 2.76) * Math.exp(-t * 9) +
          0.15 * Math.sin(p * 5.4) * Math.exp(-t * 17);
      else if (voice === "strings")
        wave =
          (Math.sin(p) + 0.22 * Math.sin(p * 2) + 0.12 * Math.sin(p * 3.003)) *
          (0.94 + 0.06 * Math.sin(t * 27));
      else if (voice === "bass")
        wave = Math.sin(p) + 0.22 * Math.sin(p * 2) + 0.1 * Math.sin(p * 3);
      else if (voice === "kick") {
        wave = Math.sin(tau * (38 * t + (55 * (1 - Math.exp(-t * 32))) / 32));
        decay = Math.exp(-t * 20);
      } else if (voice === "snare" || voice === "sleigh" || voice === "wind") {
        const noise = random(),
          high = noise - previous;
        previous = noise;
        wave =
          voice === "snare"
            ? noise * 0.65 + Math.sin(tau * 170 * t) * 0.35
            : high * 0.4 + Math.sin(tau * 6500 * t) * 0.12;
        decay = Math.exp(-t * (voice === "snare" ? 24 : 65));
      } else
        wave = Math.sin(p) + 0.3 * Math.sin(3 * p) + 0.12 * Math.sin(5 * p);
      samples[(start + i) % samples.length] +=
        wave * attack * release * decay * volume;
    }
  }
  const progression = score.minor
    ? [0, -4, -2, -5, 0, -4, -5, -1]
    : [0, -3, -5, -7, 0, -5, -3, -7];
  for (let bar = 0; bar < 16; bar++) {
    const time = bar * 4 * beat,
      root = score.root + progression[bar % 8];
    const lift = bar >= 8 ? 1.12 : 0.88,
      third = score.minor ? 3 : 4;
    for (const interval of [0, third, 7])
      note(
        time,
        root + interval,
        4 * beat,
        (epic ? 0.064 : 0.038) * lift,
        "strings",
      );
    for (let step = 0; step < 16; step++) {
      const at = time + (step * beat) / 4;
      if (step % 2 === 0) {
        const phrase = (bar % 4) * 4 + step / 4;
        const index = Math.floor(phrase) % 16;
        const variation =
          bar >= 8 && index % 4 === 3 ? (score.minor ? 3 : 4) : 0;
        const midi = score.root + score.motif[index] + variation;
        note(
          at,
          midi,
          beat * (score.style === "winter" ? 1.6 : 0.65),
          (heavy ? 0.13 : 0.092) * lift,
          ["bells", "winter", "clockwork"].includes(score.style)
            ? "bell"
            : "lead",
        );
        if (epic && (intense || step % 4 === 0))
          note(at, midi + 12, beat * 0.8, intense ? 0.043 : 0.025, "bell");
      }
      if (step % (heavy ? 4 : 2) === 0)
        note(
          at,
          root - 12 + (step % 8 === 6 ? 7 : 0),
          beat * 0.45,
          heavy ? 0.21 : 0.13,
          "bass",
        );
      if (step % 4 === 0 || (intense && step % 4 === 2))
        note(at, 30, 0.2, heavy || intense ? 0.26 : 0.17, "kick");
      if (step === 4 || step === 12 || (bar % 4 === 3 && step >= 13))
        note(at, 50, 0.16, epic || heavy ? 0.11 : 0.075, "snare");
      if (step % (score.style === "winter" ? 4 : 2) === 1)
        note(at, 90, 0.09, 0.035, "sleigh");
      if (step % 8 === 0)
        note(at, root + 24 + (step === 8 ? 7 : 0), beat * 1.8, 0.055, "bell");
      if (score.style === "clockwork" && step % 2)
        note(at, root + 31, 0.06, 0.027, "bell");
      if (score.style === "carnival" && step % 4 === 2)
        note(at, root + third + 12, beat * 0.35, 0.05, "lead");
    }
  }
  // Two circular echoes preserve tails through the exact loop boundary.
  const dry = samples.slice();
  for (const [delay, gain] of [
    [beat * 0.75, 0.13],
    [beat * 1.5, 0.065],
  ]) {
    const shift = Math.round(delay * rate);
    for (let i = 0; i < samples.length; i++)
      samples[(i + shift) % samples.length] += dry[i] * gain;
  }
  let peak = 0,
    energy = 0;
  for (const x of samples) peak = Math.max(peak, Math.abs(x));
  const gain = 0.74 / Math.max(peak, 0.001);
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i] * gain;
    energy += x * x;
    wav.writeInt16LE(Math.round(x * 32767), 44 + i * 2);
  }
  const raw = join(tmpdir(), `caf-score-${id}.wav`);
  writeFileSync(raw, wav);
  for (const [ext, codec, quality] of [
    ["mp3", "libmp3lame", ["-b:a", "80k"]],
    ["ogg", "libvorbis", ["-q:a", "3"]],
  ]) {
    const out = spawnSync(
      "ffmpeg",
      [
        "-loglevel",
        "error",
        "-y",
        "-i",
        raw,
        "-c:a",
        codec,
        ...quality,
        `public/audio/music/${id}.${ext}`,
      ],
      { stdio: "inherit" },
    );
    if (out.status !== 0) throw Error(`Music encoding failed: ${id}`);
  }
  unlinkSync(raw);
  tracks.push({
    id,
    title: score.title,
    bpm: score.bpm,
    bars: 16,
    duration: length,
    peak: 0.74,
    rms: Math.sqrt(energy / samples.length),
    files: [`music/${id}.mp3`, `music/${id}.ogg`],
  });
}
writeFileSync(
  "public/audio/manifest.json",
  JSON.stringify(
    {
      version: 1,
      provenance:
        "Original project compositions, deterministic offline synthesis; no external samples or recordings.",
      stageTracks: [
        "village",
        "pier",
        "workshop",
        "forest",
        "rooftops",
        "fortress",
        "rob",
        "santa",
      ],
      tracks,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Rendered ${tracks.length} original 16-bar scores in MP3 and Ogg.`);
