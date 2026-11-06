// Same lossless FFmpeg pipeline as fighter/stage assets; runtime cells are 64px.
import { spawnSync } from "node:child_process";
const result = spawnSync(
  "ffmpeg",
  [
    "-loglevel",
    "error",
    "-y",
    "-i",
    "assets/source/festive-gifts.png",
    "-vf",
    "scale=512:256:flags=neighbor",
    "-c:v",
    "libwebp",
    "-lossless",
    "1",
    "-compression_level",
    "6",
    "public/atlases/festive-gifts.webp",
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) throw Error("Gift atlas conversion failed");
