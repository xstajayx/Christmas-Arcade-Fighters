import type Phaser from "phaser";
import type { Fighter } from "../combat/engine";
import { combatMove } from "../combat/engine";
import { motionPhase, type MotionPhase } from "./motion";
export interface HdFrame {
  rect: [number, number, number, number];
  pivot: [number, number];
  bounds: [number, number, number, number];
  offset?: [number, number];
  contacts?: { x: number; width: number }[];
  ticks?: number;
  phase?: "startup" | "active" | "recovery";
}
export interface HdClip {
  image: string;
  size: [number, number];
  frames: HdFrame[];
  loop?: boolean;
  stride?: number;
}
export interface HdManifest {
  version: 1;
  referenceHeight: number;
  clips: Partial<Record<MotionPhase, HdClip>>;
}
export function localArtPath(path: string) {
  return (
    /^characters\/hd\/[a-zA-Z0-9_./-]+$/.test(path) &&
    !path.split("/").includes("..")
  );
}
export function validateHd(value: unknown): HdManifest {
  const m = value as HdManifest;
  if (
    m?.version !== 1 ||
    !Number.isFinite(m.referenceHeight) ||
    m.referenceHeight < 256 ||
    m.referenceHeight > 1024 ||
    !m.clips ||
    typeof m.clips !== "object"
  )
    throw Error("Invalid HD fighter manifest");
  for (const clip of Object.values(m.clips)) {
    if (
      !clip ||
      !localArtPath(clip.image) ||
      !Array.isArray(clip.size) ||
      clip.size.length !== 2 ||
      clip.size.some((v) => !Number.isInteger(v) || v < 1 || v > 4096) ||
      clip.size[0] * clip.size[1] > 4194304 ||
      !Array.isArray(clip.frames) ||
      clip.frames.length < 1 ||
      clip.frames.length > 64
    )
      throw Error("Invalid HD clip");
    for (const f of clip.frames) {
      if (
        !Array.isArray(f.rect) ||
        f.rect.length !== 4 ||
        !Array.isArray(f.pivot) ||
        f.pivot.length !== 2 ||
        !Array.isArray(f.bounds) ||
        f.bounds.length !== 4 ||
        [...f.rect, ...f.pivot, ...f.bounds, ...(f.offset ?? [])].some(
          (v) => !Number.isFinite(v),
        )
      )
        throw Error("Invalid HD frame");
      if (
        (f.offset && f.offset.length !== 2) ||
        (f.phase && !["startup", "active", "recovery"].includes(f.phase)) ||
        f.contacts?.some(
          (c) =>
            !Number.isFinite(c.x) || !Number.isFinite(c.width) || c.width <= 0,
        )
      )
        throw Error("Invalid HD anchors or phase");
      const [x, y, w, h] = f.rect,
        [bx, by, bw, bh] = f.bounds;
      if (
        x < 0 ||
        y < 0 ||
        w <= 0 ||
        h <= 0 ||
        x + w > clip.size[0] ||
        y + h > clip.size[1] ||
        bx < 0 ||
        by < 0 ||
        bw <= 0 ||
        bh <= 0 ||
        bx + bw > w ||
        by + bh > h ||
        f.pivot[0] < 0 ||
        f.pivot[0] > w ||
        f.pivot[1] < 0 ||
        f.pivot[1] > h ||
        (f.ticks !== undefined &&
          (!Number.isInteger(f.ticks) || f.ticks < 1 || f.ticks > 60))
      )
        throw Error("HD crop, pivot or duration outside frame");
    }
  }
  for (const clip of Object.values(m.clips))
    if (clip!.frames.some((f) => f.phase))
      for (const phase of ["startup", "active", "recovery"])
        if (!clip!.frames.some((f) => f.phase === phase))
          throw Error("HD attack needs startup, active and recovery poses");
  return m;
}
const timelines = new WeakMap<
  HdClip,
  { total: number; stages: Record<string, number[]> }
>();
function timeline(clip: HdClip) {
  let t = timelines.get(clip);
  if (!t) {
    t = { total: 0, stages: { startup: [], active: [], recovery: [] } };
    clip.frames.forEach((f, i) => {
      t!.total += f.ticks ?? 5;
      if (f.phase) t!.stages[f.phase].push(i);
    });
    timelines.set(clip, t);
  }
  return t;
}
export function hdFrame(f: Fighter, clip: HdClip) {
  const clock = timeline(clip);
  if (f.state === "attack" && f.move && clock.stages.active.length) {
    const d = combatMove(f, f.move),
      phase =
        f.frame < d.startup
          ? "startup"
          : f.frame < d.startup + d.active
            ? "active"
            : "recovery";
    const frames = clock.stages[phase];
    if (frames.length) {
      const age =
          phase === "startup"
            ? f.frame
            : phase === "active"
              ? f.frame - d.startup
              : f.frame - d.startup - d.active,
        total =
          phase === "startup"
            ? d.startup
            : phase === "active"
              ? d.active
              : d.recovery;
      return frames[
        Math.min(
          frames.length - 1,
          Math.floor((age / Math.max(1, total)) * frames.length),
        )
      ];
    }
  }
  const total = clock.total;
  let time =
    f.state === "walk" || f.state === "dash"
      ? Math.floor((f.walkDistance / (clip.stride ?? 96)) * total)
      : f.state === "idle"
        ? f.animTick
        : f.frame;
  time = clip.loop ? time % total : Math.min(total - 1, time);
  for (let i = 0; i < clip.frames.length; i++) {
    time -= clip.frames[i].ticks ?? 5;
    if (time < 0) return i;
  }
  return clip.frames.length - 1;
}
// Lazy per-fighter manifests and per-clip sheets; retain at most eight decoded
// clips for the active pair. No whole-roster HD download and no upscaled fallback.
export class HdBank {
  private manifests = new Map<string, HdManifest>();
  private requested = new Set<string>();
  private sheets = new Map<string, { clip: HdClip; used: number }>();
  private pending = new Set<string>();
  private active = new Set<string>();
  private dead = false;
  private roster = "";
  private failed = new Set<string>();
  private onFailure = (file: Phaser.Loader.File) => {
    if (!this.pending.has(file.key)) return;
    const handler = this.listeners.get(file.key);
    if (handler) this.scene.load.off(`filecomplete-image-${file.key}`, handler);
    this.pending.delete(file.key);
    this.listeners.delete(file.key);
    this.failed.add(file.key);
  };
  private listeners = new Map<string, () => void>();
  constructor(
    private scene: Phaser.Scene,
    private catalog: Record<string, string> = {},
  ) {
    this.scene.load.on("loaderror", this.onFailure);
  }
  setFighters(ids: readonly string[]) {
    const roster = ids.join(":");
    if (this.roster === roster) return;
    this.roster = roster;
    this.active = new Set(ids);
    for (const id of ids)
      if (this.catalog[id] && !this.requested.has(id)) {
        this.requested.add(id);
        const path = this.catalog[id];
        if (!localArtPath(path)) continue;
        void fetch(import.meta.env.BASE_URL + path)
          .then((r) => {
            if (!r.ok) throw Error("HD manifest unavailable");
            return r.json();
          })
          .then((value) => {
            if (!this.dead) this.manifests.set(id, validateHd(value));
          })
          .catch(() => {});
      }
    for (const [key] of this.sheets)
      if (!ids.some((id) => key.startsWith(`hd:${id}:`))) {
        this.scene.textures.remove(key);
        this.sheets.delete(key);
      }
  }
  pose(f: Fighter) {
    const manifest = this.manifests.get(f.id),
      phase = motionPhase(f),
      clip = manifest?.clips[phase];
    if (!clip || !manifest) return;
    const key = `hd:${f.id}:${phase}`;
    let sheet = this.sheets.get(key);
    if (!sheet && !this.pending.has(key) && !this.failed.has(key)) {
      this.pending.add(key);
      const complete = () => {
        this.listeners.delete(key);
        this.pending.delete(key);
        if (this.dead) return;
        const tex = this.scene.textures.get(key),
          src = tex.getSourceImage() as HTMLImageElement;
        if (src.width !== clip.size[0] || src.height !== clip.size[1]) {
          this.scene.textures.remove(key);
          this.failed.add(key);
          return;
        }
        clip.frames.forEach((f, i) => tex.add(i, 0, ...f.rect));
        tex.setFilter(0); // Phaser.Textures.FilterMode.LINEAR; legacy textures stay nearest.
        tex.customData = {
          frames: clip.frames.map((f) => ({
            bounds: {
              x: f.bounds[0],
              y: f.bounds[1],
              w: f.bounds[2],
              h: f.bounds[3],
            },
            pivot: { x: f.pivot[0], y: f.pivot[1] },
            contacts: f.contacts ?? [],
          })),
        };
        if (!this.active.has(f.id)) {
          this.scene.textures.remove(key);
          return;
        }
        this.sheets.set(key, { clip, used: performance.now() });
        while (
          this.sheets.size > 8 ||
          [...this.sheets.values()].reduce(
            (n, s) => n + s.clip.size[0] * s.clip.size[1] * 4,
            0,
          ) >
            32 * 1024 * 1024
        ) {
          const oldest = [...this.sheets]
            .filter(([k]) => k !== key)
            .sort((a, b) => a[1].used - b[1].used)[0]?.[0];
          if (!oldest) break;
          this.scene.textures.remove(oldest);
          this.sheets.delete(oldest);
        }
      };
      this.listeners.set(key, complete);
      this.scene.load.once(`filecomplete-image-${key}`, complete);
      this.scene.load.image(key, import.meta.env.BASE_URL + clip.image);
      if (!this.scene.load.isLoading()) this.scene.load.start();
      return;
    }
    sheet = this.sheets.get(key);
    if (!sheet) return;
    sheet.used = performance.now();
    const frame = hdFrame(f, clip);
    return {
      key,
      frame,
      metadata: clip.frames[frame],
      scale: 170 / manifest.referenceHeight,
    };
  }
  destroy() {
    this.dead = true;
    this.scene.load.off("loaderror", this.onFailure);
    for (const [key, fn] of this.listeners)
      this.scene.load.off(`filecomplete-image-${key}`, fn);
    this.listeners.clear();
    this.pending.clear();
    for (const [key] of this.sheets) this.scene.textures.remove(key);
    this.sheets.clear();
    this.manifests.clear();
  }
}
