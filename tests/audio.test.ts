import { it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import {
  AnnouncementGate,
  announcementPriority,
} from "../src/audio/announcements";
import { STAGE_MUSIC, stageMusic, musicOffset } from "../src/audio/music";
import scores from "../src/audio/music.json";
it("critical calls outrank Supers and ordinary combat chatter", () => {
  for (const id of [
    "knockout",
    "perfect",
    "you-win",
    "you-lose",
    "final-round",
    "boss-battle",
    "rob",
    "santa",
  ])
    expect(announcementPriority(id)).toBeGreaterThan(
      announcementPriority("super"),
    );
  expect(announcementPriority("super-ready")).toBeGreaterThan(
    announcementPriority("combo"),
  );
});
it("preemption invalidates old decodes, including after scene cancellation", () => {
  const gate = new AnnouncementGate();
  const chatter = gate.reserve("combo", 0)!;
  const ko = gate.reserve("knockout", 100)!;
  expect(gate.current(chatter)).toBe(false);
  gate.started(ko, 100, 3);
  expect(gate.reserve("fight", 2000)).toBeNull();
  gate.cancel();
  expect(gate.current(ko)).toBe(false);
  expect(gate.reserve("fight", 2100)).not.toBeNull();
});
it("released speech still has callout cooldowns", () => {
  const gate = new AnnouncementGate();
  const call = gate.reserve("special-attack", 0)!;
  gate.release(call);
  expect(gate.reserve("special-attack", 3000)).toBeNull();
  expect(gate.reserve("special-attack", 6001)).not.toBeNull();
});
it("all eight real stages map to distinct scores and boss variants keep Santa's bar position", () => {
  expect(STAGE_MUSIC).toHaveLength(8);
  expect(new Set(STAGE_MUSIC).size).toBe(8);
  STAGE_MUSIC.forEach((track, index) => {
    expect(stageMusic(index)).toBe(track);
    expect(scores[track]).toBeDefined();
  });
  expect(stageMusic(0, "rob")).toBe("rob");
  expect(stageMusic(1, "santa")).toBe("santa");
  expect(scores.santa.bpm).toBe(scores.santaFinal.bpm);
  expect(musicOffset("santa", "santaFinal", 29, 24)).toBe(5);
  expect(musicOffset("village", "pier", 29, 24)).toBe(0);
});
it("every required call has integrated fallback audio and an honest studio replacement entry", () => {
  const manifest = JSON.parse(
    readFileSync("public/voices/manifest.json", "utf8"),
  );
  const missing = JSON.parse(
    readFileSync("public/voices/production-needed.json", "utf8"),
  );
  for (const id of [
    "christmas-arcade-fighters",
    "choose-your-fighter",
    "round-one",
    "round-two",
    "final-round",
    "fight",
    "first-hit",
    "combo",
    "five-hit-combo",
    "special-attack",
    "super-ready",
    "super",
    "knockout",
    "perfect",
    "you-win",
    "you-lose",
    "new-challenger",
    "boss-battle",
    "rob",
    "santa",
    "final-battle",
    "christmas-arcade-champion",
  ]) {
    const clip = manifest.clips.find((c: { id: string }) => c.id === id);
    expect(clip, id).toBeDefined();
    expect(clip.quality).toBe("robotic-fallback");
    expect(existsSync("public/voices/" + clip.compressed)).toBe(true);
    expect(
      readFileSync("public/voices/" + clip.file)
        .subarray(0, 4)
        .toString(),
    ).toBe("RIFF");
    expect(missing.files.find((c: { id: string }) => c.id === id)?.file).toBe(
      `studio/${id}.mp3`,
    );
  }
});
