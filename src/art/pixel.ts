import { stageSource, stageFloor } from "./stages";
import Phaser from "phaser";
import { fighters } from "../fighters/data";
import { isolateFrame, touchesCellEdge } from "./frames";
export const stageNames = [
  "VILLAGE SQUARE",
  "SEASIDE PIER",
  "SANTA’S WORKSHOP",
  "FROZEN FOREST",
  "FROZEN ROOFTOPS",
  "FROST FORTRESS",
  "THE COLLECTION HALL",
  "SANTA’S THRONE · NORTH POLE",
];
export const stageSubtitles = [
  "Home for the holidays",
  "A cold front is rolling in",
  "Overtime. With extra punch.",
  "Where the winter whispers",
  "Take the fight to new heights",
  "The longest night awaits",
  "The Rob Father is expecting you",
  "The final delivery",
];
// Required generated artwork. A load error stops boot with a retry screen;
// no primitive fighter is silently substituted for an unfinished character.
export function createArt(
  scene: Phaser.Scene,
  progress: (value: number) => void = () => {},
) {
  for (const [row, def] of fighters.entries())
    createFighterArt(scene, def.id, row);
  for (const id of ["frost", "rob", "santa"]) createFighterArt(scene, id);
  scene.textures.remove("action-supplement");
  scene.textures.remove("walk-supplement");
  progress(40);
  const environment = scene.textures
    .get("environment-atlas")
    .getSourceImage() as HTMLImageElement;
  for (let stage = 0; stage < 8; stage++)
    for (let layer = 0; layer < 3; layer++) {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 450;
      const c = canvas.getContext("2d")!;
      c.imageSmoothingEnabled = false;
      if (layer === 0) {
        const rect = stageSource(stage);
        const source =
          stage < 6
            ? environment
            : (scene.textures
                .get("v3-environment")
                .getSourceImage() as HTMLImageElement);
        const floor = stageFloor(stage),
          cut = Math.round(rect.h * floor.source);
        // Abutting source regions: overscan must not push the painted floor below
        // the physical feet. Every source row is used once, with no pasted floor.
        c.drawImage(
          source,
          rect.x,
          rect.y,
          rect.w,
          cut,
          0,
          0,
          800,
          floor.target,
        );
        c.drawImage(
          source,
          rect.x,
          rect.y + cut,
          rect.w,
          rect.h - cut,
          0,
          floor.target,
          800,
          450 - floor.target,
        );
      }
      // Overlay slots remain transparent: atmosphere is independently animated in Arena.
      scene.textures.addCanvas(`stage-${stage}-${layer}`, canvas);
      progress(40 + ((stage * 3 + layer + 1) / 24) * 60);
    }
  scene.textures.remove("environment-atlas");
  scene.textures.remove("v3-environment");
}

export function createFighterArt(
  scene: Phaser.Scene,
  id: string,
  row?: number,
) {
  const image = (key: string) =>
    scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const source = image(`atlas-${id}`);
  const scratch = document.createElement("canvas");
  scratch.width = 256;
  scratch.height = 256;
  const read = scratch.getContext("2d", { willReadFrequently: true })!;
  const pack = (key: string, count: number, special = false) => {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = Math.ceil(count / 8) * 256;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    const metadata = [];
    for (let frame = 0; frame < count; frame++) {
      const w = special ? 256 : 192;
      let src = source,
        sx = (frame % 8) * 192,
        sy = Math.floor(frame / 8) * 256;
      if (special) {
        src = image(`raw-special-${id}`);
        sx = (frame % 6) * 256;
        sy = Math.floor(frame / 6) * 256;
      } else if (frame >= 32) {
        src = image(frame < 40 ? "action-supplement" : "walk-supplement");
        sx = (frame % 8) * 192;
        sy = row! * 256;
      }
      read.clearRect(0, 0, 256, 256);
      read.drawImage(src, sx, sy, w, 256, 0, 0, w, 256);
      let isolated = isolateFrame(
        read.getImageData(0, 0, w, 256).data,
        w,
        256,
        special ? 105 : 86,
      );
      // Wide falls/kicks can continue into the transparent gutter of a 192px cell.
      // Read a guarded margin only at a clipped body edge; keep the same world anchor.
      if (!special && touchesCellEdge(isolated, w)) {
        read.clearRect(0, 0, 256, 256);
        read.drawImage(src, sx - 32, sy, 256, 256, 0, 0, 256, 256);
        isolated = isolateFrame(
          read.getImageData(0, 0, 256, 256).data,
          256,
          256,
          118,
        );
      }
      ctx.putImageData(
        new ImageData(isolated.pixels, 256, 256),
        (frame % 8) * 256,
        Math.floor(frame / 8) * 256,
      );
      metadata.push({
        bounds: isolated.bounds,
        pivot: isolated.pivot,
        offset: isolated.offset,
        contacts: isolated.contacts,
      });
    }
    const tex = scene.textures.addCanvas(key, canvas)!;
    scene.textures.addSpriteSheet("", tex, {
      frameWidth: 256,
      frameHeight: 256,
    });
    tex.customData = { frames: metadata };
  };
  pack(id, row === undefined ? 32 : 48);
  pack(`special-${id}`, 24, true);
  scene.textures.remove(`atlas-${id}`);
  scene.textures.remove(`raw-special-${id}`);
}
