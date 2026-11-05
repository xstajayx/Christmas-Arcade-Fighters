// Build-time only. Original robotic speech, not a human or celebrity imitation.
import createSpeech from "@echogarden/espeak-ng-emscripten";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { Buffer } from "node:buffer";
import process from "node:process";
const engine = await createSpeech();
const speaker = new engine.eSpeakNGWorker();
speaker.set_voice("en-gb");
speaker.rate = 148;
speaker.pitch = 32;
speaker.range = 18;
const manifest = JSON.parse(
  readFileSync("public/voices/manifest.json", "utf8"),
);
mkdirSync("public/voices", { recursive: true });
const clips = [];
for (const id of manifest.required) {
  const parts = [];
  speaker.synthesize(id.replaceAll("-", " "), (data) => {
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
      "highpass=f=100,lowpass=f=4500,loudnorm=I=-18:TP=-1.5:LRA=8",
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
  clips.push({ id, file: id + ".wav", duration: count / speaker.samplerate });
}
writeFileSync(
  "public/voices/manifest.json",
  JSON.stringify(
    {
      ...manifest,
      status:
        "original synthesized robotic announcer; listening and device review required",
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
