import Phaser from "phaser";
import { createArt } from "../art/pixel";
import type { Fighter, Match, Input } from "../combat/engine";
import { fighterById } from "../fighters/data";
export interface SceneBridge {
  match: Match | null;
  stage: number;
  reduced: boolean;
  update: (delta: number) => void;
  ready: () => void;
  progress: (value: number) => void;
}
export class Arena extends Phaser.Scene {
  private sprites: Phaser.GameObjects.Sprite[] = [];
  private layers: Phaser.GameObjects.Image[] = [];
  private flakes: Phaser.GameObjects.Rectangle[] = [];
  private fairyLights: Phaser.GameObjects.Rectangle[] = [];
  private conveyor: Phaser.GameObjects.Container[] = [];
  private wheelLights: Phaser.GameObjects.Rectangle[] = [];
  private stageId = -1;
  private bridge: SceneBridge;
  constructor(bridge: SceneBridge) {
    super("Arena");
    this.bridge = bridge;
  }
  create() {
    createArt(this, this.bridge.progress);
    for (let i = 0; i < 3; i++)
      this.layers.push(this.add.image(400, 225, "stage-0-" + i));
    for (let i = 0; i < 7; i++) {
      const gift = this.add.container(i * 120, 309, [
        this.add.rectangle(0, 0, 24, 22, [0xb64d59, 0x588d79, 0xc3a05d][i % 3]),
        this.add.rectangle(0, 0, 4, 22, 0xf2d297),
        this.add.rectangle(0, -8, 26, 3, 0xf2d297),
      ]);
      this.conveyor.push(gift);
    }
    for (let i = 0; i < 12; i++) {
      this.wheelLights.push(this.add.rectangle(0, 0, 4, 4, 0xffd083));
    }
    for (let i = 0; i < 2; i++) {
      this.add.ellipse(0, 350, 85, 12, 0x0c1429, 0.65).setName("shadow" + i);
      this.sprites.push(
        this.add
          .sprite(0, 350, i ? "bucket" : "jamie")
          .setOrigin(0.5, 0.97)
          .setScale(1.45),
      );
    }
    for (let i = 0; i < 70; i++)
      this.flakes.push(
        this.add.rectangle(
          (i * 83) % 800,
          (i * 47) % 450,
          i % 4 === 0 ? 3 : 2,
          i % 4 === 0 ? 3 : 2,
          0xe2f1ff,
          0.3 + (i % 5) * 0.12,
        ),
      );
    for (let i = 0; i < 9; i++)
      this.fairyLights.push(
        this.add.rectangle(344 + i * 14, 240 + (i % 3) * 15, 3, 3, 0xffd47b),
      );
    this.bridge.ready();
  }
  update(time: number, delta: number) {
    this.bridge.update(delta);
    if (this.stageId !== this.bridge.stage) {
      this.stageId = this.bridge.stage;
      this.layers.forEach((l, i) => l.setTexture(`stage-${this.stageId}-${i}`));
    }
    const m = this.bridge.match;
    const cam = m
      ? ((m.fighters[0].x + m.fighters[1].x) / 2 - 400) / 25
      : Math.sin(time / 6000) * 2;
    this.layers[0].x = 400 - cam * 0.3;
    this.layers[1].x = 400 - cam * 0.7;
    this.conveyor.forEach((gift, i) => {
      gift.visible = this.stageId === 2;
      gift.x = this.bridge.reduced
        ? i * 120
        : ((i * 120 + time / 65) % 840) - 20;
    });
    this.wheelLights.forEach((light, i) => {
      light.visible = this.stageId === 1;
      const angle =
        (i * Math.PI) / 6 + (this.bridge.reduced ? 0 : time / 16000);
      light.setPosition(620 + Math.cos(angle) * 67, 210 + Math.sin(angle) * 67);
    });
    const display = m?.fighters || [
      this.demo("jamie", 150, 1, time),
      this.demo("bucket", 650, -1, time),
    ];
    display.forEach((f, i) => {
      const spr = this.sprites[i];
      spr.setTexture(f.id);
      let frame = 0;
      if (f.state === "walk") frame = Math.floor(time / 120) % 2;
      if (f.state === "idle") frame = Math.floor(time / 500) % 2;
      if (f.state === "crouch") frame = 2;
      if (f.state === "jump") frame = 3;
      if (f.state === "attack") {
        frame =
          f.move === "special"
            ? 8
            : f.move === "kick" || f.move === "air" || f.move === "low"
              ? 5
              : 4;
        if (f.frame < 5) frame = 9;
      }
      if (f.state === "block") frame = 6;
      if (f.state === "hitstun" || f.state === "knockdown") frame = 7;
      if (f.state === "victory") frame = 10;
      if (f.state === "defeat") frame = 11;
      spr
        .setFrame(frame)
        .setPosition(f.x, f.y + 50)
        .setFlipX(f.facing < 0);
      const sh = this.children.getByName(
        "shadow" + i,
      ) as Phaser.GameObjects.Ellipse;
      sh.setPosition(f.x, 350).setScale(Math.max(0.4, 1 - (300 - f.y) / 200));
      if (
        f.state === "hitstun" &&
        !this.bridge.reduced &&
        Math.floor(time / 60) % 2
      )
        spr.setTint(0xff9c90);
      else spr.clearTint();
    });
    this.flakes.forEach((f, i) => {
      f.visible = !this.bridge.reduced;
      if (!this.bridge.reduced) {
        f.y += ((0.18 + (i % 4) * 0.1) * delta) / 16.67;
        f.x += Math.sin(time / 2000 + i) * 0.12;
        if (f.y > 450) {
          f.y = -4;
          f.x = (f.x + 137) % 800;
        }
      }
    });
    this.fairyLights.forEach((l, i) => {
      l.visible = this.stageId === 0;
      l.alpha = this.bridge.reduced ? 1 : 0.4 + Math.sin(time / 200 + i) * 0.6;
    });
    if (m)
      for (const event of m.events) {
        if (
          event.type === "hit" ||
          event.type === "block" ||
          event.type === "special"
        ) {
          const col =
            event.type === "block"
              ? 0x78c9ed
              : event.type === "special"
                ? fighterById(m.fighters[event.player || 0].id).color
                : 0xffd47c;
          for (let i = 0; i < (this.bridge.reduced ? 3 : 12); i++) {
            const particle = this.add
              .rectangle(event.x, event.y + 50, 3 + (i % 3) * 2, 3, col)
              .setDepth(5);
            this.tweens.add({
              targets: particle,
              x: particle.x + Math.cos(i * 2.4) * 35,
              y: particle.y + Math.sin(i * 2.4) * 35,
              alpha: 0,
              duration: 260,
              onComplete: () => particle.destroy(),
            });
          }
          if (event.type === "hit" && !this.bridge.reduced)
            this.cameras.main.shake(65, 0.002);
        }
      }
  }
  private demo(
    id: Fighter["id"],
    x: number,
    facing: 1 | -1,
    time: number,
  ): Fighter {
    return {
      id,
      x,
      y: 300,
      vy: 0,
      facing,
      health: 100,
      meter: 0,
      state: "idle",
      frame: Math.floor(time / 500) % 2,
      move: null,
      hit: false,
      stun: 0,
      combo: 0,
      comboAge: 0,
      juggles: 0,
      buffer: null,
      previous: {} as Input,
      wins: 0,
      score: 0,
    };
  }
}
