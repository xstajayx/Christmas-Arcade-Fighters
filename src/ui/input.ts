import { defaultPadButtons } from "./bindings";
import type { Input } from "../combat/engine";
export const p2Keys: Record<string, string> = {
  left: "ArrowLeft",
  right: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
  punch: "Numpad1",
  kick: "Numpad2",
  special: "Numpad5",
  grab: "Numpad0",
  special2: "Numpad6",
  super: "Numpad4",
};
export class Controls {
  padMapping: Record<string, number> = { ...defaultPadButtons };
  keys = new Set<string>();
  touch = new Map<number, string>();
  mapping: Record<string, string>;
  onPause = () => {};
  onNavigate = (_direction: string) => {};
  private padPause = false;
  private padNav = false;
  private touchHeld = new Set<string>();
  private keyLatched = new Set<string>();
  private touchLatched = new Set<string>();
  constructor(mapping: Record<string, string>) {
    this.mapping = mapping;
    window.addEventListener("keydown", (e) => {
      if (e.target instanceof Element && e.target.matches("input,select"))
        return;
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code,
        )
      )
        e.preventDefault();
      this.keys.add(e.code);
      this.keyLatched.add(e.code);
      if (e.code === "Escape" && !e.repeat) this.onPause();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.clear());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clear();
    });
  }
  private refresh() {
    const before = new Set(this.touchHeld);
    this.touchHeld.clear();
    for (const value of this.touch.values())
      for (const action of value.split(","))
        if (action) this.touchHeld.add(action);
    for (const action of this.touchHeld)
      if (!before.has(action)) this.touchLatched.add(action);
    document
      .querySelectorAll<HTMLElement>(".touch-key")
      .forEach((el) =>
        el.classList.toggle(
          "pressed",
          this.touchHeld.has(el.dataset.action || ""),
        ),
      );
  }
  clear() {
    this.keys.clear();
    this.keyLatched.clear();
    this.touchLatched.clear();
    this.touch.clear();
    this.refresh();
    document.documentElement.style.setProperty("--joy-x", "0px");
    document.documentElement.style.setProperty("--joy-y", "0px");
  }
  get(index = 0): Input {
    const map = index === 0 ? this.mapping : p2Keys,
      out: Input = {};
    for (const [action, code] of Object.entries(map))
      if (
        this.keys.has(code) ||
        this.keyLatched.has(code) ||
        (index === 0 &&
          (this.touchHeld.has(action) || this.touchLatched.has(action)))
      )
        (out as Record<string, boolean>)[action] = true;
    out.heavy = this.keys.has(index === 0 ? "ShiftLeft" : "Numpad8");
    out.dash = this.keys.has(index === 0 ? "ShiftRight" : "Numpad9");
    const pads = Array.from(navigator.getGamepads?.() || []).filter(
      (p): p is Gamepad => !!p,
    );
    const pad = pads[index];
    if (pad) {
      const b = (n: number) => !!pad.buttons[n]?.pressed;
      out.left ||= pad.axes[0] < -0.35 || b(14);
      out.right ||= pad.axes[0] > 0.35 || b(15);
      out.up ||= pad.axes[1] < -0.5 || b(12);
      out.down ||= pad.axes[1] > 0.5 || b(13);
      for (const [action, button] of Object.entries(this.padMapping))
        if (b(button)) (out as Record<string, boolean>)[action] = true;
      out.heavy ||= b(7);
      out.dash ||= b(6);
    }
    for (const code of Object.values(map)) this.keyLatched.delete(code);
    if (index === 0) this.touchLatched.clear();
    return out;
  }
  pollMenu() {
    const pad = Array.from(navigator.getGamepads?.() || []).find((p) => p);
    if (!pad) return;
    const pause = !!pad.buttons[9]?.pressed;
    if (pause && !this.padPause) this.onPause();
    this.padPause = pause;
    const down = pad.axes[1] > 0.5 || pad.buttons[13]?.pressed,
      up = pad.axes[1] < -0.5 || pad.buttons[12]?.pressed,
      select = pad.buttons[0]?.pressed,
      left = pad.axes[0] < -0.5 || pad.buttons[14]?.pressed,
      right = pad.axes[0] > 0.5 || pad.buttons[15]?.pressed;
    const nav = !!(down || up || left || right || select);
    if (nav && !this.padNav)
      this.onNavigate(
        select ? "select" : down ? "down" : up ? "up" : left ? "left" : "right",
      );
    this.padNav = nav;
  }
  mountTouch(container: HTMLElement) {
    container.innerHTML = `<div class="dpad joystick" aria-label="Virtual joystick"><button class="touch-key up" data-action="up" aria-label="Jump">▲</button><button class="touch-key left" data-action="left" aria-label="Move left">◀</button><span class="dpad-center joystick-knob"></span><button class="touch-key right" data-action="right" aria-label="Move right">▶</button><button class="touch-key down" data-action="down" aria-label="Crouch">▼</button></div><div class="actions"><button class="touch-key super" data-action="super">★<span>SUPER</span></button><button class="touch-key grab" data-action="grab">G<span>GRAB</span></button><button class="touch-key punch" data-action="punch">P<span>PUNCH</span></button><button class="touch-key kick" data-action="kick">K<span>KICK</span></button><button class="touch-key special" data-action="special" aria-label="SP1 Dash">SP1<span>DASH</span></button><button class="touch-key special2" data-action="special2" aria-label="SP2 Projectile">SP2<span>SHOT</span></button></div>`;
    const joy = container.querySelector<HTMLElement>(".joystick")!;
    const move = (e: PointerEvent) => {
      const r = joy.getBoundingClientRect(),
        x = (e.clientX - r.left - r.width / 2) / (r.width / 2),
        y = (e.clientY - r.top - r.height / 2) / (r.height / 2),
        actions = [];
      if (x < -0.25) actions.push("left");
      if (x > 0.25) actions.push("right");
      if (y < -0.3) actions.push("up");
      if (y > 0.3) actions.push("down");
      this.touch.set(e.pointerId, actions.join(","));
      document.documentElement.style.setProperty(
        "--joy-x",
        Math.max(-30, Math.min(30, x * 30)) + "px",
      );
      document.documentElement.style.setProperty(
        "--joy-y",
        Math.max(-30, Math.min(30, y * 30)) + "px",
      );
      this.refresh();
    };
    joy.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      joy.setPointerCapture(e.pointerId);
      move(e);
    });
    joy.addEventListener("pointermove", (e) => {
      if (joy.hasPointerCapture(e.pointerId)) move(e);
    });
    const releaseJoy = (e: PointerEvent) => {
      this.touch.delete(e.pointerId);
      this.refresh();
      document.documentElement.style.setProperty("--joy-x", "0px");
      document.documentElement.style.setProperty("--joy-y", "0px");
    };
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      joy.addEventListener(event, releaseJoy as EventListener);
    for (const b of container.querySelectorAll<HTMLButtonElement>(
      ".actions [data-action]",
    )) {
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        this.touch.set(e.pointerId, b.dataset.action!);
        this.refresh();
      });
      const release = (e: PointerEvent) => {
        this.touch.delete(e.pointerId);
        this.refresh();
      };
      b.addEventListener("pointerup", release);
      b.addEventListener("pointercancel", release);
      b.addEventListener("lostpointercapture", release);
    }
  }
}
