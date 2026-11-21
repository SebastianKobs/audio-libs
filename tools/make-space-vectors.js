// Writes test-vectors/space/hearing.json from the distance model (hearing() and hearMax(), through a space):
// how loud, how bright and how much room a sound has at a distance from where you listen, for the defaults and with each setting moved.
// The unit tests hold the model to the vectors, so they're written again only on purpose:
// node tools/make-space-vectors.js
import { Space } from '../spatial/hearing/index.ts';
import { significant, table, written } from './vectors.js';

// the listener's way of measuring is the plain one: the vectors say what the model hears at a distance, wherever it's from
const LISTENER = { distance: ({ x, z }) => Math.hypot(x, z), side: () => 0 };
const WIDTH = 0.6; // the stereo's width, which no vector reads
// world: the world round which a garden wraps, 0 for none; its half is the farthest hearing may reach
const BASE = { range: 8, hearing: 40, falloff: 1, dull: 1, room: 1, world: 128 };
const VARIANTS = [
  {},
  { range: 0 },
  { range: 2 },
  { range: 16 },
  { falloff: 0 },
  { falloff: 2 },
  { dull: 0 },
  { dull: 2 },
  { room: 0 },
  { room: 2 },
  { hearing: 10 },
  { hearing: 80 },
  { range: 16, hearing: 10 },
  { world: 0 },
  { world: 0, hearing: 80 },
  { world: 256, hearing: 80 },
];
const cases = [];
for (const v of VARIANTS) {
  const s = { ...BASE, ...v };
  const limit = s.world ? s.world / 2 : Infinity;
  const space = new Space({
    settings: {
      range: s.range,
      hearing: s.hearing,
      falloff: s.falloff,
      dull: s.dull,
      room: s.room,
      width: WIDTH,
      limit,
    },
    listener: LISTENER,
  });
  const H = space.hearMax();
  const R = Math.max(0.5, s.range);
  // every unit out to 80, and either side of where it changes: the range, where hearing starts to fade, and its edge
  const d = [
    ...new Set(
      [...Array.from({ length: 81 }, (_, k) => k), R - 0.01, R, R + 0.01, 0.8 * H, H - 0.01, H, H + 0.01]
        .filter((x) => x >= 0 && x <= 80)
        .map(significant),
    ),
  ].sort((a, b) => a - b);
  const h = d.map((distance) => space.hearing(distance));
  cases.push({
    settings: {
      range: s.range,
      hearing: s.hearing,
      falloff: s.falloff,
      dull: s.dull,
      room: s.room,
      limit: s.world ? s.world / 2 : null,
    },
    hearMax: significant(H),
    d,
    level: h.map((x) => significant(x.level)),
    cutoff: h.map((x) => significant(x.cutoff)),
    room: h.map((x) => significant(x.room)),
  });
}
const about =
  "How a sound is heard at a distance d from where you listen (world units): its level, the cutoff of its lowpass (Hz), and its room, the level of its send to the reverb, for the defaults and with each setting moved. hearMax is where nothing is heard any more. Settings: range (full level within it; at least 0.5), hearing (where it fades out, never inside the range), falloff, dull and room (0-2, 1 normal), limit (the farthest hearing may reach: half the world round which the garden wraps; null for none). Written from mockup/src/libs/spatial/hearing/, through the garden's space, by tools/make-space-vectors.js.";
written('space/hearing.json', table({ about, cases }));
console.log(`${cases.length} cases`);
