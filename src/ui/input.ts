import type { Input } from "../combat/engine";
export const p2Keys: Record<string, string> = {
  left: "ArrowLeft",
  right: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
  punch: "Numpad1",
  kick: "Numpad2",
  block: "Numpad3",
  special: "Numpad5",
  grab: "Numpad0",
};
export class Controls {
  keys = new Set<string>();
  touch = new Map<number, string>();
  mapping: Record<string, string>;
  onPause = () => {};
  onNavigate = (_direction: string) => {};
  private padPause = false;
  private padNav = false;
  constructor(mapping: Record<string, string>) {
    this.mapping = mapping;
    window.addEventListener("keydown", (e) => {
      const editing = (e.target as HTMLElement).matches("input,select");
      if (editing) return;
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code,
        )
      )
        e.preventDefault();
      this.keys.add(e.code);
      if (e.code === "Escape" && !e.repeat) this.onPause();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.clear());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clear();
    });
  }
  clear() {
    this.keys.clear();
    this.touch.clear();
    document
      .querySelectorAll(".touch-key")
      .forEach((el) => el.classList.remove("pressed"));
  }
  get(index = 0): Input {
    const map = index === 0 ? this.mapping : p2Keys;
    const out: Input = {};
    for (const [action, code] of Object.entries(map))
      if (
        this.keys.has(code) ||
        (index === 0 && [...this.touch.values()].includes(action))
      )
        (out as Record<string, boolean>)[action] = true;
    const pads = Array.from(navigator.getGamepads?.() || []).filter(
      (p): p is Gamepad => !!p,
    );
    const pad = pads[index];
    if (pad) {
      const b = (n: number) => pad.buttons[n]?.pressed;
      out.left ||= pad.axes[0] < -0.35 || b(14);
      out.right ||= pad.axes[0] > 0.35 || b(15);
      out.up ||= pad.axes[1] < -0.5 || b(12);
      out.down ||= pad.axes[1] > 0.5 || b(13);
      out.punch ||= b(0);
      out.kick ||= b(1);
      out.block ||= b(4);
      out.special ||= b(3);
      out.grab ||= b(2);
    }
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
    container.innerHTML = `<div class="dpad"><button class="touch-key up" data-action="up" aria-label="Jump">▲</button><button class="touch-key left" data-action="left" aria-label="Move left">◀</button><span class="dpad-center">✦</span><button class="touch-key right" data-action="right" aria-label="Move right">▶</button><button class="touch-key down" data-action="down" aria-label="Crouch">▼</button></div><div class="actions"><button class="touch-key grab" data-action="grab">G<span>GRAB</span></button><button class="touch-key block" data-action="block">B<span>BLOCK</span></button><button class="touch-key punch" data-action="punch">P<span>PUNCH</span></button><button class="touch-key kick" data-action="kick">K<span>KICK</span></button><button class="touch-key special" data-action="special">✦<span>SPECIAL</span></button></div>`;
    for (const b of container.querySelectorAll<HTMLButtonElement>(
      "[data-action]",
    )) {
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        this.touch.set(e.pointerId, b.dataset.action!);
        b.classList.add("pressed");
      });
      const release = (e: PointerEvent) => {
        this.touch.delete(e.pointerId);
        if (![...this.touch.values()].includes(b.dataset.action!))
          b.classList.remove("pressed");
      };
      b.addEventListener("pointerup", release);
      b.addEventListener("pointercancel", release);
      b.addEventListener("lostpointercapture", release);
    }
  }
}
