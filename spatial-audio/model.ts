// ---------- libs/spatial-audio/model: how a sound is heard from where you listen. Pure ----------
// Like sound outdoors:
//   - within the range, everything plays at full level;
//   - beyond it, the direct sound drops 6 dB for every doubling of distance (falloff 1,
//     Web Audio's inverse distance model from the range);
//   - it loses its top too, its cutoff halving every 6 units (dull 1);
//   - its room, the send to the reverb, fades half as fast, so far sounds are mostly room (room 1);
//   - near the edge of hearing, it fades out.
// No lag with distance: it would push far notes off the beat.
// The settings are read when asked: range, hearing, falloff, dull, room, and limit,
// the farthest hearing may reach (a world that wraps round: half of it).

// the settings, read when asked: in world units, but falloff, dull and room, strengths
export interface SpaceSettings {
  range: number;
  hearing: number;
  falloff: number;
  dull: number;
  room: number;
  limit?: number;
}
// how a sound is heard: its level, its lowpass's cutoff in Hz, its room's level
export interface Heard {
  g: number;
  fc: number;
  room: number;
}

// where nothing is heard any more: never inside the range, never past the limit
export function hearMax(settings: SpaceSettings): number {
  return Math.min(Math.max(settings.hearing, 1.5 * Math.max(0.5, settings.range)), settings.limit ?? Infinity);
}
// at a distance: the level g, the lowpass's cutoff fc, and the room's level
export function hearing(distance: number, settings: SpaceSettings): Heard {
  const range = Math.max(0.5, settings.range);
  const farthest = hearMax(settings);
  const out = Math.max(0, distance - range);
  const level = smoothstep(farthest, farthest * 0.8, distance) / (1 + (settings.falloff * out) / range);
  return {
    g: level,
    fc: Math.max(120, 18000 * Math.pow(2, (-out * settings.dull) / 6)),
    room: (Math.sqrt(level) - level) * settings.room,
  };
}

// 0 up to the low edge, 1 from the high one, eased between, as GLSL's
function smoothstep(low: number, high: number, value: number): number {
  const position = Math.min(1, Math.max(0, (value - low) / (high - low)));
  return position * position * (3 - 2 * position);
}
// whether new values are worth sending: a level or room 0.002 off, or a cutoff 1% off
export function moved(previous: Heard, next: Heard): boolean {
  return (
    Math.abs(previous.g - next.g) >= 0.002
    || Math.abs(previous.room - next.room) >= 0.002
    || Math.abs(previous.fc / next.fc - 1) >= 0.01
  );
}
