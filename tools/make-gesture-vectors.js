// Writes test-vectors/gestures/*.json from the gesture tracker: pointer input in, the events it emits out. Presses,
// holds, taps, drags, pans and cancels in presses.json; the shapes of strokes in strokes.json; loops, and jitter that isn't one, in
// loops.json. The unit tests hold the tracker to the vectors,
// so they're written again only on purpose: node tools/make-gesture-vectors.js
import { TRACKER_DEFAULTS } from '../spatial/gestures/index.ts';
import { at, r3, run, stroke } from '../spatial/gestures/test/run-gestures.js';
import { arc, circle, line, rub, scribble, shake, wave, zigzag } from '../spatial/gestures/test/strokes.js';
import { written } from './vectors.js';

const trackerSettings = { ...TRACKER_DEFAULTS }; // as a tracker starts them
const screen = { height: 900 };
const byTime = (input) => input.sort((a, b) => a.t - b.t);

const presses = [
  { name: 'tap', input: stroke(1, [[400, 300]], { ms: 100 }) },
  {
    name: 'hold at 0.40 s, not at 0.39 s',
    input: [{ t: 0, down: at(1, 400, 300, { button: 0 }) }, { t: 0.39 }, { t: 0.4 }, { t: 0.5, up: at(1, 400, 300) }],
  },
  {
    name: 'a hold stays a hold when it moves',
    input: [
      { t: 0, down: at(1, 400, 300, { button: 0 }) },
      { t: 0.1, move: at(1, 405, 300) },
      { t: 0.45 },
      { t: 0.5, move: at(1, 460, 300) },
      { t: 0.6, up: at(1, 460, 300) },
    ],
  },
  {
    name: 'drag threshold: 8 px is still a press, more is a drag',
    input: [
      { t: 0, down: at(1, 400, 300, { button: 0 }) },
      { t: 0.05, move: at(1, 408, 300) },
      { t: 0.1, move: at(1, 400, 308) },
      { t: 0.15, move: at(1, 408.5, 300) },
      { t: 0.5 },
      { t: 0.55, up: at(1, 408.5, 300) },
    ],
  },
  { name: 'cancel', input: stroke(1, line(400, 300, 440, 300, 8), { end: 'cancel' }) },
  // two fingers: a second within the two-finger window makes them a pan, between them; later, it's ignored
  {
    name: 'two fingers at once: a pan',
    input: byTime([...stroke(1, [[300, 300]], { ms: 600 }), ...stroke(2, line(600, 300, 700, 300, 10), { t0: 0.05 })]),
  },
  {
    name: 'a second finger late: ignored',
    input: byTime([
      ...stroke(1, line(300, 500, 600, 500, 40), { ms: 25 }),
      ...stroke(2, line(700, 300, 800, 300, 10), { t0: 0.5 }),
    ]),
  },
  {
    name: 'right button pans',
    input: stroke(1, line(640, 500, 643, 500, 1).concat(line(643, 500, 700, 450, 4).slice(1)), { button: 2, ms: 150 }),
  },
];
const strokes = [
  { name: 'straight', input: stroke(1, line(200, 450, 800, 450, 120)) },
  { name: 'straight, the pointer jumping', input: stroke(1, line(200, 450, 800, 450, 10)) },
  { name: 'zigzag of six strokes', input: stroke(1, zigzag(300, 450, 5, 50, 50, 10)) },
  {
    name: 'rounded corner',
    input: stroke(1, [
      ...line(200, 450, 400, 450, 40),
      ...arc(400, 430, 20, Math.PI / 2, 0, 8).slice(1),
      ...line(420, 430, 420, 280, 30).slice(1),
    ]),
  }, // 90° round 20 px
  { name: 'curve', input: stroke(1, arc(500, 450, 150, Math.PI, 2 * Math.PI, 48)) },
  { name: 'wave', input: stroke(1, wave(200, 450, 705, 30, 200, 5)) },
  { name: 'straight up', input: stroke(1, line(640, 800, 640, 400, 80)) },
  {
    name: 'rest',
    input: (() => {
      // drawn, then still for 0.3 s, then on
      const a = stroke(1, line(200, 450, 400, 450, 40));
      const up = a.pop();
      const t = up.t;
      const b = line(400, 450, 600, 450, 40)
        .slice(1)
        .map((q, k) => ({ t: r3(t + 0.3 + k * 0.016), move: at(1, ...q) }));
      return [...a, { t: r3(t + 0.3 - 0.016) }, ...b, { t: r3(b[b.length - 1].t + 0.016), up: at(1, 600, 450) }];
    })(),
  },
];

// all on the floor at 50 px to a unit, so circleSize, 4 units, is 200 px
const loops = [
  { name: 'circle', input: stroke(1, circle(640, 450, 60, 1.4, 80)) },
  { name: 'oval', input: stroke(1, circle(640, 450, 70, 1.6, 110, { from: 1, squash: 0.6 })) },
  {
    name: 'circle the other way, after a straight start',
    input: stroke(1, [
      ...line(500, 450, 580, 450, 16),
      ...circle(580, 400, 50, -1.4, 70, { from: Math.PI / 2 }).slice(1),
    ]),
  },
  { name: 'circle too small', input: stroke(1, circle(640, 450, 15, 2, 40)) },
  { name: 'circle too big', input: stroke(1, circle(640, 450, 120, 1.4, 160)) },
  {
    name: 'long vine that ends in a loop',
    input: stroke(1, [
      ...line(300, 450, 600, 450, 50),
      ...circle(600, 400, 50, 1.4, 70, { from: Math.PI / 2 }).slice(1),
    ]),
  },
  { name: 'rubbing to and fro', input: stroke(1, rub(640, 450, 35, 150, 5, 3)) },
  { name: 'shaking on a spot', input: stroke(1, shake(640, 450, 20, 150, 12, 5)) },
  { name: 'scribbling in a small patch', input: stroke(1, scribble(640, 450, 40, 150, 8, 7)) },
  { name: 'scribbling fast, turning back', input: stroke(1, scribble(640, 450, 60, 150, 12, 2)) }, // it would loop if its turns back wound it
];

const about = {
  presses: 'Presses, holds, taps, drags, pans and cancels: pointer input in, the events the gesture tracker emits out.',
  strokes:
    'The shape of strokes: their turns (corners and bends), shapes, zones crossed, rests and moves, as the gesture tracker reads them.',
  loops:
    "Loops: a drag that winds into a small circle, and the strokes that don't make one: too small, too big, a long vine, and jitter (rubbing, shaking, scribbling), which the old circle check turned into towers.",
};
const how =
  ' Written from mockup/src/libs/spatial/gestures/ by tools/make-gesture-vectors.js.'
  + " Each case gives the settings and the screen's height, then its input in order. Before each input, time runs on to its t in ticks of the"
  + " clock: one every 25 ms after the previous input, and one at the input's own time; holds and rests are seen on the ticks. Then the"
  + ' input is applied: down (with its button: 2 is the right), move, up or cancel, or none, when only time passes. A floor point g carries'
  + " its zone, zone, which stands in for what a user hands in (zoneAt()). Each event gives its type, the pointer's id, the time, the pointer's state and"
  + ' where it was (x, y), and what the event says. Times and angles to 1e-9.';
for (const [file, cases] of Object.entries({ presses, strokes, loops })) {
  const out = cases.map((c) => {
    const k = { name: c.name, settings: trackerSettings, screen, input: c.input };
    return { ...k, events: run(k) };
  });
  // one input or event to a line, so a case reads from top to bottom
  const body = out
    .map(
      (c) =>
        `    {\n      "name": ${JSON.stringify(c.name)},\n      "settings": ${JSON.stringify(c.settings)},\n      "screen": ${JSON.stringify(c.screen)},\n`
        + `      "input": [\n${c.input.map((s) => '        ' + JSON.stringify(s)).join(',\n')}\n      ],\n`
        + `      "events": [\n${c.events.map((e) => '        ' + JSON.stringify(e)).join(',\n')}\n      ]\n    }`,
    )
    .join(',\n');
  written(
    `gestures/${file}.json`,
    `{\n  "about": ${JSON.stringify(about[file] + how)},\n  "format": 1,\n  "cases": [\n${body}\n  ]\n}\n`,
  );
  console.log(`${file}: ${out.length} cases, ${out.reduce((a, c) => a + c.events.length, 0)} events`);
}
