import Phaser from "phaser";
import "./style.css";
import { Arena, type SceneBridge } from "./scenes/Arena";
import { fighters, fighterById, type FighterId } from "./fighters/data";
import { createMatch, step, type Match } from "./combat/engine";
import { CPU, type Dummy } from "./ai/cpu";
import { Sound } from "./audio/sound";
import { Controls } from "./ui/input";
import { loadSave, persist, defaultKeys } from "./config/storage";
import { stageNames, stageSubtitles } from "./art/pixel";
type Screen =
  | "title"
  | "menu"
  | "select"
  | "stage"
  | "tutorial"
  | "match"
  | "pause"
  | "settings"
  | "results"
  | "ending";
type Mode = "arcade" | "versus" | "training";
const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
const overlay = $("#overlay"),
  hud = $("#hud"),
  touch = $("#touch-controls");
const save = loadSave(),
  sound = new Sound(),
  controls = new Controls(save.settings.keys);
let screen: Screen = "title",
  previous: Screen = "menu",
  mode: Mode = "arcade",
  chosen: FighterId = "jamie",
  opponent: FighterId = "bucket",
  stage = 0,
  arcadeIndex = save.progress,
  match: Match | null = null,
  paused = false,
  accumulator = 0,
  dummy: Dummy = "stand",
  cpu = new CPU(save.settings.difficulty),
  lastPhase = "",
  stats = { hits: 0, damage: 0 },
  remapping: string | null = null,
  completed = false;
const bridge: SceneBridge = {
  match: null,
  stage: 0,
  reduced: save.settings.reduced,
  update: tick,
  progress: (value) => {
    const bar = overlay.querySelector("progress");
    if (bar) bar.value = value;
  },
  ready: () => {
    if (screen === "title") showTitle();
  },
};
function applySettings() {
  sound.music = save.settings.music;
  sound.effects = save.settings.effects;
  sound.muted = save.settings.muted;
  bridge.reduced = save.settings.reduced;
  controls.mapping = save.settings.keys;
  document.documentElement.style.setProperty(
    "--control-scale",
    String(save.settings.controlSize),
  );
  $("#sound-toggle").classList.toggle("is-muted", sound.muted);
  $("#sound-toggle").setAttribute("aria-pressed", String(sound.muted));
  persist(save);
}
applySettings();
overlay.innerHTML =
  '<div class="loading"><span class="eyebrow">NORTH STAR ARCADE</span><h1>WARMING UP THE ARCADE</h1><progress max="100" value="0"></progress><p>Building pixels, packing snowballs…</p></div>';
window.addEventListener("error", (event) => {
  if (overlay.querySelector(".loading")) {
    const loading = overlay.querySelector(".loading")!;
    loading.innerHTML =
      "<h1>THE ARCADE COULDN’T START</h1><p>Please reload. If this continues, check the browser console for the asset or graphics error.</p>";
    console.error("Boot failure", event.error);
  }
});
export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 800,
  height: 450,
  backgroundColor: "#14213b",
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [new Arena(bridge)],
  audio: { noAudio: true },
  render: { powerPreference: "low-power" },
});
controls.mountTouch(touch);
function button(text: string, action: string, cls = "") {
  return `<button class="${cls}" data-action="${action}">${text}</button>`;
}
function chip(text: string) {
  return `<span class="eyebrow">${text}</span>`;
}
function setScreen(s: Screen, html: string) {
  screen = s;
  overlay.innerHTML = html;
  overlay.className = s;
  overlay.hidden = s === "match";
  hud.hidden = s !== "match";
  touch.hidden = s !== "match";
  controls.clear();
  if (s !== "match")
    setTimeout(
      () =>
        overlay
          .querySelector<HTMLButtonElement>("button:not([disabled])")
          ?.focus({ preventScroll: true }),
      0,
    );
}
function showTitle() {
  paused = false;
  match = null;
  bridge.match = null;
  bridge.stage = 0;
  setScreen(
    "title",
    `<div class="title-vignette"></div><div class="title-content">${chip('<span class="tiny-star">✦</span> THE HOLIDAYS JUST GOT COMPETITIVE')}<div class="title-holly">✦ <span>✶</span> ✦</div><h1 class="game-title"><span>CHRISTMAS</span><span>ARCADE <em>FIGHTERS</em></span></h1><p class="title-tagline">A little festive spirit. A lot of fighting spirit.</p><div class="title-cta">${button("LET’S FIGHT <span>↗</span>", "menu", "primary large")}${button("HOW TO PLAY <span>⌘</span>", "how", "secondary")}</div><div class="title-features"><span>4 ORIGINAL FIGHTERS</span><b>✦</b><span>4 FESTIVE STAGES</span><b>✦</b><span>ENDLESS RIVALRY</span></div></div><div class="title-bottom"><div><span class="live-dot"></span> FREE TO PLAY. BUILT FOR THE GOOD TIMES.</div><div>1–2 PLAYERS <span>•</span> LOCAL PLAY</div></div>`,
  );
}
function showMenu() {
  setScreen(
    "menu",
    `<div class="panel menu-panel">${chip("PICK YOUR CHRISTMAS TRADITION")}<h2>CHOOSE YOUR FIGHT.</h2><p>Good cheer. Friendly rivalry. Questionable knitwear.</p><div class="mode-grid">${button("<b>01 <i>✦</i></b><strong>ARCADE</strong><span>Four fighters. One festive champion.</span><small>VS CPU →</small>", "arcade", "mode-card")}${button("<b>02 <i>⚔</i></b><strong>VERSUS</strong><span>Settle it with someone on the sofa.</span><small>LOCAL 2 PLAYER →</small>", "versus", "mode-card")}${button("<b>03 <i>◎</i></b><strong>TRAINING</strong><span>Find your feet. Perfect your punch.</span><small>FREE PRACTICE →</small>", "training", "mode-card")}</div><div class="panel-footer">${button("← BACK", "title", "text-btn")}<span>PERSONAL BEST <strong>${String(save.highScore).padStart(6, "0")}</strong></span>${button("SETTINGS ⚙", "settings", "text-btn")}</div></div>`,
  );
}
function portrait(id: FighterId) {
  const canvas = document.createElement("canvas");
  canvas.width = 112;
  canvas.height = 128;
  const texture = game?.textures.get(id).getSourceImage() as
    HTMLCanvasElement | undefined;
  if (texture)
    canvas.getContext("2d")!.drawImage(texture, 0, 0, 112, 128, 0, 0, 112, 128);
  return canvas.toDataURL();
}
function select() {
  setScreen(
    "select",
    `<div class="panel select-panel">${chip(mode === "versus" ? "LOCAL RIVALRY" : "MEET THE NAUGHTY LIST")}<h2>CHOOSE YOUR FIGHTER.</h2><div class="fighters-grid">${fighters.map((f) => `<button class="fighter-card ${f.id === chosen ? "selected" : ""}" style="--fighter:${"#" + f.color.toString(16)}" data-action="pick-${f.id}" aria-pressed="${f.id === chosen}"><span class="fighter-number">0${fighters.indexOf(f) + 1}</span><img src="${portrait(f.id)}" alt="Pixel portrait of ${f.name}"><strong>${f.name}</strong><small>${f.title}</small><span class="select-marker">${f.id === chosen ? "PLAYER 1" : "SELECT"}</span></button>`).join("")}</div><div class="fighter-detail"><div><h3>${chosen.toUpperCase()} <span>${fighterById(chosen).special}</span></h3><p>${fighterById(chosen).bio}</p></div><div class="fighter-stats">${["POWER", "SPEED", "DEFENCE"].map((label, i) => `<span>${label} <b>${"▰".repeat(fighterById(chosen).stats[i])}<i>${"▱".repeat(5 - fighterById(chosen).stats[i])}</i></b></span>`).join("")}</div></div><div class="panel-footer">${button("← MODES", "menu", "text-btn")}${mode === "arcade" ? `<label>CPU DIFFICULTY <select id="select-difficulty">${["easy", "normal", "hard"].map((d) => `<option ${save.settings.difficulty === d ? "selected" : ""}>${d}</option>`).join("")}</select></label>` : `<label>${mode === "versus" ? "PLAYER 2" : "OPPONENT"} <select id="opponent">${fighters.map((f) => `<option value="${f.id}" ${f.id === opponent ? "selected" : ""}>${f.name}</option>`).join("")}</select></label>`}${button("CHOOSE STAGE →", "stages", "primary")}</div>${mode === "versus" ? '<p class="versus-note">P1: WASD + J/K/L/I/U · P2: arrows + numpad 1/2/3/5/0. Two gamepads also supported. A numpad or second gamepad is required for independent P2 attacks.</p>' : ""}</div>`,
  );
  if (mode === "arcade")
    $("#select-difficulty").onchange = (e) => {
      save.settings.difficulty = (e.target as HTMLSelectElement)
        .value as typeof save.settings.difficulty;
      applySettings();
    };
  else
    $("#opponent").addEventListener(
      "change",
      (e) => (opponent = (e.target as HTMLSelectElement).value as FighterId),
    );
}
function stages() {
  setScreen(
    "stage",
    `<div class="panel">${chip("EVERY CORNER HAS A STORY")}<h2>TAKE IT OUTSIDE.</h2><div class="stage-grid">${stageNames.map((name, i) => `<button data-action="stage-${i}" class="stage-card ${stage === i ? "selected" : ""}"><span class="stage-preview stage-${i}"><img src="${stageImage(i)}" alt="${name} pixel scenery"></span><small>STAGE 0${i + 1}</small><strong>${name}</strong><span>${stageSubtitles[i]}</span></button>`).join("")}</div><div class="panel-footer">${button("← FIGHTERS", "select", "text-btn")}<span>${mode === "training" ? "NO TIMER. NO PRESSURE." : "BEST OF THREE · 99 SECONDS"}</span>${button("START FIGHT →", "start", "primary")}</div></div>`,
  );
}
function stageImage(i: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 450;
  const ctx = canvas.getContext("2d")!;
  for (let l = 0; l < 3; l++)
    ctx.drawImage(
      game.textures
        .get(`stage-${i}-${l}`)
        .getSourceImage() as HTMLCanvasElement,
      0,
      0,
    );
  return canvas.toDataURL();
}
function tutorial(fromStart = false) {
  setScreen(
    "tutorial",
    `<div class="panel tutorial-panel">${chip("A QUICK WARM-UP")}<h2>BRING THE HOLIDAY HEAT.</h2><div class="tutorial-grid"><div><h3>MOVE & DEFEND</h3><p><kbd>${keyName("left")}</kbd> <kbd>${keyName("right")}</kbd> Move <kbd>${keyName("up")}</kbd> Jump <kbd>${keyName("down")}</kbd> Crouch</p><p><kbd>${keyName("block")}</kbd> Hold to block. Crouch + block stops low attacks. Grabs beat blocking.</p></div><div><h3>MAKE AN IMPACT</h3><p><kbd>${keyName("punch")}</kbd> Punch <kbd>${keyName("kick")}</kbd> Kick <kbd>${keyName("grab")}</kbd> Grab</p><p><kbd>${keyName("special")}</kbd> Special · costs 40 meter. Fight to refill it. Crouch or jump + attack for new moves.</p></div></div><p class="help-note">On touchscreens, hold a direction and tap an attack with another finger. Gamepad: stick / D-pad, A punch, B kick, X grab, Y special, LB block. Start pauses.</p><div class="panel-footer"><span>ESC PAUSES · PLAY FAIR. FIGHT FESTIVE.</span>${button(fromStart ? "GOT IT. LET’S FIGHT →" : "BACK TO THE ARCADE →", fromStart ? "begin" : "title", "primary")}</div></div>`,
  );
}
function keyName(action: string) {
  return save.settings.keys[action].replace("Key", "").replace("Arrow", "");
}
function start() {
  if (!save.tutorial) {
    tutorial(true);
    return;
  }
  begin();
}
function begin() {
  completed = false;
  save.tutorial = true;
  persist(save);
  cpu = new CPU(save.settings.difficulty, 41 + arcadeIndex * 17);
  if (mode === "arcade") {
    arcadeIndex = Math.min(3, Math.max(0, arcadeIndex));
    opponent = arcadeOpponents()[arcadeIndex];
  }
  match = createMatch(chosen, opponent, mode === "training");
  bridge.match = match;
  bridge.stage = stage;
  paused = false;
  accumulator = 0;
  lastPhase = "";
  stats = { hits: 0, damage: 0 };
  setScreen("match", "");
  buildHud();
}
function arcadeOpponents(): FighterId[] {
  return [...fighters.filter((f) => f.id !== chosen).map((f) => f.id), chosen];
}
function buildHud() {
  hud.innerHTML = `<div class="fight-hud"><div class="player-hud"><div class="name-line"><b>${chosen.toUpperCase()}</b><small>P1 · ${mode === "versus" ? "LOCAL" : "YOU"}</small><span id="score-p1">000000</span></div><div class="health-frame"><div id="health-p1" class="health-fill"></div></div><div class="round-dots" id="rounds-p1"></div></div><div class="timer-frame"><span>ROUND <b id="round">1</b></span><strong id="timer">99</strong></div><div class="player-hud p2"><div class="name-line"><b>${opponent.toUpperCase()}</b><small>${mode === "versus" ? "P2 · LOCAL" : mode === "training" ? "DUMMY" : "CPU"}</small><span id="score-p2">000000</span></div><div class="health-frame"><div id="health-p2" class="health-fill"></div></div><div class="round-dots" id="rounds-p2"></div></div></div><div class="arena-label">${stageNames[stage]} <span> / ${mode.toUpperCase()}</span></div><button id="pause-button" aria-label="Pause game">II</button><div id="announcement"></div><div class="meter-row"><div><span id="special-p1">${fighterById(chosen).special.toUpperCase()}</span><div class="meter-frame"><i id="meter-p1"></i></div></div><div><span id="special-p2">${fighterById(opponent).special.toUpperCase()}</span><div class="meter-frame"><i id="meter-p2"></i></div></div></div><div id="combo"></div>${mode === "training" ? '<div class="training-bar"><label>DUMMY <select id="dummy"><option value="stand">Stand</option><option value="block">Block</option><option value="attack">Attack</option><option value="jump">Jump</option><option value="random">Random</option></select></label><span id="training-stats">0 HITS · 0 DAMAGE</span><button id="reset-training">RESET</button></div>' : ""}`;
  $("#pause-button").onclick = () => pause();
  if (mode === "training") {
    $<HTMLSelectElement>("#dummy").value = dummy;
    $("#dummy").onchange = (e) =>
      (dummy = (e.target as HTMLSelectElement).value as Dummy);
    $("#reset-training").onclick = () => begin();
  }
}
function html(el: HTMLElement, content: string) {
  if (el.innerHTML !== content) el.innerHTML = content;
}
function renderHud() {
  if (!match) return;
  const m = match;
  for (let i = 0; i < 2; i++) {
    const f = m.fighters[i],
      id = `p${i + 1}`;
    $(`#health-${id}`).style.width =
      `${(f.health / fighterById(f.id).health) * 100}%`;
    $(`#health-${id}`).classList.toggle("danger", f.health < 30);
    $(`#meter-${id}`).style.width = f.meter + "%";
    $(`#special-${id}`).classList.toggle("ready", f.meter >= 40);
    $(`#score-${id}`).textContent = String(f.score).padStart(6, "0");
    html(
      $(`#rounds-${id}`),
      [0, 1].map((n) => `<i class="${f.wins > n ? "won" : ""}"></i>`).join(""),
    );
  }
  $("#timer").textContent =
    mode === "training"
      ? "∞"
      : String(Math.max(0, Math.ceil(m.timer / 60))).padStart(2, "0");
  $("#round").textContent = String(m.round);
  const announcement = $("#announcement");
  let words = "";
  if (m.phase === "intro")
    words = m.phaseFrame < 65 ? `ROUND ${m.round}` : "FIGHT!";
  if (m.phase === "roundOver")
    words =
      m.roundWinner === "draw" ? "DRAW" : m.timer <= 0 ? "TIME UP" : "K.O.!";
  html(
    announcement,
    words
      ? `<strong>${words}</strong><span>${m.phase === "roundOver" ? (m.roundWinner === "draw" ? "ANOTHER ROUND. SAME CHRISTMAS SPIRIT." : m.fighters[m.roundWinner! as 0 | 1].id.toUpperCase() + " TAKES THE ROUND") : m.phaseFrame < 65 ? "MAKE SPIRITS BRIGHT." : "LET THE FESTIVITIES BEGIN."}</span>`
      : "",
  );
  const combos = m.fighters
    .map((f, i) =>
      f.combo >= 2 && f.comboAge < 65
        ? `<span class="combo-${i}">${f.combo}<small>HIT COMBO</small></span>`
        : "",
    )
    .join("");
  html($("#combo"), combos);
  if (mode === "training")
    $("#training-stats").textContent =
      `${stats.hits} HITS · ${stats.damage} DAMAGE`;
}
function tick(delta: number) {
  controls.pollMenu();
  if (screen !== "match" || paused || !match) {
    if (match) match.events = [];
    return;
  }
  accumulator += Math.min(delta, 100);
  let steps = 0;
  const events = [];
  while (accumulator >= 1000 / 60 && steps++ < 6) {
    const p1 = controls.get(0),
      p2 =
        mode === "versus"
          ? controls.get(1)
          : cpu.input(match, 1, mode === "training" ? dummy : undefined);
    step(match, [p1, p2]);
    events.push(...match.events);
    accumulator -= 1000 / 60;
  }
  match.events = events;
  for (const ev of events) {
    sound.play(ev.type);
    if (ev.type === "hit" && ev.player === 0) {
      stats.hits++;
      stats.damage += ev.damage || 0;
    }
  }
  renderHud();
  if (match.phase === "matchOver" && lastPhase !== "matchOver") {
    lastPhase = "matchOver";
    results();
  }
}
function pause() {
  if (screen === "match") {
    paused = true;
    sound.suspend();
    setScreen(
      "pause",
      `<div class="panel compact">${chip("TAKE A BREATHER")}<h2>ON ICE.</h2><p>The festivities will wait for you.</p><div class="stack">${button("BACK TO THE FIGHT →", "resume", "primary")}${button("SETTINGS", "settings", "secondary")}${button("RESTART MATCH", "restart", "secondary")}${button("EXIT TO MENU", "quit", "text-btn")}</div></div>`,
    );
  } else if (screen === "pause") resume();
  else if (screen === "settings") backSettings();
  else if (screen === "title") showMenu();
  else if (["select", "stage", "tutorial"].includes(screen)) showMenu();
  else if (screen === "menu") showTitle();
}
function resume() {
  paused = false;
  sound.resume();
  setScreen("match", "");
  accumulator = 0;
  renderHud();
}
function settings() {
  previous = screen;
  if (screen === "match" || screen === "pause") {
    paused = true;
    sound.suspend();
  }
  setScreen(
    "settings",
    `<div class="panel settings-panel">${chip("TUNE YOUR ARCADE")}<h2>MAKE YOURSELF AT HOME.</h2><div class="settings-grid"><div><label>MUSIC <input id="music" type="range" min="0" max="1" step=".05" value="${save.settings.music}"></label><label>SOUND EFFECTS <input id="effects" type="range" min="0" max="1" step=".05" value="${save.settings.effects}"></label><label>DIFFICULTY <select id="difficulty">${["easy", "normal", "hard"].map((d) => `<option ${save.settings.difficulty === d ? "selected" : ""}>${d}</option>`).join("")}</select></label><label>TOUCH CONTROL SIZE <input id="control-size" type="range" min=".7" max="1.3" step=".1" value="${save.settings.controlSize}"></label><label>REDUCED VISUAL EFFECTS <input id="reduced" type="checkbox" ${save.settings.reduced ? "checked" : ""}></label><label>MUTE ALL AUDIO <input id="mute" type="checkbox" ${save.settings.muted ? "checked" : ""}></label></div><div><h3>KEYBOARD · PLAYER 1</h3><p class="small">Select a key, then press its replacement.</p><div class="key-grid">${Object.keys(
      defaultKeys,
    )
      .map((k) =>
        button(
          `${k.toUpperCase()} <kbd>${keyName(k)}</kbd>`,
          "remap-" + k,
          "key-map",
        ),
      )
      .join(
        "",
      )}</div><p id="remap-message" class="small" role="status">P2 uses arrows + numpad. Gamepads map automatically.</p>${button("RESET KEY BINDINGS", "resetkeys", "text-btn")}</div></div><div class="panel-footer"><span>SAVED AUTOMATICALLY · NO PERSONAL DATA COLLECTED</span>${button("DONE →", "backsettings", "primary")}</div></div>`,
  );
  for (const key of ["music", "effects"] as const)
    $<HTMLInputElement>("#" + key).oninput = (e) => {
      save.settings[key] = Number((e.target as HTMLInputElement).value);
      applySettings();
    };
  $<HTMLSelectElement>("#difficulty").onchange = (e) => {
    save.settings.difficulty = (e.target as HTMLSelectElement)
      .value as typeof save.settings.difficulty;
    cpu.difficulty = save.settings.difficulty;
    applySettings();
  };
  $<HTMLInputElement>("#control-size").oninput = (e) => {
    save.settings.controlSize = Number((e.target as HTMLInputElement).value);
    applySettings();
  };
  $<HTMLInputElement>("#reduced").onchange = (e) => {
    save.settings.reduced = (e.target as HTMLInputElement).checked;
    applySettings();
  };
  $<HTMLInputElement>("#mute").onchange = (e) => {
    save.settings.muted = (e.target as HTMLInputElement).checked;
    applySettings();
  };
}
function backSettings() {
  remapping = null;
  const s = previous;
  if (s === "match" || s === "pause") {
    resume();
    if (s === "pause") pause();
  } else if (s === "title") showTitle();
  else if (s === "select") select();
  else if (s === "stage") stages();
  else if (s === "results") results();
  else showMenu();
}
function results() {
  if (!match) return;
  const win = match.winner === 0;
  const winner =
    match.winner === "draw"
      ? "DRAW"
      : match.fighters[match.winner as 0 | 1].id.toUpperCase();
  if (!completed) {
    save.highScore = Math.max(save.highScore, match.fighters[0].score);
    if (mode === "arcade" && win) {
      save.progress = Math.min(3, arcadeIndex + 1);
      if (arcadeIndex === 3) {
        save.arcadeWins++;
        save.progress = 0;
      }
    }
    persist(save);
    completed = true;
  }
  setScreen(
    "results",
    `<div class="panel compact result-panel">${chip(mode === "arcade" ? `ARCADE · BOUT ${arcadeIndex + 1} OF 4` : "A FESTIVE FRIENDLY")}<span class="result-star">${win ? "✦" : "❄"}</span><h2>${winner} WINS!</h2><p>${win ? "That’s the Christmas spirit." : "A little more practice. A little more pudding."}</p><div class="result-score"><span>ROUNDS <b>${match.fighters[0].wins} — ${match.fighters[1].wins}</b></span><span>YOUR SCORE <b>${String(match.fighters[0].score).padStart(6, "0")}</b></span></div><div class="stack">${mode === "arcade" && win ? button(arcadeIndex === 3 ? "THE CHRISTMAS CHAMPION →" : "NEXT CHALLENGER →", arcadeIndex === 3 ? "ending" : "next", "primary") : ""}${button("REMATCH ↻", "rematch", win ? "secondary" : "primary")}${button("CHOOSE FIGHTER", "select", "secondary")}${button("BACK TO MENU", "quit", "text-btn")}</div></div>`,
  );
}
function ending() {
  setScreen(
    "ending",
    `<div class="panel compact result-panel">${chip("THE STAR AT THE TOP OF THE TREE")}<span class="result-star">★</span><h2>CHRISTMAS CHAMPION.</h2><p>${chosen.toUpperCase()} brought the village together, one friendly fight at a time. The gifts are wrapped. The rivals are friends. And the pudding? Well deserved.</p><p class="small">ARCADE CLEARS: ${save.arcadeWins} · PERSONAL BEST: ${save.highScore}</p>${button("ONE MORE CHRISTMAS →", "quit", "primary")}</div>`,
  );
}
overlay.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-action]",
  );
  if (!b) return;
  sound.unlock();
  sound.play("menu");
  const a = b.dataset.action!;
  if (a.startsWith("pick-")) {
    chosen = a.slice(5) as FighterId;
    select();
    return;
  }
  if (a.startsWith("stage-")) {
    stage = Number(a.slice(6));
    bridge.stage = stage;
    stages();
    return;
  }
  if (a.startsWith("remap-")) {
    remapping = a.slice(6);
    $("#remap-message").textContent =
      `Press a letter, number, Space or Shift for ${remapping.toUpperCase()}. Arrows are reserved for P2. Escape cancels.`;
    return;
  }
  const actions: Record<string, () => void> = {
    title: showTitle,
    menu: showMenu,
    how: () => tutorial(),
    arcade: () => {
      mode = "arcade";
      arcadeIndex = save.progress;
      select();
    },
    versus: () => {
      mode = "versus";
      select();
    },
    training: () => {
      mode = "training";
      select();
    },
    select,
    stages,
    start,
    begin,
    resume,
    restart: begin,
    settings,
    backsettings: backSettings,
    quit: () => {
      paused = false;
      match = null;
      bridge.match = null;
      sound.resume();
      showMenu();
    },
    rematch: begin,
    next: () => {
      arcadeIndex++;
      opponent = arcadeOpponents()[arcadeIndex];
      stage = arcadeIndex % 4;
      begin();
    },
    ending,
    resetkeys: () => {
      save.settings.keys = { ...defaultKeys };
      applySettings();
      const p = previous;
      settings();
      previous = p;
    },
  };
  actions[a]?.();
});
controls.onPause = () => {
  if (remapping) {
    remapping = null;
    $("#remap-message").textContent = "Remap cancelled.";
    return;
  }
  pause();
};
controls.onNavigate = (dir) => {
  if (screen === "match") return;
  const focused = document.activeElement;
  if (
    focused instanceof HTMLSelectElement &&
    (dir === "left" || dir === "right")
  ) {
    focused.selectedIndex =
      (focused.selectedIndex +
        (dir === "left" ? -1 : 1) +
        focused.options.length) %
      focused.options.length;
    focused.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  if (
    focused instanceof HTMLInputElement &&
    focused.type === "range" &&
    (dir === "left" || dir === "right")
  ) {
    focused.valueAsNumber = Math.max(
      Number(focused.min || 0),
      Math.min(
        Number(focused.max || 100),
        focused.valueAsNumber +
          Number(focused.step || 1) * (dir === "left" ? -1 : 1),
      ),
    );
    focused.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  const items = [
    ...overlay.querySelectorAll<HTMLButtonElement>(
      "button:not([disabled]),select,input",
    ),
  ];
  const active = items.indexOf(document.activeElement as HTMLButtonElement);
  if (dir === "select") (document.activeElement as HTMLElement)?.click();
  else
    items[
      (active + (dir === "up" || dir === "left" ? -1 : 1) + items.length) %
        items.length
    ]?.focus();
};
window.addEventListener("keydown", (e) => {
  if (remapping && e.code !== "Escape") {
    e.preventDefault();
    if (!/^(Key[A-Z]|Digit[0-9]|Space|Shift(Left|Right))$/.test(e.code)) return;
    if (
      Object.entries(save.settings.keys).some(
        ([k, v]) => k !== remapping && v === e.code,
      )
    ) {
      $("#remap-message").textContent =
        "That key is already assigned. Choose another.";
      return;
    }
    save.settings.keys[remapping] = e.code;
    remapping = null;
    applySettings();
    const p = previous;
    settings();
    previous = p;
    return;
  }
  if (
    screen !== "match" &&
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code) &&
    !(e.target as HTMLElement).matches("input,select")
  ) {
    controls.onNavigate(
      e.code === "ArrowUp"
        ? "up"
        : e.code === "ArrowDown"
          ? "down"
          : e.code === "ArrowLeft"
            ? "left"
            : "right",
    );
  }
  if (
    screen === "title" &&
    e.code === "Enter" &&
    document.activeElement === document.body
  ) {
    sound.unlock();
    showMenu();
  }
});
$("#sound-toggle").onclick = () => {
  sound.unlock();
  save.settings.muted = !save.settings.muted;
  applySettings();
};
$("#settings-toggle").onclick = () => {
  if (screen !== "settings") settings();
};
$(".wordmark").onclick = (e) => {
  e.preventDefault();
  if (screen === "match") pause();
  else showTitle();
};
$("#rotate-hint button").onclick = () =>
  ($("#rotate-hint").style.display = "none");
window.addEventListener("blur", () => {
  if (screen === "match") pause();
  sound.suspend();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (screen === "match") pause();
    sound.suspend();
  }
});
if (import.meta.env.PROD && "serviceWorker" in navigator)
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js?v=${__BUILD_ID__}`)
      .catch((err) => console.warn("Offline cache unavailable:", err));
  });
// Read-only diagnostics for automated checks; no damage/KO cheats are shipped.
Object.defineProperty(window, "__CAF__", {
  get: () => ({
    screen,
    mode,
    stage,
    match: match ? JSON.parse(JSON.stringify(match)) : null,
    paused,
    stats,
  }),
});
