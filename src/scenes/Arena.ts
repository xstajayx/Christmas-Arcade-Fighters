import { HdBank } from "../animation/hd";
import { motionPhase, renderPosition } from "../animation/motion";
import { giftFrame, stageLayout } from "../art/stages";
import { activeSuper as superPresentation } from "../combat/presentation";
import Phaser from "phaser";
import { createArt } from "../art/pixel";
import {
  makeFighter,
  activeHitbox,
  hurtbox,
  pushbox,
  type Match,
} from "../combat/engine";
import { fighterById } from "../fighters/data";
import { animationFrame } from "../animation/clips";
import {
  initialFraming,
  targetFraming,
  followFraming,
} from "../camera/framing";
export interface SceneBridge {
  match: Match | null;
  stage: number;
  reduced: boolean;
  shake?: boolean;
  debug?: boolean;
  combatVisible?: boolean;
  renderAlpha?: number;
  touchLayout?: boolean;
  controlSafeBottom?: number;
  preview?: { frame: number; special: boolean };
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
  private hd!: HdBank;
  private sprites: Phaser.GameObjects.Sprite[] = [];
  private shadows: Phaser.GameObjects.Ellipse[][] = [];
  private layers: Phaser.GameObjects.Image[] = [];
  private flakes: Phaser.GameObjects.Rectangle[] = [];
  private particles: Particle[] = [];
  private giftTrail!: Phaser.GameObjects.Graphics;
  private giftImpacts: {
    sprite: Phaser.GameObjects.Sprite;
    age: number;
    style: "rob" | "santa";
  }[] = [];
  private trackedGifts = new Map<
    number,
    {
      x: number;
      y: number;
      vx: number;
      life: number;
      style: "rob" | "santa";
      seen: number;
    }
  >();
  private effectsMatch: Match | null = null;
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
  private impactFlash!: Phaser.GameObjects.Graphics;
  private impactBursts = Array.from({ length: 8 }, () => ({
    x: 0,
    y: 0,
    age: 1000,
    duration: 100,
    guard: false,
    heavy: false,
  }));
  private strikeTrail!: Phaser.GameObjects.Graphics;
  private debugGraphic!: Phaser.GameObjects.Graphics;
  private framing = initialFraming();
  private aura!: Phaser.GameObjects.Graphics;
  private scenery!: Phaser.GameObjects.Graphics;
  private smoke: Phaser.GameObjects.Ellipse[] = [];
  private inspect!: Phaser.GameObjects.Text;
  private errors: string[] = [];
  get diagnostics() {
    return {
      camera: { ...this.framing },
      giftVisuals: {
        active: this.trackedGifts.size,
        impacts: this.giftImpacts.filter((e) => e.age < 360).length,
        frames: this.missiles
          .filter((s) => s.visible && s.texture.key === "festive-gifts")
          .map((s) => ({ frame: Number(s.frame.name), left: s.flipX })),
      },
      backgrounds: this.layers.map((l) => ({
        x: l.x,
        y: l.y,
        key: l.texture.key,
      })),
      sprites: this.sprites.map((s) => ({
        x: s.x,
        y: s.y,
        originX: s.originX,
        originY: s.originY,
        frame: s.frame.name,
        motion: this.bridge.match
          ? motionPhase(this.bridge.match.fighters[this.sprites.indexOf(s)])
          : "idle",
        texture: s.texture.key,
        bounds: {
          x: s.getBounds().x,
          y: s.getBounds().y,
          w: s.getBounds().width,
          h: s.getBounds().height,
        },
      })),
    };
  }
  constructor(private bridge: SceneBridge) {
    super("Arena");
  }
  preload() {
    this.load.json(
      "hd-catalog",
      `${import.meta.env.BASE_URL}characters/hd/catalog.json`,
    );
    this.load.spritesheet(
      "festive-gifts",
      `${import.meta.env.BASE_URL}atlases/festive-gifts.webp`,
      { frameWidth: 64, frameHeight: 64 },
    );
    for (const id of [
      "jamie",
      "nash",
      "bucket",
      "beardy",
      "frost",
      "rob",
      "santa",
    ])
      this.load.image(
        `atlas-${id}`,
        `${import.meta.env.BASE_URL}atlases/${id}.webp`,
      );
    for (const id of [
      "jamie",
      "nash",
      "bucket",
      "beardy",
      "frost",
      "rob",
      "santa",
    ])
      this.load.image(
        `raw-special-${id}`,
        `${import.meta.env.BASE_URL}atlases/special-${id}.webp`,
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
      "v3-environment",
      `${import.meta.env.BASE_URL}stages/v3-arenas.webp`,
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
    this.hd = new HdBank(
      this,
      this.cache.json.get("hd-catalog")?.fighters ?? {},
    );
    this.events.once("shutdown", () => this.hd.destroy());
    if (this.errors.length) {
      const overlay = document.querySelector<HTMLElement>("#overlay")!;
      overlay.innerHTML =
        '<div class="panel compact" role="alert"><h2>ARTWORK COULDN’T LOAD.</h2><p>Required animation or stage assets are unavailable. Reconnect and retry; no placeholder fighters will be substituted.</p><button id="retry-art" class="primary">RETRY LOADING →</button></div>';
      overlay.querySelector<HTMLButtonElement>("#retry-art")!.onclick = () =>
        window.location.reload();
      return;
    }
    createArt(this, (n) => this.bridge.progress(70 + n * 0.3));
    for (let i = 0; i < 3; i++)
      this.layers.push(
        this.add
          .image(400, stageLayout.y, `stage-0-${i}`)
          .setDisplaySize(stageLayout.width, stageLayout.height),
      );
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
      this.shadows.push(
        [0, 1].map(() =>
          this.add
            .ellipse(0, stageLayout.floor, 32, 7, 0x081326, 0.58)
            .setDepth(4),
        ),
      );
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
    for (const id of [
      "jamie",
      "nash",
      "bucket",
      "beardy",
      "frost",
      "rob",
      "santa",
    ]) {
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
      } else if (id === "beardy") {
        // Original holly-bolt pixel silhouette; no ambiguous defensive bubble.
        for (const [x, y, w, h] of [
          [4, 12, 12, 4],
          [8, 8, 12, 4],
          [12, 4, 8, 4],
          [16, 12, 16, 4],
          [20, 16, 12, 4],
          [24, 20, 8, 4],
        ]) {
          g.fillStyle(0x2d8d58);
          g.fillRect(x, y, w, h);
          g.fillStyle(0xa2df77);
          g.fillRect(x, y, 4, 4);
        }
        g.fillStyle(0xed4f45);
        g.fillRect(12, 16, 8, 4);
        g.fillRect(16, 20, 4, 4);
        g.fillStyle(0xffe2a2);
        g.fillRect(12, 16, 4, 2);
      } else {
        g.fillStyle(col, 0.85);
        g.fillRect(0, 6, 36, 20);
        g.lineStyle(2, 0xf9e9b9);
        g.strokeRect(2, 8, 30, 16);
      }
      if (id === "santa" || id === "rob") {
        g.fillStyle(0xffe4a1);
        g.fillRect(16, 6, 4, 20);
        g.fillRect(0, 14, 36, 3);
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
    this.giftTrail = this.add.graphics().setDepth(6);
    for (let i = 0; i < 12; i++)
      this.giftImpacts.push({
        sprite: this.add
          .sprite(0, 0, "festive-gifts")
          .setDepth(11)
          .setVisible(false),
        age: 360,
        style: "rob",
      });
    this.strikeTrail = this.add.graphics().setDepth(8);
    this.impactFlash = this.add.graphics().setDepth(9);
    this.debugGraphic = this.add.graphics().setDepth(20);
    this.aura = this.add.graphics().setDepth(4);
    this.scenery = this.add.graphics().setDepth(2);
    for (let i = 0; i < 8; i++)
      this.smoke.push(
        this.add
          .ellipse(
            95 + (i % 2) * 5,
            70 - i * 10,
            14 + i * 2,
            9 + i * 2,
            0xc8d3e1,
            0.1,
          )
          .setDepth(2),
      );
    this.inspect = this.add
      .text(8, 112, "", {
        fontFamily: "monospace",
        fontSize: "9px",
        backgroundColor: "#071424",
        color: "#ffdf86",
      })
      .setScrollFactor(1)
      .setDepth(50);
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
    this.layers[0].x = 400;
    this.layers[1].x = 400;
    if (
      this.effectsMatch !== m ||
      this.bridge.combatVisible === false ||
      (m && m.phase !== "fight")
    ) {
      this.trackedGifts.clear();
      if (this.effectsMatch !== m || this.bridge.combatVisible === false)
        for (const b of this.impactBursts) b.age = b.duration;
      for (const effect of this.giftImpacts) {
        effect.age = 360;
        effect.sprite.visible = false;
      }
      this.effectsMatch = m;
    }
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
    this.strikeTrail.clear();
    for (const f of m?.fighters || []) {
      if (
        ["kick", "heavyKick", "low", "air"].includes(f.move || "") &&
        activeHitbox(f)
      ) {
        const box = activeHitbox(f)!;
        const end = f.facing > 0 ? box.x + box.w : box.x;
        const y = f.y + 50 - (f.move === "low" ? 22 : 55);
        for (let k = 0; k < 4; k++)
          this.strikeTrail
            .fillStyle(
              k % 2 ? 0xffe5a0 : 0xe1f7ff,
              this.bridge.reduced ? 0.5 : 0.85,
            )
            .fillRect(end - f.facing * (k * 4 + 2), y - (k % 2) * 3, 3, 2);
      }
    }
    const display = m?.fighters || this.demos;
    this.hd.setFighters(display.map((f) => f.id));
    display.forEach((f, i) => {
      const spr = this.sprites[i];
      const preview = i === 0 ? this.bridge.preview : undefined;
      const signatureThrow =
        f.state === "throwing" &&
        (f.id === "rob" || f.move?.startsWith("special"));
      const special = preview
        ? preview.special
        : signatureThrow ||
          (f.state === "attack" &&
            (f.move?.startsWith("special") || f.move === "super"));
      const hdPose = preview ? undefined : this.hd.pose(f);
      const textureKey = hdPose?.key ?? (special ? `special-${f.id}` : f.id);
      if (spr.texture.key !== textureKey) spr.setTexture(textureKey);
      spr.setOrigin(0.5, 244 / 256);
      const frame = hdPose
        ? hdPose.frame
        : preview
          ? preview.frame
          : animationFrame(f, m ? f.animTick : Math.floor(time / 16.67));
      const position = m ? renderPosition(f, this.bridge.renderAlpha ?? 1) : f;
      spr
        .setFrame(Math.min(frame, spr.texture.frameTotal - 2))
        .setPosition(position.x, position.y + 50)
        .setFlipX(f.facing < 0)
        .setScale(hdPose?.scale ?? 0.75)
        .setDepth(5 + f.y / 1000 + f.x / 100000);
      const metadata = (
        spr.texture.customData as {
          frames?: {
            pivot: { x: number; y: number };
            contacts: { x: number; width: number }[];
          }[];
        }
      ).frames?.[Math.min(frame, spr.texture.frameTotal - 2)];
      if (metadata)
        spr.setOrigin(
          f.facing < 0
            ? 1 - metadata.pivot.x / spr.frame.realWidth
            : metadata.pivot.x / spr.frame.realWidth,
          metadata.pivot.y / spr.frame.realHeight,
        );
      if (hdPose)
        spr.setPosition(
          spr.x + (hdPose.metadata.offset?.[0] ?? 0) * spr.scaleX * f.facing,
          spr.y + (hdPose.metadata.offset?.[1] ?? 0) * spr.scaleY,
        );
      if (f.guardFrames > 0) spr.setTint(0xc4eedc);
      else if (
        (f.state === "hitstun" || f.state === "airHit") &&
        !this.bridge.reduced
      )
        spr.setTint(0xffb2a2);
      else spr.clearTint();
      const height = Math.max(0, stageLayout.floor - spr.y);
      this.shadows[i].forEach((shadow, index) => {
        const contact = metadata?.contacts[index];
        shadow.visible = !!contact;
        if (contact && metadata)
          shadow
            .setPosition(
              spr.x +
                (contact.x - metadata.pivot.x) *
                  (f.facing < 0 ? -spr.scaleX : spr.scaleX),
              stageLayout.floor + 1,
            )
            .setDisplaySize(
              Math.max(14, contact.width * spr.scaleX + 8 + height * 0.08),
              6 + height * 0.015,
            )
            .setAlpha(Math.max(0.16, 0.58 - height / 300));
      });
    });
    this.flakes.forEach((f, i) => {
      f.visible = !this.bridge.reduced;
      if (f.visible) {
        f.y += ((0.12 + (i % 4) * 0.11) * delta) / 16.67;
        f.setDepth(i % 3 === 0 ? 8 : 1);
        f.setAlpha(i % 3 === 0 ? 0.65 : 0.3);
        f.x +=
          Math.sin(time / 2000 + i) * 0.12 + (this.stageId === 5 ? 0.45 : 0);
        if (f.y > 450 || f.x > 805) {
          f.y = -4;
          f.x = (f.x + 137) % 800;
        }
      }
    });
    this.ambientDots.forEach((light, i) => {
      light.visible = this.stageId < 3 || this.stageId >= 5;
      light.alpha = this.bridge.reduced
        ? 0.65
        : 0.4 + Math.sin(time / 400 + i) * 0.3;
      light.setFillStyle(
        this.stageId === 5 ? 0x98eaff : [0xffc966, 0x9feacb, 0xf09076][i % 3],
      );
    });
    this.giftTrail.clear();
    this.missiles.forEach((sprite, i) => {
      const p =
        this.bridge.combatVisible === false ? undefined : m?.projectiles[i];
      sprite.visible = !!p;
      if (!p) return;
      const gift =
        (p.style === "rob" || p.style === "santa") && p.data.kind !== "wave";
      sprite
        .setTexture(
          gift
            ? "festive-gifts"
            : "orb-" +
                (p.style === "santa" && p.data.kind === "wave"
                  ? "frost"
                  : p.style),
        )
        .setFrame(
          gift
            ? giftFrame(
                p.style as "rob" | "santa",
                ((140 - p.life) * 1000) / 60,
              )
            : 0,
        )
        .setPosition(p.x, p.y + 50)
        .setFlipX(p.vx < 0)
        .setScale(gift ? 0.75 : p.data.kind === "wave" ? 1.35 : 1);
      if (gift) {
        let record = this.trackedGifts.get(p.id);
        if (!record) {
          record = {
            x: p.x,
            y: p.y,
            vx: p.vx,
            life: p.life,
            style: p.style as "rob" | "santa",
            seen: time,
          };
          this.trackedGifts.set(p.id, record);
        }
        record.x = p.x;
        record.y = p.y;
        record.life = p.life;
        record.seen = time;
        if (!this.bridge.reduced)
          for (let k = 1; k <= 3; k++) {
            const x = p.x - Math.sign(p.vx) * (k * 11 + 10),
              y = p.y + 50 + Math.sin(time / 150 + k) * 3;
            this.giftTrail
              .fillStyle(
                p.style === "rob" ? 0xd4a856 : k % 2 ? 0xc7f7df : 0xffe299,
                0.5 / k,
              )
              .fillRect(
                Math.round(x),
                Math.round(y),
                p.style === "rob" ? 7 : 3,
                2,
              );
            if (p.style === "santa")
              this.giftTrail.fillRect(
                Math.round(x) + 1,
                Math.round(y) - 2,
                1,
                6,
              );
          }
      }
    });
    for (const [id, p] of this.trackedGifts)
      if (p.seen !== time) {
        if (
          m?.phase === "fight" &&
          this.bridge.combatVisible !== false &&
          p.life > 1 &&
          p.x + p.vx > 0 &&
          p.x + p.vx < 800
        ) {
          const effect =
            this.giftImpacts.find((e) => e.age >= 360) || this.giftImpacts[0];
          effect.age = 0;
          effect.style = p.style;
          effect.sprite
            .setTexture("festive-gifts", giftFrame(p.style, 0, true))
            .setPosition(p.x + p.vx, p.y + 50)
            .setScale(0.9)
            .setFlipX(p.vx < 0)
            .setAlpha(1)
            .setVisible(true);
        }
        this.trackedGifts.delete(id);
      }
    for (const effect of this.giftImpacts)
      if (effect.age < 360) {
        effect.age += delta;
        effect.sprite.setFrame(giftFrame(effect.style, effect.age, true));
        effect.sprite.setAlpha(
          effect.age > 280 ? Math.max(0, (360 - effect.age) / 80) : 1,
        );
        if (effect.age >= 360) effect.sprite.visible = false;
      }
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
          this.bridge.combatVisible !== false &&
          ["hit", "counter", "block"].includes(e.type)
        ) {
          const b =
            this.impactBursts.find((b) => b.age >= b.duration) ??
            this.impactBursts[0];
          b.x = e.x;
          b.y = e.y + 50;
          b.age = 0;
          b.guard = e.type === "block";
          b.heavy = e.strength !== "light";
          b.duration = b.guard ? 85 : b.heavy ? 140 : 95;
        }
        if (
          [
            "hit",
            "block",
            "counter",
            "special",
            "super",
            "projectile",
            "bossPhase",
            "grab",
            "throw",
            "throwBreak",
            "landing",
          ].includes(e.type)
        ) {
          const color =
            e.type === "block"
              ? 0x8fc9e8
              : e.type === "landing"
                ? 0xc4d8e8
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
            p.sprite.setSize(
              e.type === "landing" ? 5 : remaining % 3 === 0 ? 5 : 2,
              e.type === "landing" ? 2 : remaining % 3 === 0 ? 2 : 3,
            );
            if (e.type === "landing") {
              p.vx *= 1.6;
              p.vy = -Math.abs(p.vy) * 0.45;
            }
            p.sprite
              .setPosition(e.x, e.y + 50)
              .setFillStyle(color)
              .setAlpha(1)
              .setVisible(true);
            remaining--;
          }
          if (
            this.bridge.shake !== false &&
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
    if (this.bridge.combatVisible === false)
      for (const p of this.particles) {
        p.life = 0;
        p.sprite.visible = false;
      }
    this.aura.clear();
    this.scenery.clear();
    this.smoke.forEach((s, i) => {
      s.visible = this.stageId === 0;
      s.y = 70 - ((time / 90 + i * 10) % 85);
      s.x = 95 + (this.bridge.reduced ? 0 : Math.sin(time / 1000 + i) * 10);
      s.alpha = this.bridge.reduced ? 0.08 : 0.14;
    });
    if (this.stageId === 1)
      for (let i = 0; i < 9; i++)
        this.scenery
          .fillStyle(0xffd797, 0.06)
          .fillRect(
            290 + Math.sin(time / 1000 + i) * 12,
            200 + i * 6,
            250 - i * 14,
            2,
          );
    if (this.stageId === 2)
      this.scenery
        .fillStyle(
          0xffa34e,
          this.bridge.reduced ? 0.08 : 0.12 + Math.sin(time / 170) * 0.03,
        )
        .fillEllipse(105, 285, 165, 110);
    if (this.stageId === 3)
      for (let i = 0; i < 4; i++)
        this.scenery
          .lineStyle(2, 0x98c4d8, 0.12)
          .lineBetween(
            i * 245,
            80,
            i * 245 + 32 + Math.sin(time / 900 + i) * 2,
            102,
          );
    const boss = m?.fighters.find((f) => f.profile === "boss");
    if (this.stageId >= 5 && boss)
      this.scenery
        .fillStyle(
          boss.id === "santa"
            ? [0xffd27e, 0xf37f93, 0x8adfff][boss.bossPhase]
            : 0x8acfff,
          0.04 + boss.bossPhase * 0.035,
        )
        .fillEllipse(400, 345, 700, 140);
    for (const f of m?.fighters || [])
      if (f.id === "santa" && f.move === "heavyPunch" && f.state === "attack") {
        const x = f.x + f.facing * 45,
          y = f.y - 130;
        this.scenery.lineStyle(7, 0xfff2e0).lineBetween(x, y, x, y + 42);
        for (let k = 0; k < 5; k++)
          this.scenery
            .lineStyle(3, 0xc93548)
            .lineBetween(x - 3, y + k * 8, x + 3, y + k * 8 + 4);
        this.scenery
          .lineStyle(7, 0xfff2e0)
          .strokeCircle(x + f.facing * 6, y, 7);
      }
    const activeSuper =
      this.bridge.combatVisible === false ? undefined : superPresentation(m);
    if (m && activeSuper) {
      const f = activeSuper || m.fighters[m.cinematicPlayer],
        color = fighterById(f.id).color;
      this.aura
        .fillStyle(color, this.bridge.reduced ? 0.08 : 0.16)
        .fillCircle(f.x, f.y - 35, 75);
      this.aura
        .lineStyle(this.bridge.reduced ? 1 : 3, color, 0.65)
        .strokeEllipse(f.x, f.y - 40, 110, 180);
      this.layers.forEach((l) => l.setTint(0x9da8bb));
    } else
      this.layers.forEach((l) => {
        if (this.stageId === 0 && this.bridge.combatVisible !== false)
          l.setTint(0xc2cbd6);
        else l.clearTint();
      });
    const target = m
      ? targetFraming(
          m.fighters,
          this.sprites.map((spr) => {
            const meta = (
              spr.texture.customData as {
                frames?: {
                  bounds: { x: number; y: number; w: number; h: number };
                  pivot: { x: number; y: number };
                }[];
              }
            ).frames?.[Number(spr.frame.name)];
            if (!meta) return spr.getBounds();
            return {
              x:
                spr.x +
                (spr.flipX
                  ? meta.pivot.x - meta.bounds.x - meta.bounds.w
                  : meta.bounds.x - meta.pivot.x) *
                  spr.scaleX,
              y: spr.y + (meta.bounds.y - meta.pivot.y) * spr.scaleY,
              width: meta.bounds.w * spr.scaleX,
              height: meta.bounds.h * spr.scaleY,
            };
          }),
          {
            top: this.bridge.touchLayout ? 98 : 62,
            bottom: this.bridge.touchLayout
              ? (this.bridge.controlSafeBottom ?? 132)
              : 54,
            left: 20,
            right: 20,
          },
        )
      : { x: 400, y: 225, zoom: 1 };
    if (m?.phase === "roundOver" && m.phaseFrame < 30 && !this.bridge.reduced)
      target.zoom = Math.min(1.32, target.zoom * 1.025);
    this.framing = followFraming(
      this.framing,
      target,
      delta,
      this.bridge.reduced,
    );
    this.cameras.main
      .setZoom(this.framing.zoom)
      .centerOn(this.framing.x, this.framing.y);
    const hudPoint = this.cameras.main.getWorldPoint(8, 112);
    this.inspect
      .setPosition(hudPoint.x, hudPoint.y)
      .setScale(1 / this.framing.zoom);
    this.inspect.setVisible(!!this.bridge.debug && import.meta.env.DEV);
    if (import.meta.env.DEV && this.bridge.debug && m)
      this.inspect.setText(
        "SPRITE gold | PUSH purple | HURT green | HIT red | THROW pink | SHOT cyan\n" +
          m.fighters
            .map(
              (f, i) =>
                `${i + 1} ${f.id} ${f.state} frame ${animationFrame(f)} origin ${Math.round(this.sprites[i].originX * 256)},${Math.round(this.sprites[i].originY * 256)}`,
            )
            .join("  |  ") +
          `  CAM ${this.framing.zoom.toFixed(2)}`,
      );
    this.impactFlash.clear();
    for (const b of this.impactBursts) {
      if (b.age >= b.duration) continue;
      b.age += delta;
      const life = Math.max(0, 1 - b.age / b.duration),
        radius = (b.heavy ? 14 : 9) * (1.3 - life * 0.4);
      if (b.guard)
        this.impactFlash
          .lineStyle(2, 0x9ee7ff, life)
          .strokeCircle(b.x, b.y, radius);
      else {
        this.impactFlash
          .fillStyle(0xfff4d5, life)
          .fillCircle(b.x, b.y, this.bridge.reduced ? 2 : 4 * life);
        for (let k = 0; k < 4; k++) {
          const angle = (k * Math.PI) / 2 + 0.45,
            dx = Math.cos(angle),
            dy = Math.sin(angle);
          this.impactFlash
            .lineStyle(b.heavy ? 3 : 2, 0xffd67d, life)
            .lineBetween(
              b.x + dx * 4,
              b.y + dy * 4,
              b.x + dx * radius,
              b.y + dy * radius,
            );
        }
      }
    }
    const hasHd = this.sprites.some((s) => s.texture.key.startsWith("hd:"));
    if (this.game.canvas.classList.contains("has-hd-art") !== hasHd)
      this.game.canvas.classList.toggle("has-hd-art", hasHd);
    this.debugGraphic.clear();
    if (import.meta.env.DEV && this.bridge.debug) {
      const c = this.cameras.main.worldView;
      this.debugGraphic
        .lineStyle(1, 0x52caff)
        .strokeRect(c.x + 2, c.y + 2, c.width - 4, c.height - 4);
    }
    if (import.meta.env.DEV && this.bridge.debug && m) {
      for (const p of m.projectiles)
        this.debugGraphic
          .lineStyle(2, 0x52caff)
          .strokeRect(p.x - p.w / 2, p.y + 50 - p.h / 2, p.w, p.h);
      for (const f of m.fighters) {
        const spr = this.sprites[m.fighters.indexOf(f)],
          bounds = spr.getBounds();
        this.debugGraphic
          .lineStyle(1, 0xf7d366)
          .strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        this.debugGraphic.lineStyle(2, 0xffffff).strokeCircle(f.x, f.y + 50, 3);
        const p = pushbox(f);
        this.debugGraphic
          .lineStyle(1, 0xc891ff)
          .strokeRect(p.x, p.y + 50, p.w, p.h);
        const h = hurtbox(f),
          a = activeHitbox(f);
        this.debugGraphic
          .lineStyle(1, 0x48edaf)
          .strokeRect(h.x, h.y + 50, h.w, h.h);
        if (a) {
          this.debugGraphic
            .lineStyle(2, f.move === "grab" ? 0xff66cc : 0xff795f)
            .strokeRect(a.x, a.y + 50, a.w, a.h);
          const end = f.facing === 1 ? a.x + a.w : a.x;
          this.debugGraphic
            .lineStyle(1, 0xffd37d)
            .lineBetween(f.x, f.y + 50, end, f.y + 50)
            .strokeCircle(end, a.y + 50 + a.h / 2, 3);
        }
      }
    }
  }
}
