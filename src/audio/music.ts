import scores from "./music.json";
export type MusicTrack = keyof typeof scores;
// The repository has eight arenas. Do not invent music slots for absent stages.
export const STAGE_MUSIC: readonly MusicTrack[] = [
  "village",
  "pier",
  "workshop",
  "forest",
  "rooftops",
  "fortress",
  "rob",
  "santa",
];
export function stageMusic(stage: number, opponent?: string): MusicTrack {
  return opponent === "rob" || opponent === "santa"
    ? opponent
    : (STAGE_MUSIC[stage] ?? "village");
}
export function musicFiles(track: MusicTrack) {
  return [`audio/music/${track}.mp3`, `audio/music/${track}.ogg`];
}
export function musicOffset(
  from: MusicTrack,
  to: MusicTrack,
  elapsed: number,
  duration: number,
) {
  return (from === "santa" && to === "santaFinal") ||
    (from === "santaFinal" && to === "santa")
    ? Math.max(0, elapsed) % duration
    : 0;
}
