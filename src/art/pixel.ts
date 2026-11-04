import Phaser from "phaser";
import { fighters, type FighterDef } from "../fighters/data";
export const stageNames = [
  "VILLAGE SQUARE",
  "SEASIDE PIER",
  "SANTA’S WORKSHOP",
  "FROZEN ROOFTOPS",
];
export const stageSubtitles = [
  "Home for the holidays",
  "A cold front is rolling in",
  "Overtime. With extra punch.",
  "Take the fight to new heights",
];
const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
export function createArt(
  scene: Phaser.Scene,
  progress: (value: number) => void = () => {},
) {
  for (const def of fighters) {
    const canvas = document.createElement("canvas");
    canvas.width = 112 * 12;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    for (let frame = 0; frame < 12; frame++) {
      ctx.save();
      ctx.translate(frame * 112, 0);
      drawFighter(ctx, def, frame);
      ctx.restore();
    }
    const texture = scene.textures.addCanvas(def.id, canvas)!;
    scene.textures.addSpriteSheet("", texture, {
      frameWidth: 112,
      frameHeight: 128,
    });
    progress((fighters.indexOf(def) + 1) * 10);
  }
  for (let stage = 0; stage < 4; stage++)
    for (let layer = 0; layer < 3; layer++) {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 450;
      const c = canvas.getContext("2d")!;
      drawStage(c, stage, layer);
      scene.textures.addCanvas(`stage-${stage}-${layer}`, canvas);
      progress(40 + ((stage * 3 + layer + 1) / 12) * 60);
    }
}
// Every pose is a separate transparent 112 × 128 frame. Pixel coordinates only.
function drawFighter(
  c: CanvasRenderingContext2D,
  d: FighterDef,
  frame: number,
) {
  const outline = "#101424",
    skin = hex(d.skin),
    coat = hex(d.coat),
    pants = hex(d.pants),
    accent = hex(d.color),
    hair = hex(d.hair);
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    c.fillStyle = color;
    c.fillRect(Math.round(x), Math.round(y), w, h);
  };
  const part = (x: number, y: number, w: number, h: number, color: string) => {
    r(x - 2, y - 2, w + 4, h + 4, outline);
    r(x, y, w, h, color);
  };
  const attack = frame === 4 || frame === 5,
    special = frame === 8,
    jump = frame === 3,
    crouch = frame === 2,
    hit = frame === 7,
    win = frame === 10,
    dead = frame === 11;
  if (dead) {
    c.translate(54, 111);
    c.rotate(-Math.PI / 2);
    c.translate(-55, -100);
  }
  const bob = frame === 1 ? 2 : 0;
  const cy = crouch ? 34 : bob;
  c.save();
  c.translate(hit ? -5 : 0, cy);
  if (crouch) c.scale(1, 0.72);
  // Split stance, chunky shaded boots and striped trousers.
  part(29, 77, 22, 25, pants);
  part(25, 96, 20, 19, pants);
  part(57, 78, 20, 23, pants);
  part(jump ? 63 : 71, jump ? 91 : 99, 20, 16, pants);
  r(29, 81, 5, 17, "#5b6070");
  r(60, 83, 4, 15, "#676974");
  r(26, 98, 3, 13, accent);
  r(76, 100, 3, 12, accent);
  part(20, 112, 30, 9, "#292d3c");
  part(71, 112, 30, 9, "#292d3c");
  r(22, 119, 29, 3, "#d5cfd0");
  r(73, 119, 30, 3, "#e2ded2");
  r(24, 113, 11, 3, accent);
  r(77, 114, 9, 3, accent);
  part(29, 42, 46, 39, coat);
  r(33, 47, 10, 29, "#ffffff18");
  r(67, 47, 8, 29, "#00000033");
  r(
    40,
    44,
    25,
    36,
    d.id === "nash" ? "#64697b" : d.id === "bucket" ? "#31583c" : "#a03335",
  );
  r(29, 76, 46, 5, "#151b27");
  r(34, 77, 4, 3, accent);
  r(45, 77, 4, 3, accent);
  r(56, 77, 4, 3, accent);
  r(67, 77, 4, 3, accent);
  // Festive knit motifs / tracksuit panels.
  if (d.id === "nash") {
    r(31, 45, 5, 25, "#e6e5ef");
    r(66, 45, 5, 25, "#e6e5ef");
    r(51, 42, 2, 35, "#e3e2ec");
    r(55, 52, 5, 6, "#252a39");
  } else {
    r(48, 53, 12, 11, "#f6e5cd");
    r(51, 49, 5, 5, "#fff4dc");
    r(50, 64, 9, 8, "#fff4dc");
    r(51, 56, 2, 2, outline);
    r(57, 56, 2, 2, outline);
    r(54, 60, 3, 2, "#e6533b");
    r(45, 66, 5, 3, accent);
    r(59, 66, 6, 3, accent);
    for (let i = 0; i < 4; i++) {
      r(36 + i * 9, 72, 3, 2, "#f7d9a6");
    }
  }
  if (d.id !== "nash") {
    for (let i = 0; i < 6; i++) {
      r(27 + i * 4, 40 + (i % 2) * 2, 5, 7, "#c7b6a1");
      r(30 + i * 3, 40, 3, 3, "#f6dfb4");
    }
    r(65, 43, 7, 13, "#e2c9a1");
  }
  // Arms: readable anticipation, active punch/kick, guard and victory silhouettes.
  let fx = 76,
    fy = 51;
  if (attack || special) {
    fx = 96;
    fy = frame === 5 ? 62 : 43;
  }
  if (frame === 6) {
    fx = 66;
    fy = 25;
  }
  if (win) {
    fx = 75;
    fy = 13;
  }
  part(15, 50, 17, 22, coat);
  part(12, 42, 15, 19, skin);
  r(14, 43, 10, 3, "#ffd3a0");
  r(15, 52, 10, 2, "#9e644d");
  r(16, 48, 2, 6, "#b77b56");
  part(72, 51, Math.max(10, fx - 65), 14, coat);
  part(fx - 4, fy, 15, 15, skin);
  r(fx - 2, fy + 1, 11, 3, "#ffd5a2");
  r(fx - 1, fy + 8, 10, 2, "#a66b50");
  if (frame === 5) {
    part(75, 79, 30, 14, pants);
    part(94, 75, 15, 14, "#cbd1d5");
    r(102, 78, 6, 6, accent);
  }
  // Neck, face, distinctive hair and beard.
  part(45, 30, 16, 14, skin);
  part(39, 12, 28, 26, skin);
  r(40, 17, 5, 16, "#bd805c");
  r(47, 14, 18, 4, "#ffd4a0");
  r(62, 24, 7, 7, skin);
  r(55, 22, 11, 3, outline);
  r(59, 26, 4, 3, "#fff2d7");
  r(61, 26, 2, 3, outline);
  r(61, 32, 7, 2, "#a55d4a");
  if (d.id === "nash") {
    r(36, 10, 32, 13, hair);
    r(39, 8, 24, 6, hair);
    for (let i = 0; i < 7; i++) r(38 + i * 4, 12, 2, 7, "#614331");
    r(44, 31, 19, 3, "#f7e7cc");
  } else {
    r(38, 10, 27, 10, hair);
    r(41, 7, 17, 5, hair);
    for (let i = 0; i < 6; i++) r(40 + i * 4, 10, 2, 6, "#8c593b");
    r(39, 27, 6, 10, hair);
    r(43, 33, 21, d.id === "beardy" ? 12 : 6, hair);
    r(48, 38, 16, d.id === "beardy" ? 9 : 2, hair);
    r(48, 34, 15, 2, "#d89a6a");
  }
  if (d.id === "bucket") {
    part(34, 6, 38, 8, accent);
    r(40, -1, 25, 8, accent);
    r(43, 1, 14, 4, "#4d6528");
    r(46, 2, 8, 2, "#cdeb75");
    r(49, 23, 10, 7, outline);
    r(61, 23, 9, 7, outline);
    r(52, 25, 5, 3, "#a7d9db");
    r(64, 25, 4, 3, "#a7d9db");
  }
  if (d.id === "beardy") {
    r(41, 10, 23, 5, "#21334c");
    r(43, 10, 8, 4, "#62b8d3");
    r(54, 10, 7, 4, "#62b8d3");
  }
  if (special) {
    r(95, 39, 4, 23, accent);
    r(89, 46, 16, 4, "#fff5c0");
    r(98, 33, 3, 5, "#fff5c0");
  }
  c.restore();
}
function drawStage(c: CanvasRenderingContext2D, stage: number, layer: number) {
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    c.fillStyle = color;
    c.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
  };
  let seed = 37 + stage * 19;
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const snow = "#d6e2ed";
  const pine = (x: number, y: number, size: number, lit = false) => {
    r(x - 4, y, 8, size * 0.8, "#5c4542");
    for (let i = 0; i < 5; i++) {
      const w = size * (0.2 + i * 0.15),
        yy = y - size * 0.7 + i * size * 0.19;
      r(x - w / 2, yy, w, size * 0.22, "#153e44");
      r(x - w / 2, yy, w, 4, "#aacbd5");
      for (let j = 0; j < 5; j++)
        if (lit)
          r(
            x - w / 2 + 3 + rnd() * (w - 6),
            yy + 5 + rnd() * size * 0.14,
            3,
            3,
            ["#f5c94e", "#eb6851", "#78c9ac"][j % 3],
          );
    }
  };
  if (layer === 0) {
    const palettes = [
      ["#101a37", "#2f3053", "#766079"],
      ["#141e42", "#5b3865", "#da805e"],
      ["#222738", "#443b46", "#6e514e"],
      ["#102238", "#1c3c59", "#52778b"],
    ];
    const p = palettes[stage];
    for (let y = 0; y < 350; y += 3) {
      const band = y < 140 ? p[0] : y < 240 ? p[1] : p[2];
      r(0, y, 800, 3, band);
    }
    for (let i = 0; i < 190; i++) {
      const x = rnd() * 800,
        y = rnd() * 250;
      r(x, y, 1 + (rnd() > 0.9 ? 1 : 0), 1 + (rnd() > 0.9 ? 1 : 0), "#b7cadd");
    }
    c.fillStyle = "#f6e5b8";
    c.beginPath();
    c.arc(665, 74, 26, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 16; i++)
      r(
        645 + rnd() * 36,
        54 + rnd() * 39,
        3 + rnd() * 5,
        2 + rnd() * 4,
        "#d5c8b1",
      );
    for (let x = -10; x < 830; x += 35) {
      const h = 25 + rnd() * 70;
      r(x, 260 - h, 32, h + 40, "#263650");
      r(x + 6, 244 - h, 17, 17, "#263650");
      for (let j = 0; j < 4; j++)
        if (rnd() > 0.5) r(x + 8, 272 - h + j * 16, 3, 5, "#c49468");
    }
    if (stage === 1) {
      c.strokeStyle = "#edb65a";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(620, 210, 67, 0, Math.PI * 2);
      c.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        c.beginPath();
        c.moveTo(620, 210);
        c.lineTo(620 + Math.cos(a) * 67, 210 + Math.sin(a) * 67);
        c.stroke();
        r(616 + Math.cos(a) * 67, 207 + Math.sin(a) * 67, 9, 7, "#edbb6b");
      }
      r(617, 209, 6, 82, "#d3a379");
    }
    return;
  }
  if (layer === 1) {
    if (stage === 0 || stage === 1) {
      const house = (
        x: number,
        w: number,
        h: number,
        col: string,
        name: string,
      ) => {
        const y = 332 - h;
        r(x, y, w, h, col);
        r(x + 5, y + 6, w - 10, 7, "#bd99a2");
        c.fillStyle = "#25314b";
        c.beginPath();
        c.moveTo(x - 9, y);
        c.lineTo(x + w / 2, y - 40);
        c.lineTo(x + w + 9, y);
        c.fill();
        r(x - 10, y - 2, w + 20, 6, snow);
        for (let yy = y + 23; yy < 320; yy += 35)
          for (let xx = x + 12; xx < x + w - 8; xx += 24) {
            r(xx - 2, yy - 2, 16, 22, "#302c3e");
            r(xx, yy, 12, 18, "#efb95d");
            r(xx + 5, yy, 2, 18, "#61454a");
            r(xx, yy + 8, 12, 2, "#61454a");
          }
        r(x + 6, 300, w - 12, 19, "#2e3648");
        c.fillStyle = "#f4dfb0";
        c.font = "bold 8px monospace";
        c.textAlign = "center";
        c.fillText(name, x + w / 2, 313);
        r(x, 330, w, 5, "#b5c4d3");
      };
      house(-20, 114, 139, "#585072", "THE HOLLY INN");
      house(102, 64, 110, "#6a5664", "NOEL");
      house(681, 135, 146, "#4f536b", "THE NORTH STAR");
      house(610, 61, 109, "#786272", "GIFTS");
      for (let x = 0; x < 800; x += 19) {
        r(x, 328, 4, 30, "#17293d");
        r(x, 326, 6, 3, "#8fabbf");
      }
      r(0, 337, 800, 4, "#17293d");
      if (stage === 0) {
        pine(400, 259, 150, true);
        r(395, 138, 10, 15, "#ffd36c");
        r(389, 143, 22, 5, "#fff0a9");
        for (let i = 0; i < 7; i++) {
          const x = 343 + i * 17,
            y = 313 + (i % 2) * 9;
          r(x, y, 22, 23, ["#a83c4d", "#388079", "#b89042"][i % 3]);
          r(x + 9, y, 3, 23, "#f9cc74");
          r(x - 1, y, 24, 3, "#ecd59d");
        }
      } else {
        r(0, 290, 800, 34, "#243b58");
        for (let i = 0; i < 100; i++)
          r(
            rnd() * 800,
            292 + rnd() * 28,
            4 + rnd() * 20,
            1,
            ["#d2a18c", "#609da8", "#826c9e"][i % 3],
          );
      }
      for (const x of [197, 597]) {
        r(x - 3, 204, 6, 134, "#131e30");
        r(x - 9, 333, 18, 7, "#19283b");
        r(x - 13, 191, 26, 5, "#152032");
        r(x - 11, 167, 22, 26, "#f6c45d");
        r(x - 6, 172, 12, 16, "#fff0ac");
        r(x - 14, 164, 28, 5, "#1a2235");
        r(x - 8, 159, 16, 6, "#1a2235");
        r(x - 2, 152, 4, 9, "#1a2235");
        r(x - 13, 226, 25, 7, "#bb3d50");
        r(x - 3, 229, 6, 17, "#c14750");
      }
      if (stage === 0) {
        for (const x of [273, 535]) pine(x, 306, 65);
        c.fillStyle = "#d1dfe9";
        c.beginPath();
        c.arc(562, 314, 16, 0, Math.PI * 2);
        c.arc(562, 290, 11, 0, Math.PI * 2);
        c.fill();
        r(552, 279, 21, 4, "#1b283c");
        r(555, 271, 14, 9, "#233249");
        r(553, 299, 19, 4, "#bb4350");
        r(565, 288, 9, 3, "#e0a05e");
      }
    }
    if (stage === 2) {
      r(0, 110, 800, 234, "#493e46");
      for (let y = 112; y < 338; y += 20)
        for (let x = -(y % 40); x < 810; x += 45) {
          r(x, y, 42, 17, "#59464b");
          r(x + 2, y + 2, 36, 2, "#695354");
        }
      for (const x of [92, 348, 604]) {
        r(x, 144, 105, 123, "#172b3b");
        r(x + 5, 149, 95, 113, "#325765");
        r(x + 50, 149, 4, 113, "#ad8971");
        r(x, 204, 105, 5, "#ad8971");
      }
      r(0, 322, 800, 21, "#1d3036");
      for (let x = 0; x < 800; x += 27) r(x, 325, 20, 13, "#6e7773");
      r(304, 243, 149, 78, "#4c766b");
      r(312, 250, 132, 15, "#9ba780");
      r(323, 272, 21, 29, "#c87f53");
      r(360, 277, 78, 5, "#203b3d");
      for (let i = 0; i < 8; i++) {
        r(40 + i * 92, 302, 34, 25, ["#a64d51", "#4e856e", "#aa935c"][i % 3]);
        r(53 + i * 92, 302, 6, 25, "#e9c681");
      }
      pine(720, 290, 100, true);
    }
    if (stage === 3) {
      for (let x = -30; x < 820; x += 130) {
        r(x, 280, 110, 70, "#293c54");
        c.fillStyle = "#233149";
        c.beginPath();
        c.moveTo(x - 9, 282);
        c.lineTo(x + 55, 225);
        c.lineTo(x + 121, 282);
        c.fill();
        r(x - 9, 280, 130, 6, snow);
        r(x + 28, 238, 15, 37, "#43536a");
        r(x + 25, 235, 21, 5, "#e3edf2");
      }
      for (let x = 20; x < 800; x += 160) {
        r(x, 310, 20, 35, "#4e5c71");
        r(x - 3, 306, 26, 6, snow);
      }
      r(0, 340, 800, 10, "#b9d6e5");
    }
    // Hanging string lights, warm pools of colour.
    for (let x = 0; x < 800; x += 18) {
      const y = 120 + Math.sin((x / 800) * Math.PI) * 30;
      r(x, y, 18, 1, "#536473");
      r(
        x + 5,
        y + 2,
        3,
        5,
        ["#f1c666", "#eb7e65", "#98c8b2"][Math.floor(x / 18) % 3],
      );
    }
    return;
  }
  r(0, 348, 800, 102, stage === 2 ? "#615356" : "#657183");
  r(0, 347, 800, 7, "#cfdeeb");
  for (let y = 359; y < 450; y += 17)
    for (let x = -(y % 34); x < 815; x += 38) {
      r(
        x,
        y,
        35,
        14,
        stage === 2
          ? ["#665558", "#74615d", "#554a52"][Math.floor(rnd() * 3)]
          : ["#6b758a", "#798298", "#556478", "#8b8997"][Math.floor(rnd() * 4)],
      );
      r(x + 1, y + 1, 32, 2, "#a8a8b04a");
    }
  for (let i = 0; i < 100; i++) {
    const x = rnd() * 800,
      y = 350 + rnd() * 100;
    r(x, y, 2 + rnd() * 10, 1, "#d3e2ee");
  }
  r(0, 426, 800, 24, "#121e34");
  r(0, 426, 800, 3, "#a9c7da");
  for (let x = 0; x < 800; x += 4) {
    r(x, 429 + (x % 7), 4, 2, "#40516a");
  }
}
