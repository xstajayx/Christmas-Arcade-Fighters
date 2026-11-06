// Build-time only. Original robotic speech, not a human or celebrity imitation.
import createSpeech from "@echogarden/espeak-ng-emscripten";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { Buffer } from "node:buffer";
import process from "node:process";
const engine = await createSpeech();
const speaker = new engine.eSpeakNGWorker();
speaker.set_voice("en-gb");
speaker.rate = 164;
speaker.pitch = 24;
speaker.range = 25;
const manifest = JSON.parse(
  readFileSync("public/voices/manifest.json", "utf8"),
);
const additions = {
  "christmas-arcade-fighters": "Christmas Arcade Fighters!",
  "five-hit-combo": "Five hit combo!",
  "special-attack": "Special attack!",
  "super-ready": "Super ready!",
  "christmas-arcade-champion": "Christmas Arcade Champion!",
};
manifest.required = [
  ...new Set([...manifest.required, ...Object.keys(additions)]),
];
manifest.text = {
  ...Object.fromEntries(
    manifest.required.map((id) => [id, id.replaceAll("-", " ") + "!"]),
  ),
  ...manifest.text,
  ...additions,
  super: "Super attack!",
};
mkdirSync("public/voices", { recursive: true });
const clips = [];
for (const id of manifest.required) {
  const parts = [];
  speaker.synthesize(manifest.text?.[id] || id.replaceAll("-", " "), (data) => {
    if (data.length) parts.push(Int16Array.from(data));
    return false;
  });
  const count = parts.reduce((sum, p) => sum + p.length, 0);
  if (count < 100) throw Error("Empty speech " + id);
  const wave = Buffer.alloc(44 + count * 2);
  wave.write("RIFF");
  wave.writeUInt32LE(36 + count * 2, 4);
  wave.write("WAVEfmt ", 8);
  wave.writeUInt32LE(16, 16);
  wave.writeUInt16LE(1, 20);
  wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(speaker.samplerate, 24);
  wave.writeUInt32LE(speaker.samplerate * 2, 28);
  wave.writeUInt16LE(2, 32);
  wave.writeUInt16LE(16, 34);
  wave.write("data", 36);
  wave.writeUInt32LE(count * 2, 40);
  let offset = 44;
  for (const part of parts)
    for (const sample of part) {
      wave.writeInt16LE(sample, offset);
      offset += 2;
    }
  const raw = `public/voices/${id}-raw.wav`,
    out = `public/voices/${id}.wav`;
  writeFileSync(raw, wave);
  const mix = spawnSync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-y",
      "-i",
      raw,
      "-af",
      "highpass=f=75,equalizer=f=160:t=q:w=0.8:g=3,equalizer=f=2400:t=q:w=1:g=2,lowpass=f=6200,acompressor=threshold=0.18:ratio=3:attack=4:release=90,loudnorm=I=-16:TP=-2:LRA=5",
      "-ar",
      "22050",
      "-ac",
      "1",
      out,
    ],
    { stdio: "inherit" },
  );
  if (mix.status !== 0) {
    process.stderr.write(
      "FFmpeg is required for consistent announcer mixing.\n",
    );
    process.exit(1);
  }
  unlinkSync(raw);
  const compressed = spawnSync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-y",
      "-i",
      out,
      "-c:a",
      "libmp3lame",
      "-b:a",
      "64k",
      `public/voices/${id}.mp3`,
    ],
    { stdio: "inherit" },
  );
  if (compressed.status !== 0) throw Error("Voice compression failed: " + id);
  clips.push({
    id,
    file: id + ".wav",
    compressed: id + ".mp3",
    quality: "robotic-fallback",
    duration: count / speaker.samplerate,
  });
}
writeFileSync(
  "public/voices/manifest.json",
  JSON.stringify(
    {
      ...manifest,
      version: 2,
      status:
        "Processed offline robotic fallback; professional recordings remain missing. Listening review required.",
      generator: "eSpeak NG Emscripten (build-time only) + FFmpeg",
      clips,
    },
    null,
    2,
  ) + "\n",
);
process.stdout.write(
  `Generated ${clips.length} original offline announcer WAV clips.\n`,
);
writeFileSync(
  "public/voices/production-needed.json",
  JSON.stringify(
    {
      status:
        "missing: no human-quality voice production tool or recordings available",
      direction:
        "Original deep, resonant male arcade announcer; energetic projection, crisp pronunciation, brief delivery. No voice imitation. Target -16 LUFS, peaks <= -2 dBTP.",
      integration:
        "After recording, change each matching manifest clip.compressed to studio/<id>.mp3 and quality to professional. The WAV remains a labelled robotic compatibility fallback.",
      files: manifest.required.map((id) => ({
        id,
        file: `studio/${id}.mp3`,
        text: manifest.text[id],
      })),
    },
    null,
    2,
  ) + "\n",
);
