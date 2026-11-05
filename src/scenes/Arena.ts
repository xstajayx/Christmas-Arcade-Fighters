import Phaser from "phaser";
import { createArt } from "../art/pixel";
import {
  makeFighter,
  activeHitbox,
  hurtbox,
  type Match,
} from "../combat/engine";
import { fighterById, signatures } from "../fighters/data";
import { animationFrame } from "../animation/clips";
export interface SceneBridge {
  match: Match | null;
  stage: number;
  reduced: boolean;
  debug?: boolean;
  update: (delta: number) => void;
  ready: () => void;
  progress: (value: number) => void;
}
interface Particle {
  sprite: Phaser.GameObjects.Rectangle;
  life: number;
  vx: number;
  vy: number;
}
export class Arena extends Phaser.Scene {
  private sprites: Phaser.GameObjects.Sprite[] = [];
  private shadows: Phaser.GameObjects.Ellipse[] = [];
  private layers: Phaser.GameObjects.Image[] = [];
  private flakes: Phaser.GameObjects.Rectangle[] = [];
  private particles: Particle[] = [];
  private missiles: Phaser.GameObjects.Sprite[] = [];
  private ambientDots: Phaser.GameObjects.Rectangle[] = [];
  private gifts: Phaser.GameObjects.Container[] = [];
  private stageId = -1;
  private booted = false;
  private mist: Phaser.GameObjects.Ellipse[] = [];
  private sleigh!: Phaser.GameObjects.Image;
  private wheelDots: Phaser.GameObjects.Rectangle[] = [];
  private demos = [
    makeFighter("jamie", 155, 1),
    makeFighter("bucket", 645, -1),
  ];
  private debugGraphic!: Phaser.GameObjects.Graphics;
  private cutin!: Phaser.GameObjects.Container;
  private cutinText!: Phaser.GameObjects.Text;
  private cutinPortrait!: Phaser.GameObjects.Sprite;
  private errors: string[] = [];
  constructor(private bridge: SceneBridge) {
    super("Arena");
  }
  preload() {
    for (const id of ["jamie", "nash", "bucket", "beardy", "frost"])
      this.load.image(
        `atlas-${id}`,
        `${import.meta.env.BASE_URL}atlases/${id}.webp`,
      );
    for (const id of ["jamie", "nash", "bucket", "beardy", "frost"])
      this.load.spritesheet(
        `special-${id}`,
        `${import.meta.env.BASE_URL}atlases/special-${id}.webp`,
        { frameWidth: 256, frameHeight: 256 },
      );
    this.load.image(
      "walk-supplement",
      `${import.meta.env.BASE_URL}atlases/walk.webp`,
    );
    this.load.image(
      "action-supplement",
      `${import.meta.env.BASE_URL}atlases/actions.webp`,
    );
    this.load.image(
      "environment-atlas",
      `${import.meta.env.BASE_URL}stages/arenas.webp`,
    );
    this.load.on("progress", (n: number) => this.bridge.progress(n * 70));
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      this.errors.push(file.key);
      console.error("Art asset failed:", file.key);
    });
  }
  create() {
    if (this.errors.length) {
      const overlay = document.querySelector<HTMLElement>("#overlay")!;
      overlay.innerHTML =
        '<div class="panel compact" role="alert"><h2>ARTWORK COULDN’T LOAD.</h2><p>Required animation or stage assets are unavailable. Reconnect and retry; no placeholder fighters will be substituted.</p><button id="retry-art" class="primary">RETRY LOADING →</button></div>';
      overlay.querySelector<HTMLButtonElement>("#retry-art")!.onclick = () =>
        window.location.reload();
      return;
    }
    createArt(this, (n) => this.bridge.progress(70 + n * 0.3));
    // Frost Jamie has a separate original icy atlas and special choreography.
    const source = this.textures
      .get(this.textures.exists("atlas-frost") ? "atlas-frost" : "jamie")
      .getSourceImage() as HTMLCanvasElement;
    const c = document.createElement("canvas");
    c.width = source.width;
    c.height = source.height;
    c.getContext("2d")!.drawImage(source, 0, 0);
    const texture = this.textures.addCanvas("frost", c)!;
    this.textures.addSpriteSheet("", texture, {
      frameWidth: 192,
      frameHeight: 256,
    });
    if (this.textures.exists("atlas-frost"))
      this.textures.remove("atlas-frost");
    for (let i = 0; i < 3; i++)
      this.layers.push(this.add.image(400, 225, `stage-0-${i}`));
    for (let i = 0; i < 7; i++) {
      this.gifts.push(
        this.add.container(i * 120, 314, [
          this.add.rectangle(
            0,
            0,
            20,
            18,
            [0xad4253, 0x388576, 0xc4954a][i % 3],
          ),
          this.add.rectangle(0, 0, 3, 18, 0xffdb80),
        ]),
      );
    }
    for (let i = 0; i < 2; i++) {
      this.shadows.push(this.add.ellipse(0, 350, 78, 10, 0x071424, 0.55));
      this.sprites.push(
        this.add
          .sprite(0, 350, i ? "bucket" : "jamie")
          .setOrigin(0.45, 0.953125)
          .setScale(0.75)
          .setDepth(5),
      );
    }
    for (let i = 0; i < 80; i++)
      this.flakes.push(
        this.add.rectangle(
          (i * 83) % 800,
          (i * 47) % 450,
          i % 4 === 0 ? 3 : 2,
          i % 4 === 0 ? 3 : 2,
          0xe4f8ff,
          0.25 + (i % 5) * 0.12,
        ),
      );
    for (let i = 0; i < 16; i++)
      this.ambientDots.push(
        this.add.rectangle(
          50 + i * 47,
          145 + Math.sin(i) * 18,
          3,
          3,
          [0xffc966, 0x9feacb, 0xf09076][i % 3],
        ),
      );
    for (let i = 0; i < 144; i++)
      this.particles.push({
        sprite: this.add
          .rectangle(0, 0, 3, 3, 0xffffff)
          .setDepth(12)
          .setVisible(false),
        life: 0,
        vx: 0,
        vy: 0,
      });
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    for (const id of ["jamie", "nash", "bucket", "beardy", "frost"]) {
      g.clear();
      const col = fighterById(id as "jamie").color;
      if (id === "jamie") {
        g.fillStyle(0xf58432);
        g.fillTriangle(0, 14, 27, 0, 29, 28);
        g.fillCircle(24, 14, 12);
        g.fillStyle(0xffeaa4);
        g.fillCircle(27, 14, 7);
      } else if (id === "bucket" || id === "frost") {
        g.fillStyle(id === "frost" ? 0x8be3fa : 0xe1fbff);
        g.fillPoints(
          [
            { x: 18, y: 0 },
            { x: 24, y: 9 },
            { x: 35, y: 14 },
            { x: 25, y: 22 },
            { x: 18, y: 29 },
            { x: 10, y: 20 },
            { x: 0, y: 14 },
            { x: 10, y: 8 },
          ],
          true,
        );
        g.lineStyle(2, 0x5a98c4);
        g.strokeCircle(18, 14, 10);
      } else {
        g.fillStyle(col, 0.85);
        g.fillRect(0, 6, 36, 20);
        g.lineStyle(2, 0xf9e9b9);
        g.strokeRect(2, 8, 30, 16);
      }
      g.generateTexture("orb-" + id, 40, 32);
    }
    g.clear();
    g.fillStyle(0x15213c);
    g.fillRect(18, 14, 28, 6);
    g.fillRect(22, 20, 30, 2);
    g.fillRect(23, 7, 9, 8);
    g.fillCircle(28, 5, 4);
    g.fillRect(1, 11, 11, 5);
    g.fillRect(3, 15, 2, 8);
    g.fillRect(10, 15, 2, 8);
    g.lineStyle(1, 0x1c2943);
    g.lineBetween(13, 12, 22, 14);
    g.generateTexture("sleigh", 64, 28);
    g.destroy();
    this.sleigh = this.add.image(-100, 92, "sleigh").setDepth(1);
    for (let i = 0; i < 5; i++)
      this.mist.push(
        this.add
          .ellipse(i * 190, 310 + (i % 2) * 15, 230, 24, 0xa4d8ef, 0.07)
          .setDepth(2),
      );
    for (let i = 0; i < 12; i++)
      this.wheelDots.push(this.add.rectangle(0, 0, 2, 2, 0xffd793).setDepth(1));
    for (let i = 0; i < 32; i++)
      this.missiles.push(
        this.add.sprite(0, 0, "orb-jamie").setDepth(7).setVisible(false),
      );
    this.debugGraphic = this.add.graphics().setDepth(20);
    this.cutinPortrait = this.add
      .sprite(240, 290, "jamie", 24)
      .setScale(0.9)
      .setOrigin(0.45, 0.95);
    this.cutinText = this.add
      .text(400, 182, "", {
        fontFamily: "Impact, monospace",
        fontSize: "30px",
        color: "#ffe09b",
        stroke: "#162039",
        strokeThickness: 5,
      })
      .setOrigin(0, 0.5);
    this.cutin = this.add
      .container(0, 0, [
        this.add.rectangle(400, 225, 800, 450, 0x08101e, 0.82),
        this.add.rectangle(400, 215, 800, 134, 0x243650, 0.88),
        this.cutinPortrait,
        this.cutinText,
      ])
      .setDepth(35)
      .setVisible(false);
    this.booted = true;
    this.bridge.ready();
  }
  update(time: number, delta: number) {
    if (!this.booted) return;
    this.bridge.update(delta);
    const m = this.bridge.match;
    if (this.stageId !== this.bridge.stage) {
      this.stageId = this.bridge.stage;
      this.layers.forEach((l, i) => l.setTexture(`stage-${this.stageId}-${i}`));
    }
    const cam = m
      ? ((m.fighters[0].x + m.fighters[1].x) / 2 - 400) / 12
      : Math.sin(time / 6000) * 3;
    this.layers[0].x = 400 - cam * 0.25;
    this.layers[1].x = 400 - cam * 0.6;
    this.sleigh.visible = this.stageId === 4;
    if (this.sleigh.visible)
      this.sleigh.setPosition(
        this.bridge.reduced ? 650 : ((time / 80) % 1000) - 100,
        92 + (this.bridge.reduced ? 0 : Math.sin(time / 1300) * 3),
      );
    this.mist.forEach((fog, i) => {
      fog.visible = this.stageId === 3;
      fog.x = this.bridge.reduced
        ? i * 190
        : ((i * 190 + time / 140) % 1100) - 150;
    });
    this.wheelDots.forEach((dot, i) => {
      dot.visible = this.stageId === 1;
      const angle =
        (i * Math.PI) / 6 + (this.bridge.reduced ? 0 : time / 16000);
      dot.setPosition(610 + Math.cos(angle) * 29, 143 + Math.sin(angle) * 29);
    });
    this.gifts.forEach((gift, i) => {
      gift.visible = this.stageId === 2;
      gift.x = this.bridge.reduced
        ? i * 120
        : ((i * 120 + time / 65) % 840) - 20;
    });
    const display = m?.fighters || this.demos;
    display.forEach((f, i) => {
      const spr = this.sprites[i];
      const special =
        f.state === "attack" &&
        (f.move?.startsWith("special") || f.move === "super");
      const textureKey = special ? `special-${f.id}` : f.id;
      if (spr.texture.key !== textureKey) spr.setTexture(textureKey);
      spr.setOrigin(special ? 105 / 256 : 0.45, 0.953125);
      const frame = animationFrame(
        f,
        m ? f.animTick : Math.floor(time / 16.67),
      );
      spr
        .setFrame(Math.min(frame, spr.texture.frameTotal - 2))
        .setPosition(Math.round(f.x), Math.round(f.y + 50))
        .setFlipX(f.facing < 0)
        .setScale(0.75);
      if (f.guardFrames > 0) spr.setTint(0xc4eedc);
      else if (f.state === "hitstun" && !this.bridge.reduced)
        spr.setTint(0xffb2a2);
      else spr.clearTint();
      this.shadows[i]
        .setPosition(f.x, 350)
        .setScale(Math.max(0.4, 1 - (300 - f.y) / 200));
    });
    this.flakes.forEach((f, i) => {
      f.visible = !this.bridge.reduced;
      if (f.visible) {
        f.y += ((0.18 + (i % 4) * 0.1) * delta) / 16.67;
        f.x +=
          Math.sin(time / 2000 + i) * 0.12 + (this.stageId === 5 ? 0.45 : 0);
        if (f.y > 450 || f.x > 805) {
          f.y = -4;
          f.x = (f.x + 137) % 800;
        }
      }
    });
    this.ambientDots.forEach((light, i) => {
      light.visible = this.stageId < 3 || this.stageId === 5;
      light.alpha = this.bridge.reduced
        ? 0.65
        : 0.4 + Math.sin(time / 400 + i) * 0.3;
      light.setFillStyle(
        this.stageId === 5 ? 0x98eaff : [0xffc966, 0x9feacb, 0xf09076][i % 3],
      );
    });
    this.missiles.forEach((sprite, i) => {
      const p = m?.projectiles[i];
      sprite.visible = !!p;
      if (p)
        sprite
          .setTexture("orb-" + p.style)
          .setPosition(p.x, p.y + 50)
          .setFlipX(p.vx < 0)
          .setScale(p.data.kind === "wave" ? 1.35 : 1);
    });
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= delta;
      p.sprite.x += (p.vx * delta) / 16.67;
      p.sprite.y += (p.vy * delta) / 16.67;
      p.vy += 0.06;
      p.sprite.alpha = Math.max(0, p.life / 300);
      if (p.life <= 0) p.sprite.visible = false;
    }
    if (m)
      for (const e of m.events) {
        if (
          [
            "hit",
            "block",
            "counter",
            "special",
            "super",
            "projectile",
            "bossPhase",
          ].includes(e.type)
        ) {
          const color =
            e.type === "block"
              ? 0x8fc9e8
              : e.type === "counter"
                ? 0xffe7a4
                : e.type === "special" || e.type === "super"
                  ? fighterById(m.fighters[e.player || 0].id).color
                  : 0xffce86;
          let remaining = this.bridge.reduced
            ? 3
            : e.strength === "heavy" || e.type === "super"
              ? 24
              : 12;
          for (const p of this.particles) {
            if (p.life > 0 || remaining <= 0) continue;
            const angle = remaining * 2.4;
            p.life = 260;
            p.vx = Math.cos(angle) * (e.type === "super" ? 5 : 3);
            p.vy = Math.sin(angle) * 3;
            p.sprite
              .setPosition(e.x, e.y + 50)
              .setFillStyle(color)
              .setAlpha(1)
              .setVisible(true);
            remaining--;
          }
          if (
            !this.bridge.reduced &&
            (e.type === "super" ||
              e.strength === "heavy" ||
              e.type === "counter")
          )
            this.cameras.main.shake(
              e.type === "super" ? 140 : 70,
              e.type === "super" ? 0.006 : 0.003,
            );
        }
      }
    this.cutin.visible = !!m && m.cinematic > 0;
    if (m && m.cinematic > 0) {
      const f = m.fighters[m.cinematicPlayer];
      this.cutinPortrait
        .setTexture(`special-${f.id}`, 18)
        .setCrop(0, 0, 224, 256)
        .setOrigin(105 / 256, 0.953125)
        .clearTint();
      this.cutinText.setText(
        `${fighterById(f.id).name}\n${signatures[f.id][3].toUpperCase()}`,
      );
    }
    this.debugGraphic.clear();
    if (this.bridge.debug && m) {
      for (const f of m.fighters) {
        const h = hurtbox(f),
          a = activeHitbox(f);
        this.debugGraphic
          .lineStyle(1, 0x48edaf)
          .strokeRect(h.x, h.y + 50, h.w, h.h);
        if (a)
          this.debugGraphic
            .lineStyle(2, 0xff795f)
            .strokeRect(a.x, a.y + 50, a.w, a.h);
      }
    }
  }
}
