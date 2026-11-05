import Phaser from "phaser";
import { fighters } from "../fighters/data";
export const stageNames = [
  "VILLAGE SQUARE",
  "SEASIDE PIER",
  "SANTA’S WORKSHOP",
  "FROZEN FOREST",
  "FROZEN ROOFTOPS",
  "FROST FORTRESS",
];
export const stageSubtitles = [
  "Home for the holidays",
  "A cold front is rolling in",
  "Overtime. With extra punch.",
  "Where the winter whispers",
  "Take the fight to new heights",
  "The longest night awaits",
];
// Required generated artwork. A load error stops boot with a retry screen;
// no primitive fighter is silently substituted for an unfinished character.
export function createArt(
  scene: Phaser.Scene,
  progress: (value: number) => void = () => {},
) {
  const supplement = scene.textures
    .get("action-supplement")
    .getSourceImage() as HTMLImageElement;
  const walk = scene.textures
    .get("walk-supplement")
    .getSourceImage() as HTMLImageElement;
  for (const [row, def] of fighters.entries()) {
    const source = scene.textures
      .get(`atlas-${def.id}`)
      .getSourceImage() as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = 1536;
    canvas.height = 1536;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, 0, 0);
    // Supplemental low/air/throw poses share a separately documented baseline.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 1024, 1536, 256);
    ctx.clip();
    ctx.drawImage(supplement, 0, row * 256, 1536, 270, 0, 1012, 1536, 270);
    ctx.restore();
    ctx.drawImage(walk, 0, row * 256, 1536, 256, 0, 1280, 1536, 256);
    const texture = scene.textures.addCanvas(def.id, canvas)!;
    scene.textures.addSpriteSheet("", texture, {
      frameWidth: 192,
      frameHeight: 256,
    });
    scene.textures.remove(`atlas-${def.id}`);
    progress((row + 1) * 10);
  }
  scene.textures.remove("action-supplement");
  scene.textures.remove("walk-supplement");
  const environment = scene.textures
    .get("environment-atlas")
    .getSourceImage() as HTMLImageElement;
  for (let stage = 0; stage < 6; stage++)
    for (let layer = 0; layer < 3; layer++) {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 450;
      const c = canvas.getContext("2d")!;
      c.imageSmoothingEnabled = false;
      if (layer < 2) {
        c.save();
        c.beginPath();
        c.rect(0, layer === 0 ? 0 : 180, 800, layer === 0 ? 180 : 170);
        c.clip();
        c.drawImage(
          environment,
          (stage % 2) * 768,
          (Math.floor(stage / 2) * 1024) / 3,
          768,
          1024 / 3,
          0,
          0,
          800,
          355,
        );
        c.restore();
      } else
        c.drawImage(
          environment,
          (stage % 2) * 768,
          (Math.floor(stage / 2) * 1024) / 3 + 260,
          768,
          80,
          0,
          350,
          800,
          100,
        );
      scene.textures.addCanvas(`stage-${stage}-${layer}`, canvas);
      progress(40 + ((stage * 3 + layer + 1) / 18) * 60);
    }
  scene.textures.remove("environment-atlas");
}
