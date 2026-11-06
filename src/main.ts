import { activeSuper } from "./combat/presentation";
import Phaser from "phaser";
import "./style.css";
import "./arcade.css";
import { Arena, type SceneBridge } from "./scenes/Arena";
import {
  fighters,
  roster,
  fighterById,
  getMove,
  type FighterId,
  signatures,
  endings,
} from "./fighters/data";
import { createMatch, step, type Match } from "./combat/engine";
import { CPU, type Dummy } from "./ai/cpu";
import { Sound } from "./audio/sound";
import { stageMusic } from "./audio/music";
import { Controls } from "./ui/input";
import { requestGameFullscreen } from "./ui/fullscreen";
import {
  loadSave,
  persist,
  defaultKeys,
  recordScore,
  awardCampaignVictory,
} from "./config/storage";
import { stageNames, stageSubtitles } from "./art/pixel";
import {
  newCampaign,
  route,
  advance,
  bonuses,
  continueCampaign,
  survivalBout,
  campaignDifficulty,
  type Campaign,
} from "./progression/campaign";
type Screen =
  | "loading"
  | "title"
  | "menu"
  | "select"
  | "stage"
  | "tutorial"
  | "match"
  | "pause"
  | "settings"
  | "results"
  | "ending"
  | "scores"
  | "gameover"
  | "credits"
  | "more"
  | "characters";
type Mode = "arcade" | "versus" | "training" | "cpu" | "survival";
const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
const overlay = $("#overlay"),
  hud = $("#hud"),
  touch = $("#touch-controls");
const save = loadSave(),
  sound = new Sound(),
  controls = new Controls(save.settings.keys);
let screen: Screen = "loading",
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
  lastAudioCombo = 0,
  stats = { hits: 0, damage: 0 },
  remapping: string | null = null,
  completed = false;
let campaign: Campaign | null = null,
  carryHealth: number | null = null,
  runRecorded = false,
  continueClock: ReturnType<typeof setInterval> | null = null,
  continueRemaining = 20,
  tutorialActive = false,
  tutorialStep = 0;
const tutorialGoals = [
  "Move the joystick or hold A / D.",
  "Jump with joystick up or W.",
  "Close the distance and land a Punch.",
  "Hold away from the dummy to guard. Down-away guards lows.",
  "Use SP1 Dash (I) or SP2 Projectile (O).",
  "Activate your Super (Space / ★).",
];
let maxCombo = 0,
  roundAnnounced = 0,
  lastUnlock: string | null = null;

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
    $("#settings-toggle").removeAttribute("disabled");
    if (screen === "loading") showTitle();
  },
};
function applySettings() {
  sound.music = save.settings.music;
  sound.effects = save.settings.effects;
  sound.muted = save.settings.muted;
  sound.announcer = save.settings.announcer;
  sound.speechFallback = save.settings.speechFallback;
  for (const [key, value] of [
    ["--control-opacity", save.settings.controlOpacity],
    ["--control-inset", save.settings.controlInset + "px"],
    ["--control-lift", save.settings.controlLift + "px"],
  ] as const)
    document.documentElement.style.setProperty(key, String(value));
  bridge.reduced = save.settings.reduced;
  bridge.shake = save.settings.shake;
  document.body.classList.toggle("reduced", save.settings.reduced);
  controls.mapping = save.settings.keys;
  controls.padMapping = save.settings.padButtons;
  touch.classList.toggle("touch-compact", save.settings.compact);
  touch.classList.toggle("left-handed", save.settings.leftHanded);
  document.documentElement.style.setProperty(
    "--control-scale",
    String(save.settings.controlSize * (save.settings.compact ? 0.82 : 1)),
  );
  $("#sound-toggle").classList.toggle("is-muted", sound.muted);
  $("#sound-toggle").setAttribute("aria-pressed", String(sound.muted));
  persist(save);
}
applySettings();
$("#settings-toggle").setAttribute("disabled", "");
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
  if (screen !== s) {
    sound.enterScene();
    const keepStageMusic =
      s === "pause" ||
      (s === "settings" && (screen === "match" || screen === "pause"));
    if (
      !["match", "results", "ending", "gameover"].includes(s) &&
      !keepStageMusic
    )
      sound.setTrack("menu");
  }
  if (continueClock) {
    clearInterval(continueClock);
    continueClock = null;
  }
  document.getElementById("move-callout")?.replaceChildren();
  bridge.combatVisible = s === "match";
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
  showMenu();
}
function showMenu() {
  sound.setTrack("menu");
  setScreen(
    "menu",
    `<div class="v3-menu"><img class="entrance-fighter entrance-left" src="${portrait("jamie")}" alt="" aria-hidden="true"><img class="entrance-fighter entrance-right" src="${portrait("bucket")}" alt="" aria-hidden="true"><div class="tournament-banner" aria-hidden="true">THE FESTIVE FIGHT NIGHT</div><h1 class="v3-logo">CHRISTMAS <span>ARCADE FIGHTERS</span></h1><nav class="v3-primary" aria-label="Arcade menu">${[
      ["ARCADE", "arcade"],
      ["VERSUS", "versusmenu"],
      ["TRAINING", "training"],
      ["CHARACTERS", "characters"],
      ["OPTIONS", "settings"],
    ]
      .map(
        ([label, action], i) =>
          `<button class="arcade-choice" data-action="${action}" aria-label="${label}"><i aria-hidden="true">0${i + 1}</i><span>${label}</span><b aria-hidden="true">▶</b></button>`,
      )
      .join(
        "",
      )}</nav><div class="v3-utility">${button("FULLSCREEN", "fullscreen", "secondary")}${button("MORE MODES", "more", "secondary")}${button("HOW TO PLAY", "how", "text-btn")}<small>CHRISTMAS TOURNAMENT · V3.3</small></div><p id="fullscreen-status" role="status"></p></div>`,
  );
  if (sound.state === "running")
    void sound.announce(
      "christmas-arcade-fighters",
      "Christmas Arcade Fighters!",
    );
}
function moreModes(versusOnly = false) {
  setScreen(
    "more",
    `<div class="panel compact"><h2>${versusOnly ? "VERSUS" : "MORE MODES"}</h2><div class="stack">${button("VERSUS CPU", "cpu", "primary")}${button("LOCAL VERSUS", "versus", "primary")}${versusOnly ? "" : button("SURVIVAL", "survival", "secondary") + button("HIGH SCORES", "scores", "secondary") + button("CREDITS", "credits", "text-btn")}${button("BACK", "menu", "text-btn")}</div></div>`,
  );
}
function characterGallery() {
  setScreen(
    "characters",
    `<div class="panel"><h2>THE FIGHTERS</h2><div class="fighters-grid">${roster.map((f) => `<div class="fighter-card ${save.unlocked.includes(f.id) ? "" : "locked"}"><img data-fighter="${f.id}" src="${portrait(f.id)}" alt="${f.name}"><strong>${f.name}</strong><p>${f.bio}</p></div>`).join("")}</div>${button("BACK", "menu", "primary")}</div>`,
  );
}
async function fullscreen() {
  const element = $("#game-wrap");
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  const entered = await requestGameFullscreen(element);
  if (!entered) {
    document.body.classList.toggle("immersive");
    const status = $("#fullscreen-status");
    if (status)
      status.textContent = "Fullscreen unavailable. Immersive layout enabled.";
  }
}
const portraitCache = new Map<string, string>();
function portrait(id: FighterId, frame = 0, close = false) {
  const key = id + ":" + frame + ":" + close;
  if (portraitCache.has(key)) return portraitCache.get(key)!;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d")!;
  context.imageSmoothingEnabled = false;
  const texture = game?.textures.get(id).getSourceImage() as
    HTMLCanvasElement | undefined;
  if (texture)
    context.drawImage(
      texture,
      (frame % 8) * 256 + (close ? 32 : 0),
      Math.floor(frame / 8) * 256 + (close ? 16 : 0),
      close ? 192 : 256,
      close ? 192 : 256,
      0,
      0,
      256,
      256,
    );
  const url = canvas.toDataURL();
  portraitCache.set(key, url);
  return url;
}
let portraitTick = 0;
setInterval(() => {
  if (screen !== "select" && screen !== "characters") return;
  portraitTick++;
  overlay
    .querySelectorAll<HTMLImageElement>("img[data-fighter]")
    .forEach((img) => {
      img.src = portrait(
        img.dataset.fighter as FighterId,
        portraitTick % 2,
        img.dataset.portrait === "close",
      );
    });
}, 450);
function select() {
  const announceSelection = screen !== "select";
  setScreen(
    "select",
    `<div class="panel select-panel">${chip(mode === "versus" ? "LOCAL RIVALRY" : "MEET THE NAUGHTY LIST")}<h2>CHOOSE YOUR FIGHTER.</h2><div class="fighters-grid">${roster.map((f) => `<button class="fighter-card ${f.id === chosen ? "selected" : ""} ${save.unlocked.includes(f.id) ? "" : "locked"}" ${save.unlocked.includes(f.id) ? "" : "disabled"} style="--fighter:${"#" + f.color.toString(16)}" data-action="pick-${f.id}" aria-pressed="${f.id === chosen}"><span class="fighter-number">0${roster.indexOf(f) + 1}</span><img data-fighter="${f.id}" data-portrait="close" src="${portrait(f.id, 0, true)}" alt="Pixel portrait of ${f.name}"><strong class="fighter-name">${f.name}</strong><small>${save.unlocked.includes(f.id) ? f.title : `DEFEAT ${f.id === "rob" ? "ROB FATHER · LV 8" : "SANTA · LV 10"}`}</small><span class="select-marker">${!save.unlocked.includes(f.id) ? "LOCKED" : f.id === chosen ? "PLAYER 1" : "SELECT"}</span></button>`).join("")}</div><div class="fighter-detail"><div><h3>${chosen.toUpperCase()} <span>${fighterById(chosen).special}</span></h3><p>${fighterById(chosen).bio}</p></div><div class="fighter-stats">${["POWER", "SPEED", "DEFENCE"].map((label, i) => `<span>${label} <b>${"▰".repeat(fighterById(chosen).stats[i])}<i>${"▱".repeat(5 - fighterById(chosen).stats[i])}</i></b></span>`).join("")}</div></div><div class="panel-footer">${button("← MODES", "menu", "text-btn")}${
      mode === "arcade" || mode === "survival"
        ? `<label>CPU DIFFICULTY <select id="select-difficulty">${["easy", "normal", "hard", "master"].map((d) => `<option ${save.settings.difficulty === d ? "selected" : ""}>${d}</option>`).join("")}</select></label>`
        : `<label>${mode === "versus" ? "PLAYER 2" : "OPPONENT"} <select id="opponent">${roster
            .filter((f) => save.unlocked.includes(f.id))
            .map(
              (f) =>
                `<option value="${f.id}" ${f.id === opponent ? "selected" : ""}>${f.name}</option>`,
            )
            .join("")}</select></label>`
    }${mode === "cpu" ? `<label>DIFFICULTY <select id="cpu-difficulty">${["easy", "normal", "hard", "master"].map((d) => `<option value="${d}" ${save.settings.difficulty === d ? "selected" : ""}>${d === "master" ? "ARCADE MASTER" : d}</option>`).join("")}</select></label>` : ""}${button("CHOOSE STAGE →", "stages", "primary")}</div>${mode === "versus" ? '<p class="versus-note">P1: WASD + J/K/I/U · P2: arrows + numpad 1/2/5/0. Hold away to guard. Two gamepads also supported. A numpad or second gamepad is required for independent P2 attacks.</p>' : ""}</div>`,
  );
  if (announceSelection)
    void sound.announce("choose-your-fighter", "Choose your fighter!");
  if (mode === "arcade" || mode === "survival")
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
  if (mode === "cpu")
    $("#cpu-difficulty").onchange = (e) => {
      save.settings.difficulty = (e.target as HTMLSelectElement)
        .value as typeof save.settings.difficulty;
      applySettings();
    };
}
function stages() {
  const circuit = mode === "arcade" || mode === "survival";
  const index =
    campaign?.index ??
    (mode === "survival"
      ? 0
      : save.campaign && save.campaign.fighter !== chosen
        ? 0
        : save.progress);
  const bout = circuit
    ? mode === "survival"
      ? survivalBout(campaign || newCampaign(chosen, 0, true))
      : route(chosen)[index]
    : null;
  if (bout) {
    stage = bout.stage;
    bridge.stage = stage;
  }
  setScreen(
    "stage",
    `<div class="panel v3-stages"><h2>${circuit ? `LEVEL ${index + 1}${mode === "arcade" ? " / 10" : ""}` : "CHOOSE ARENA"}</h2>${
      bout
        ? `<div class="level-strip">${route(chosen)
            .map(
              (_, i) =>
                `<span class="${i === index ? "current" : ""}">${i + 1}</span>`,
            )
            .join(
              "",
            )}</div><div class="next-challenge"><img src="${stageImage(bout.stage)}" alt="${stageNames[bout.stage]}"><h3>${fighterById(bout.opponent).name}</h3><p>${bout.challenge}</p><p>${bout.line}</p></div>`
        : `<div class="stage-grid">${stageNames.map((name, i) => `<button data-action="stage-${i}" class="stage-card ${stage === i ? "selected" : ""}"><span class="stage-preview"><img src="${stageImage(i)}" alt="${name} pixel scenery"></span><strong>${name}</strong><span>${stageSubtitles[i]}</span></button>`).join("")}</div>${button("RANDOM ARENA", "randomstage", "secondary")}`
    }<div class="panel-footer">${button("← FIGHTERS", "select", "text-btn")}${button("START FIGHT →", "start", "primary")}</div></div>`,
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
    `<div class="panel tutorial-panel">${chip("A QUICK WARM-UP")}<h2>BRING THE HOLIDAY HEAT.</h2><div class="tutorial-grid"><div><h3>MOVE & DEFEND</h3><p><kbd>${keyName("left")}</kbd> <kbd>${keyName("right")}</kbd> Move <kbd>${keyName("up")}</kbd> Jump <kbd>${keyName("down")}</kbd> Crouch</p><p>Hold away to guard. Hold down-away against lows. Overheads beat crouching guard; grabs beat guarding.</p></div><div><h3>MAKE AN IMPACT</h3><p><kbd>${keyName("punch")}</kbd> Punch <kbd>${keyName("kick")}</kbd> Kick <kbd>${keyName("grab")}</kbd> Grab</p><p><kbd>${keyName("special")}</kbd> SP1 Dash · 40 meter. SP2 Projectile (O) · 35 meter. Crouch or jump + attack for new moves.</p></div></div><p class="help-note">Forward + Punch/Kick gives heavy attacks. SP1 Dash and SP2 Projectile stay the same in every direction. Space or ★ spends full Super meter. On touchscreens, hold a direction and tap an attack with another finger. Gamepad: stick / D-pad, A punch, B kick, X grab, Y SP1 Dash, LB SP2 Projectile, RB Super, hold away to guard. Start pauses.</p><div class="panel-footer"><span>ESC PAUSES · PLAY FAIR. FIGHT FESTIVE.</span>${button("TRY IT LIVE", "guided", "secondary")}${button(fromStart ? "GOT IT. LET’S FIGHT →" : "BACK TO THE ARCADE →", fromStart ? "begin" : "title", "primary")}</div></div>`,
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
  lastUnlock = null;
  if (mode === "arcade" || mode === "survival") {
    if (!campaign) {
      campaign = newCampaign(
        chosen,
        mode === "arcade"
          ? save.campaign && save.campaign.fighter !== chosen
            ? 0
            : save.progress
          : 0,
        mode === "survival",
      );
      if (mode === "arcade" && save.campaign?.fighter === chosen)
        campaign = { ...save.campaign };
    }
    arcadeIndex = campaign.index;
    const bout =
      mode === "survival" ? survivalBout(campaign) : route(chosen)[arcadeIndex];
    opponent = bout.opponent;
    stage = bout.stage;
  }

  save.tutorial = true;
  persist(save);
  const difficulty =
    (mode === "arcade" || mode === "survival") && campaign
      ? (mode === "survival"
          ? survivalBout(campaign)
          : route(chosen)[arcadeIndex]
        ).difficulty
      : save.settings.difficulty;
  cpu = new CPU(
    save.settings.difficulty === "easy"
      ? "easy"
      : mode === "arcade" || mode === "survival"
        ? campaignDifficulty(difficulty, save.settings.difficulty)
        : difficulty,
    41 + arcadeIndex * 17,
    campaign
      ? (mode === "survival"
          ? survivalBout(campaign)
          : route(chosen)[arcadeIndex]
        ).style
      : "balanced",
  );
  match = createMatch(
    chosen,
    opponent,
    mode === "training",
    campaign
      ? (mode === "survival"
          ? survivalBout(campaign)
          : route(chosen)[arcadeIndex]
        ).profile
      : "standard",
    mode === "training" || mode === "versus" ? "normal" : cpu.difficulty,
  );
  if (mode === "survival") {
    match.roundsToWin = 1;
    if (carryHealth !== null) match.fighters[0].health = carryHealth;
  }
  if (tutorialActive) {
    match.fighters[0].meter = 100;
    match.fighters[0].superMeter = 100;
    tutorialStep = 0;
  }
  match.roundsToWin =
    mode === "training" || mode === "survival" ? 1 : save.settings.rounds;
  match.timer = match.roundTicks = save.settings.timer * 60;
  roundAnnounced = 0;
  lastUnlock = null;
  maxCombo = 0;
  lastAudioCombo = 0;
  sound.setTrack(stageMusic(stage, opponent));
  sound.resume();
  bridge.match = match;
  bridge.stage = stage;
  paused = false;
  accumulator = 0;
  lastPhase = "";
  stats = { hits: 0, damage: 0 };
  setScreen("match", "");
  buildHud();
  if (opponent === "frost" || match.fighters[1].profile === "boss") {
    sound.play("bossIntro");
    void sound.announce(
      opponent === "santa" ? "final-battle" : "boss-battle",
      "Boss battle!",
    );
    void sound.announce(opponent, fighterById(opponent).name);
  }
}
function buildHud() {
  hud.innerHTML = `<div class="fight-hud"><div class="player-hud"><div class="name-line"><b id="fighter-name-p1">${fighterById(match!.fighters[0].id).name}</b><small>P1 · ${mode === "versus" ? "LOCAL" : "YOU"}</small><span id="score-p1">000000</span></div><div class="health-frame"><div id="health-p1" class="health-fill"></div></div><div class="round-dots" id="rounds-p1"></div></div><div class="timer-frame"><span>ROUND <b id="round">1</b></span><strong id="timer">99</strong></div><div class="player-hud p2"><div class="name-line"><b id="fighter-name-p2">${fighterById(match!.fighters[1].id).name}</b><small>${mode === "versus" ? "P2 · LOCAL" : mode === "training" ? "DUMMY" : "CPU"}</small><span id="score-p2">000000</span></div><div class="health-frame"><div id="health-p2" class="health-fill"></div></div><div class="round-dots" id="rounds-p2"></div></div></div><div class="arena-label">${stageNames[stage]} <span> / ${mode.toUpperCase()}</span></div><button id="pause-button" aria-label="Pause game">II</button><button id="fullscreen-game" aria-label="Fullscreen game">⛶</button><div id="announcement"></div><div class="meter-row"><div><span id="special-p1"></span><span class="special-moves" id="moves-p1"></span><div class="meter-frame"><i id="meter-p1"></i></div></div><div><span id="special-p2"></span><span class="special-moves" id="moves-p2"></span><div class="meter-frame"><i id="meter-p2"></i></div></div></div><div id="combo"></div><div class="super-meter-row"><span id="super-p1"></span><span id="super-p2"></span></div><div id="move-callout"></div>${mode === "training" ? '<div class="training-bar"><label>DUMMY <select id="dummy"><option value="stand">Stand</option><option value="block">Block</option><option value="attack">Attack</option><option value="jump">Jump</option><option value="random">Random</option></select></label><span id="training-stats">0 HITS · 0 DAMAGE</span><label><input type="checkbox" id="show-hitboxes"> HITBOXES</label><button id="training-meter">FULL METERS</button><button id="reset-training">RESET</button><button id="inspect-sprites">SPRITE INSPECTOR</button></div>' : ""}`;
  $("#pause-button").onclick = () => pause();
  $("#fullscreen-game").onclick = () => {
    void fullscreen();
  };
  bridge.preview = undefined;
  if (mode === "training") {
    $<HTMLSelectElement>("#dummy").value = dummy;
    $("#dummy").onchange = (e) =>
      (dummy = (e.target as HTMLSelectElement).value as Dummy);
    $("#show-hitboxes").onchange = (e) =>
      (bridge.debug = (e.target as HTMLInputElement).checked);
    $("#training-meter").onclick = () => {
      if (match)
        for (const f of match.fighters) {
          f.meter = 100;
          f.superMeter = 100;
        }
    };
    $("#reset-training").onclick = () => begin();
    $("#inspect-sprites").onclick = () => {
      const old = $("#sprite-inspector");
      if (old) {
        old.remove();
        bridge.preview = undefined;
        return;
      }
      bridge.debug = true;
      const panel = document.createElement("div");
      panel.id = "sprite-inspector";
      panel.innerHTML =
        '<label>ATLAS <select id="inspect-atlas"><option value="base">Base poses</option><option value="special">Signature poses</option></select></label><label>FRAME <input id="inspect-frame" type="range" min="0" max="47" value="0"></label><output id="inspect-number">0</output><button id="inspect-close">CLOSE INSPECTOR</button>';
      hud.append(panel);
      $<HTMLInputElement>("#inspect-frame").max = String(
        game.textures.get(chosen).frameTotal - 2,
      );
      bridge.preview = { frame: 0, special: false };
      $("#inspect-atlas").onchange = (e) => {
        const special = (e.target as HTMLSelectElement).value === "special";
        $<HTMLInputElement>("#inspect-frame").max = special
          ? "23"
          : String(game.textures.get(chosen).frameTotal - 2);
        $<HTMLInputElement>("#inspect-frame").value = "0";
        bridge.preview = { frame: 0, special };
      };
      $("#inspect-frame").oninput = (e) => {
        bridge.preview = {
          frame: Number((e.target as HTMLInputElement).value),
          special: $<HTMLSelectElement>("#inspect-atlas").value === "special",
        };
        $("#inspect-number").textContent = String(bridge.preview.frame);
      };
      $("#inspect-close").onclick = () => {
        panel.remove();
        bridge.preview = undefined;
      };
    };
  }
  if (tutorialActive) {
    const banner = document.createElement("div");
    banner.id = "interactive-tutorial";
    banner.innerHTML =
      '<span id="tutorial-instruction"></span><button id="finish-tutorial" hidden>FINISH TUTORIAL →</button>';
    hud.append(banner);
    $("#finish-tutorial").onclick = () => {
      tutorialActive = false;
      save.tutorial = true;
      persist(save);
      showTitle();
    };
  }
}
function html(el: HTMLElement, content: string) {
  if (el.innerHTML !== content) el.innerHTML = content;
}
function renderHud() {
  if (!match) return;
  const m = match;
  const superFighter = activeSuper(m);
  $("#move-callout").textContent = superFighter
    ? signatures[superFighter.id][3]
    : "";
  for (let i = 0; i < 2; i++) {
    const f = m.fighters[i],
      id = `p${i + 1}`;
    $(`#health-${id}`).style.width = `${(f.health / f.maxHealth) * 100}%`;
    $(`#health-${id}`).classList.toggle(
      "danger",
      f.health < f.maxHealth * 0.25,
    );
    $(`#meter-${id}`).style.width = f.meter + "%";
    const sp1 = getMove(f.id, "special", f.profile, f.bossPhase),
      sp2 = getMove(f.id, "special2", f.profile, f.bossPhase);
    $(`#fighter-name-${id}`).textContent = fighterById(f.id, f.profile).name;
    $(`#special-${id}`).classList.toggle(
      "ready",
      f.meter >= Math.min(sp1.cost, sp2.cost),
    );
    html(
      $(`#special-${id}`),
      `<span class="special-kind">SPECIAL${f.meter >= Math.min(sp1.cost, sp2.cost) ? " READY" : ""}</span> <b>${Math.floor(f.meter)}%</b>`,
    );
    html(
      $(`#moves-${id}`),
      `<span class="${f.move === "special2" ? "" : "active"}">SP1 ${sp1.name}</span><span class="${f.move === "special2" ? "active" : ""}">SP2 ${sp2.name}</span>`,
    );
    const ready = f.superMeter >= 100;
    if (ready && !$(`#super-${id}`).classList.contains("charged")) {
      sound.play("ready");
      if (i === 0) void sound.announce("super-ready", "Super ready!");
    }
    $(`#super-${id}`).classList.toggle("charged", ready);
    $(`#super-${id}`).style.setProperty("--charge", `${f.superMeter}%`);
    $(`#score-${id}`).textContent = String(f.score).padStart(6, "0");
    html(
      $(`#rounds-${id}`),
      Array.from({ length: m.roundsToWin }, (_, n) => n)
        .map((n) => `<i class="${f.wins > n ? "won" : ""}"></i>`)
        .join(""),
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
      `${stats.hits} HITS · ${stats.damage} DAMAGE · BEST ${maxCombo}`;
  for (let i = 0; i < 2; i++) {
    const f = m.fighters[i];
    const superName = getMove(
      f.id,
      "super",
      f.profile,
      f.bossPhase,
    ).name!.toUpperCase();
    html(
      $(`#super-p${i + 1}`),
      `${f.superMeter >= 100 ? "SUPER READY" : "SUPER"}<em class="super-name">${f.superMeter >= 100 ? "" : " · " + superName}</em> · <b>${Math.floor(f.superMeter)}%</b>`,
    );
    $(`#super-p${i + 1}`).setAttribute(
      "aria-label",
      `${fighterById(f.id).name}: ${superName}, Super ${Math.floor(f.superMeter)}%`,
    );
    $(`#super-p${i + 1}`).classList.toggle("ready", f.superMeter >= 100);
  }
  if (tutorialActive) {
    $("#tutorial-instruction").textContent =
      tutorialStep < 6
        ? `${tutorialStep + 1}/6 · ${tutorialGoals[tutorialStep]}`
        : "ALL LESSONS COMPLETE. BRING THE HOLIDAY HEAT.";
    $("#finish-tutorial").hidden = tutorialStep < 6;
  }
  if (
    m.phase === "intro" &&
    m.phaseFrame < 65 &&
    (opponent === "frost" || m.fighters[1].profile === "boss")
  ) {
    $("#announcement strong")!.textContent = fighterById(opponent).name;
    $("#announcement span")!.textContent =
      route(chosen)[arcadeIndex].line || "THE LONGEST NIGHT BEGINS.";
  }
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
          : cpu.input(
              match,
              1,
              mode === "training"
                ? tutorialActive && tutorialStep === 3
                  ? "attack"
                  : dummy
                : undefined,
            );
    step(match, [p1, p2]);
    events.push(...match.events);
    accumulator -= 1000 / 60;
  }
  match.events = events;
  for (const ev of events) {
    sound.play(
      ev.type,
      ev.strength,
      ev.move,
      match.fighters[ev.player || 0].id,
    );
    if (ev.type === "super") void sound.announce("super", "Super attack!");
    if (ev.type === "special")
      void sound.announce("special-attack", "Special attack!");
    if (["hit", "counter", "block"].includes(ev.type) && ev.move === "special2")
      sound.play(
        "projectileImpact",
        ev.strength,
        ev.move,
        match.fighters[ev.player || 0].id,
      );
    if (ev.type === "counter") void sound.announce("counter", "Counter!");
    if (ev.type === "bossPhase") {
      const boss = match.fighters[ev.player || 1];
      if (boss.id === "santa" && boss.bossPhase === 2)
        sound.setTrack("santaFinal");
      sound.setIntensity(boss.bossPhase);
    }
    if (ev.type === "fight") void sound.announce("fight", "Fight!");
    if (ev.type === "ko") void sound.announce("knockout", "Knockout!");
    if (ev.firstHit) void sound.announce("first-hit", "First hit!");
    if ((ev.type === "hit" || ev.type === "counter") && ev.player === 0) {
      if (save.settings.vibration)
        navigator.vibrate?.(ev.strength === "heavy" ? 25 : 12);
    }
    if (tutorialActive) {
      if (tutorialStep === 1 && ev.type === "jump" && ev.player === 0)
        tutorialStep++;
      else if (tutorialStep === 2 && ev.type === "hit" && ev.player === 0)
        tutorialStep++;
      else if (tutorialStep === 3 && ev.type === "block" && ev.player === 1)
        tutorialStep++;
      else if (tutorialStep === 4 && ev.type === "special" && ev.player === 0)
        tutorialStep++;
      else if (tutorialStep === 5 && ev.type === "super" && ev.player === 0)
        tutorialStep++;
    }
    if ((ev.type === "hit" || ev.type === "counter") && ev.player === 0) {
      stats.hits++;
      stats.damage += ev.damage || 0;
    }
  }
  const audioCombo = match.fighters[0].combo;
  if (audioCombo >= 5 && lastAudioCombo < 5)
    void sound.announce("five-hit-combo", "Five hit combo!");
  else if (audioCombo >= 3 && lastAudioCombo < 3)
    void sound.announce("combo", "Combo!");
  lastAudioCombo = audioCombo;
  maxCombo = Math.max(maxCombo, match.fighters[0].combo);
  if (
    tutorialActive &&
    tutorialStep === 0 &&
    Math.abs(match.fighters[0].x - 245) > 30
  )
    tutorialStep++;
  if (match.phase === "intro" && roundAnnounced !== match.round) {
    roundAnnounced = match.round;
    void sound.announce(
      match.round === 1
        ? "round-one"
        : match.round === 2
          ? "round-two"
          : "final-round",
      match.round === 1
        ? "Round one"
        : match.round === 2
          ? "Round two"
          : "Final round",
    );
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
    `<div class="panel settings-panel">${chip("TUNE YOUR ARCADE")}<h2>OPTIONS</h2><div class="settings-grid"><div><label>MUSIC <input id="music" type="range" min="0" max="1" step=".05" value="${save.settings.music}"></label><label>SOUND EFFECTS <input id="effects" type="range" min="0" max="1" step=".05" value="${save.settings.effects}"></label><label>ANNOUNCER <input id="announcer" type="range" min="0" max="1" step=".05" value="${save.settings.announcer}"></label><label>OPTIONAL DEVICE VOICE <input id="speech-fallback" type="checkbox" ${save.settings.speechFallback ? "checked" : ""}></label><p class="small">Original robotic voice pack installed. Device voice is an optional fallback.</p><label>DIFFICULTY <select id="difficulty">${["easy", "normal", "hard", "master"].map((d) => `<option ${save.settings.difficulty === d ? "selected" : ""}>${d}</option>`).join("")}</select></label><label>TOUCH CONTROL SIZE <input id="control-size" type="range" min=".7" max="1.3" step=".1" value="${save.settings.controlSize}"></label><label>CONTROL OPACITY <input id="control-opacity" type="range" min=".2" max="1" step=".05" value="${save.settings.controlOpacity}"></label><label>CONTROL INSET <input id="control-inset" type="range" min="0" max="60" step="5" value="${save.settings.controlInset}"></label><label>CONTROL LIFT <input id="control-lift" type="range" min="0" max="60" step="5" value="${save.settings.controlLift}"></label><label>COMPACT TOUCH LAYOUT <input id="compact-controls" type="checkbox" ${save.settings.compact ? "checked" : ""}></label><label>LEFT-HANDED TOUCH LAYOUT <input id="left-handed" type="checkbox" ${save.settings.leftHanded ? "checked" : ""}></label><label>HAPTICS (SUPPORTED DEVICES) <input id="vibration" type="checkbox" ${save.settings.vibration ? "checked" : ""}></label><label>REDUCED VISUAL EFFECTS <input id="reduced" type="checkbox" ${save.settings.reduced ? "checked" : ""}></label><label>MUTE ALL AUDIO <input id="mute" type="checkbox" ${save.settings.muted ? "checked" : ""}></label></div><div><h3>KEYBOARD · PLAYER 1</h3><p class="small">Select a key, then press its replacement.</p><div class="key-grid">${Object.keys(
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
      )}</div><p id="remap-message" class="small" role="status">P2 uses arrows + numpad. Gamepads map automatically.</p>${button("RESET KEY BINDINGS", "resetkeys", "text-btn")}</div></div><div class="panel-footer"><span>SAVED AUTOMATICALLY · NO PERSONAL DATA COLLECTED</span>${button("SAVE & RETURN →", "backsettings", "primary")}</div></div>`,
  );
  const grid = $(".settings-grid"),
    keyboard = grid.children[1];
  const tabs = document.createElement("nav");
  tabs.className = "options-tabs";
  tabs.setAttribute("aria-label", "Options categories");
  const groups = ["AUDIO", "CONTROLS", "GAMEPLAY"].map((name) => {
    const panel = document.createElement("section");
    panel.className = "option-page";
    panel.dataset.group = name;
    const tab = document.createElement("button");
    tab.textContent = name;
    tab.type = "button";
    tab.onclick = () => {
      groups.forEach((p) => (p.hidden = p !== panel));
      tabs
        .querySelectorAll("button")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === tab)));
    };
    tabs.append(tab);
    return panel;
  });
  for (const label of [...grid.querySelectorAll("label")]) {
    const id = label.querySelector("input,select")?.id || "";
    groups[
      ["music", "effects", "announcer", "mute", "speech-fallback"].includes(id)
        ? 0
        : ["difficulty", "reduced"].includes(id)
          ? 2
          : 1
    ].append(label);
  }
  groups[1].append(keyboard);
  groups[1].insertAdjacentHTML(
    "beforeend",
    `<details class="pad-settings"><summary>GAMEPAD COMBAT BUTTONS</summary>${Object.entries(
      save.settings.padButtons,
    )
      .map(
        ([action, value]) =>
          `<label>PAD ${action === "special" ? "SP1 DASH" : action === "special2" ? "SP2 PROJECTILE" : action.toUpperCase()} <select data-pad="${action}">${["A / CROSS", "B / CIRCLE", "X / SQUARE", "Y / TRIANGLE", "LB / L1", "RB / R1"].map((label, index) => `<option value="${index}" ${value === index ? "selected" : ""}>${label}</option>`).join("")}</select></label>`,
      )
      .join(
        "",
      )}<p>Start pauses. Triggers: dash / heavy. Menu selection uses A / Cross.</p></details>`,
  );
  for (const select of groups[1].querySelectorAll<HTMLSelectElement>(
    "[data-pad]",
  ))
    select.onchange = () => {
      const key = select.dataset.pad!,
        next = Number(select.value),
        old = save.settings.padButtons[key];
      const other = Object.keys(save.settings.padButtons).find(
        (k) => k !== key && save.settings.padButtons[k] === next,
      );
      if (other) save.settings.padButtons[other] = old;
      save.settings.padButtons[key] = next;
      for (const el of overlay.querySelectorAll<HTMLSelectElement>(
        "[data-pad]",
      ))
        el.value = String(save.settings.padButtons[el.dataset.pad!]);
      applySettings();
    };

  const touchPage = document.createElement("div");
  touchPage.className = "control-page";
  for (const el of [...groups[1].children])
    if (el.tagName === "LABEL") touchPage.append(el);
  const padPage = groups[1].querySelector<HTMLDetailsElement>(".pad-settings")!;
  padPage.open = true;
  padPage.querySelector("summary")!.hidden = true;
  const controlNav = document.createElement("nav");
  controlNav.className = "control-tabs";
  const controlPages = [touchPage, keyboard as HTMLElement, padPage];
  for (const [i, title] of ["TOUCH", "KEYBOARD", "GAMEPAD"].entries()) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.textContent = title;
    tab.onclick = () => {
      controlPages.forEach((p, n) => (p.hidden = n !== i));
      controlNav
        .querySelectorAll("button")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === tab)));
    };
    controlNav.append(tab);
  }
  groups[1].replaceChildren(controlNav, ...controlPages);
  (controlNav.firstElementChild as HTMLButtonElement).click();
  groups[2].insertAdjacentHTML(
    "beforeend",
    `<label>ROUND WINS <select id="round-count">${[1, 2, 3].map((n) => `<option value="${n}" ${save.settings.rounds === n ? "selected" : ""}>${n}</option>`).join("")}</select></label><label>ROUND TIMER <select id="round-timer">${[60, 75, 99].map((n) => `<option value="${n}" ${save.settings.timer === n ? "selected" : ""}>${n} SECONDS</option>`).join("")}</select></label><label>SCREEN SHAKE <input id="shake" type="checkbox" ${save.settings.shake ? "checked" : ""}></label><button type="button" id="options-fullscreen">FULLSCREEN</button>`,
  );
  grid.replaceChildren(...groups);
  grid.before(tabs);
  (tabs.firstElementChild as HTMLButtonElement).click();
  $("#round-count").onchange = (e) => {
    save.settings.rounds = Number((e.target as HTMLSelectElement).value);
    applySettings();
  };
  $("#round-timer").onchange = (e) => {
    save.settings.timer = Number((e.target as HTMLSelectElement).value);
    applySettings();
  };
  $("#shake").onchange = (e) => {
    save.settings.shake = (e.target as HTMLInputElement).checked;
    applySettings();
  };
  $("#options-fullscreen").onclick = () => {
    void fullscreen();
  };
  for (const [id, key] of [
    ["compact-controls", "compact"],
    ["left-handed", "leftHanded"],
  ] as const)
    $("#" + id).onchange = (e) => {
      save.settings[key] = (e.target as HTMLInputElement).checked;
      applySettings();
    };
  for (const key of ["music", "effects", "announcer"] as const)
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
  for (const [id, key] of [
    ["control-opacity", "controlOpacity"],
    ["control-inset", "controlInset"],
    ["control-lift", "controlLift"],
  ] as const)
    $<HTMLInputElement>("#" + id).oninput = (e) => {
      save.settings[key] = Number((e.target as HTMLInputElement).value);
      applySettings();
    };
  for (const [id, key] of [
    ["vibration", "vibration"],
    ["speech-fallback", "speechFallback"],
  ] as const)
    $<HTMLInputElement>("#" + id).onchange = (e) => {
      save.settings[key] = (e.target as HTMLInputElement).checked;
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
function endRun(result: "champion" | "defeat") {
  if (runRecorded || !campaign) return;
  runRecorded = true;
  recordScore(save, {
    fighter: chosen,
    mode: mode === "survival" ? "survival" : "arcade",
    score: campaign.score,
    result,
    bouts: result === "champion" ? 10 : campaign.index,
  });
  if (mode === "arcade") {
    save.campaign = null;
    save.progress = 0;
    persist(save);
  }
}
function results() {
  if (!match) return;
  const announceResult = !completed;
  const win = match.winner === 0,
    winner: FighterId | "draw" =
      match.winner === null || match.winner === "draw"
        ? "draw"
        : match.fighters[match.winner].id;
  const bonus = bonuses(
      match.fighters[0].health,
      fighterById(chosen).health,
      match.timer,
      maxCombo,
    ),
    points = match.fighters[0].score + bonus.health + bonus.time + bonus.combo;
  if (!completed) {
    save.highScore = Math.max(save.highScore, points);
    if (campaign && (mode === "arcade" || mode === "survival")) {
      if (win) {
        if (mode === "arcade")
          lastUnlock = awardCampaignVictory(save, campaign);
        advance(campaign, true, points);
        carryHealth = Math.min(
          fighterById(chosen).health,
          match.fighters[0].health +
            Math.round(fighterById(chosen).health * 0.2),
        );
        if (mode === "arcade") {
          save.progress = campaign.completed ? 0 : campaign.index;
          save.campaign = campaign.completed ? null : { ...campaign };
          if (campaign.completed) {
            save.arcadeWins++;
            // The championship is earned now, even if the ending is never opened.
            endRun("champion");
          }
        }
      } else if (mode === "survival") {
        campaign.score += match.fighters[0].score;
        endRun("defeat");
      }
    } else
      recordScore(save, {
        fighter: chosen,
        mode: mode === "versus" ? "versus" : "cpu",
        score: points,
        result: win ? "victory" : "defeat",
        bouts: 1,
      });
    persist(save);
    completed = true;
  }
  const circuit = mode === "arcade" || mode === "survival";
  const title =
    winner === "draw" ? "DRAW" : fighterById(winner).name + " WINS!";
  setScreen(
    "results",
    `<div class="panel compact result-panel">${chip(circuit ? `${mode.toUpperCase()} · ${mode === "survival" ? "WAVE" : "LEVEL"} ${arcadeIndex + 1}${mode === "arcade" ? " OF 10" : ""}` : "A FESTIVE FRIENDLY")}${lastUnlock ? `<div class="unlock-notice" role="status">${fighterById(lastUnlock as FighterId).name} UNLOCKED · BALANCED PLAYABLE FIGHTER${lastUnlock === "rob" ? " · CHECKPOINT · CONTINUES REFILLED TO 3" : ""}</div>` : ""}<span class="result-star">${win ? "✦" : "❄"}</span><h2>${title}</h2><p>${win ? "That’s the Christmas spirit." : mode === "survival" ? "The run is over. Your score is saved." : "The winter hasn’t won yet."}</p><div class="result-score"><span>ROUNDS <b>${match.fighters[0].wins} — ${match.fighters[1].wins}</b></span><span>RUN SCORE <b>${String(campaign?.score || points).padStart(6, "0")}</b></span></div>${win ? `<div class="bonus-grid">TIME +${bonus.time} · HEALTH +${bonus.health} · COMBO +${bonus.combo}</div>` : ""}${campaign && win && !campaign.completed ? `<p class="next-bout">NEXT: ${fighterById((mode === "survival" ? survivalBout(campaign) : route(chosen)[campaign.index]).opponent).name} · ${stageNames[(mode === "survival" ? survivalBout(campaign) : route(chosen)[campaign.index]).stage]}</p><span class="next-stage-preview"><img src="${stageImage((mode === "survival" ? survivalBout(campaign) : route(chosen)[campaign.index]).stage)}" alt="Next arena preview"></span>` : ""}<div class="stack">${circuit && win ? button(campaign?.completed ? "THE CHRISTMAS CHAMPION →" : "NEXT CHALLENGER →", campaign?.completed ? "ending" : "next", "primary") : ""}${mode === "arcade" && !win ? button(`CONTINUE / REMATCH · ${campaign?.continues || 0} LEFT <span id="continue-clock">20</span>`, "continue", "primary") : mode === "survival" ? "" : button("REMATCH ↻", "rematch", win ? "secondary" : "primary")}${button("CHOOSE FIGHTER", "select", "secondary")}${button("BACK TO MENU", "quit", "text-btn")}</div></div>`,
  );
  if (mode === "arcade" && !win) {
    continueRemaining = 20;
    continueClock = setInterval(() => {
      if (screen !== "results") return;
      continueRemaining--;
      if (continueRemaining <= 10) sound.play("countdown");
      const clock = document.querySelector("#continue-clock");
      if (clock) clock.textContent = String(continueRemaining);
      if (continueRemaining <= 0) gameOver();
    }, 1000);
  }
  sound.setTrack(win ? "victory" : "defeat");
  if (announceResult) {
    if (lastUnlock) sound.play("unlock");
    if (win && match.fighters[0].health === fighterById(chosen).health)
      void sound.announce("perfect", "Perfect!");
    void sound.announce(
      win ? "you-win" : "you-lose",
      win ? "You win!" : "You lose!",
    );
  }
}
function gameOver() {
  endRun("defeat");
  sound.setTrack("defeat");
  setScreen(
    "gameover",
    `<div class="panel compact">${chip("THE LONGEST NIGHT")}<h2>GAME OVER.</h2><p>Your run is saved in the local leaderboard. The village still believes in you.</p>${button("TRY A NEW RUN →", "newrun", "primary")}${button("HIGH SCORES", "scores", "secondary")}${button("BACK TO MENU", "quit", "text-btn")}</div>`,
  );
}
function ending() {
  endRun("champion");
  sound.setTrack("ending");
  setScreen(
    "ending",
    `<div class="panel compact result-panel">${chip("SANTA HAS BEEN DEFEATED")}<span class="result-star">★</span><h2>CHRISTMAS ARCADE CHAMPION.</h2><p>${endings[chosen]}</p><p>Ten challenges. The Rob Father and Santa unlocked. One well-earned Christmas feast.</p><p class="small">SCORE ${campaign?.score || 0} · ARCADE CLEARS ${save.arcadeWins}</p>${button("HIGH SCORES →", "scores", "primary")}${button("ONE MORE CHRISTMAS →", "newrun", "secondary")}${button("CREDITS", "credits", "text-btn")}</div>`,
  );
  void sound.announce(
    "christmas-arcade-champion",
    "Christmas Arcade Champion!",
  );
}
function highScores() {
  setScreen(
    "scores",
    `<div class="panel">${chip("LOCAL LEGENDS · NO DATA LEAVES THIS DEVICE")}<h2>THE NICE LIST.</h2>${save.scores.length ? `<table class="leaderboard"><thead><tr><th>#</th><th>FIGHTER</th><th>MODE</th><th>SCORE</th><th>RESULT</th></tr></thead><tbody>${save.scores.map((row, i) => `<tr><td>${i + 1}</td><td>${fighterById(row.fighter).name}</td><td>${row.mode.toUpperCase()}</td><td>${String(row.score).padStart(6, "0")}</td><td>${row.result.toUpperCase()} · ${row.bouts}</td></tr>`).join("")}</tbody></table>` : "<p>No scores yet. Step into the snow and make your name.</p>"}<div class="panel-footer">${button("← MODES", "menu", "text-btn")}<span>PERSONAL BEST ${save.highScore}</span></div></div>`,
  );
}
function credits() {
  setScreen(
    "credits",
    `<div class="panel credits-panel">${chip("ORIGINAL CHARACTERS · ORIGINAL GAME")}<h2>MADE OF CHRISTMAS SPIRIT.</h2><p>Phaser 3 · TypeScript · Original AI-generated pixel-art atlases and arena illustrations, directed from the supplied reference. Runtime animation, effects and music are original project code.</p><p>Playable fighter sheets contain 48 base/action/walk poses plus 24 dedicated special/Super poses each; Frost Jamie has a separate 32-pose base and 24 signature poses. Eight-pose walking cycles and six-pose normals/signatures are implemented; motion continuity and extended boss animation remain in review. No commercial fighting-game sprites or sounds are used.</p><p>Original robotic announcer pack: generated offline with eSpeak NG and FFmpeg. Optional device speech is explicitly a fallback. Human/studio voice production and listening sign-off remain open.</p><p>Physical-device performance, final art continuity, voice production and human balance sign-off remain open. This build is not claimed as a finished premium release.</p><div class="panel-footer">${button("← MODES", "menu", "primary")}${button("CONTROLS", "how", "secondary")}</div></div>`,
  );
}
overlay.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-action]",
  );
  if (!b) return;
  sound.unlock();
  const a = b.dataset.action!;
  queueMicrotask(() =>
    sound.play(
      a.startsWith("pick-")
        ? "select"
        : /^(menu|quit|title|back)/.test(a)
          ? "cancel"
          : "confirm",
    ),
  );
  if (a.startsWith("pick-")) {
    if (!save.unlocked.includes(a.slice(5))) return;
    chosen = a.slice(5) as FighterId;
    void sound.announce(chosen, fighterById(chosen).name);
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
    randomstage: () => {
      stage = Math.floor(Math.random() * stageNames.length);
      bridge.stage = stage;
      stages();
    },
    more: () => moreModes(),
    versusmenu: () => moreModes(true),
    characters: characterGallery,
    fullscreen: () => {
      void fullscreen();
    },
    menu: showMenu,
    how: () => tutorial(),
    arcade: () => {
      tutorialActive = false;
      campaign = null;
      carryHealth = null;
      runRecorded = false;
      mode = "arcade";
      arcadeIndex = save.progress;
      select();
    },
    versus: () => {
      tutorialActive = false;
      campaign = null;
      mode = "versus";
      select();
    },
    training: () => {
      tutorialActive = false;
      campaign = null;
      mode = "training";
      select();
    },
    cpu: () => {
      tutorialActive = false;
      campaign = null;
      mode = "cpu";
      select();
    },
    survival: () => {
      tutorialActive = false;
      campaign = null;
      carryHealth = null;
      runRecorded = false;
      mode = "survival";
      select();
    },
    scores: highScores,
    credits,
    guided: () => {
      mode = "training";
      campaign = null;
      tutorialActive = true;
      dummy = "stand";
      begin();
    },
    continue: () => {
      if (campaign && continueCampaign(campaign)) {
        save.campaign = { ...campaign };
        persist(save);
        begin();
      } else gameOver();
    },
    newrun: () => {
      campaign = null;
      save.progress = 0;
      save.campaign = null;
      persist(save);
      runRecorded = false;
      carryHealth = null;
      showMenu();
    },
    select: () => {
      if (screen === "results" && (mode === "arcade" || mode === "survival")) {
        campaign = null;
        carryHealth = null;
        runRecorded = false;
      }
      select();
    },
    stages,
    start,
    begin,
    resume,
    restart: begin,
    settings,
    backsettings: backSettings,
    quit: () => {
      paused = false;
      tutorialActive = false;
      bridge.debug = false;
      match = null;
      bridge.match = null;
      sound.resume();
      showMenu();
    },
    rematch: begin,
    next: () => {
      if (campaign?.completed) ending();
      else {
        begin();
        void sound.announce("new-challenger", "New challenger!");
      }
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
  if (dir !== "select") {
    sound.unlock();
    sound.play("menu");
  }
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
  const visibleItems = items.filter((el) => el.getClientRects().length > 0);
  const active = visibleItems.indexOf(
    document.activeElement as HTMLButtonElement,
  );
  if (dir === "select") (document.activeElement as HTMLElement)?.click();
  else
    visibleItems[
      (active +
        (dir === "up" || dir === "left" ? -1 : 1) +
        visibleItems.length) %
        visibleItems.length
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
  if (screen !== "settings" && screen !== "loading") settings();
};
$(".wordmark").onclick = (e) => {
  e.preventDefault();
  if (screen === "loading") return;
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
window.addEventListener("focus", () => {
  if (screen !== "pause" && !(screen === "settings" && paused)) sound.resume();
});
window.addEventListener("pagehide", (event) => {
  if (event.persisted) sound.suspend();
  else sound.dispose();
});
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController && !refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: "none",
      })
      .catch((err) => console.warn("Offline cache unavailable:", err));
  });
}
// Read-only diagnostics for automated checks; no damage/KO cheats are shipped.
Object.defineProperty(window, "__CAF__", {
  get: () => ({
    build: __BUILD_ID__,
    rendering: {
      scene: (game.scene.getScene("Arena") as Arena)?.diagnostics,
      frames: Object.fromEntries(
        fighters.map((f) => [f.id, game.textures.get(f.id).frameTotal]),
      ),
      stages: Array.from({ length: 8 }, (_, i) =>
        [0, 1, 2].every((layer) => game.textures.exists(`stage-${i}-${layer}`)),
      ),
      audio: sound.state,
      audioMix: sound.diagnostics,
    },
    screen,
    mode,
    stage,
    campaign: campaign ? { ...campaign } : null,
    tutorialStep,
    match: match ? JSON.parse(JSON.stringify(match)) : null,
    paused,
    stats,
  }),
});
