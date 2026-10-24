// The gesture tracker's unit tests (mockup/src/libs/spatial/gestures/, as one: gesture-tracker.ts, on a clock and settings of its own;
// mockup/architecture/tests.md), in the clock's fake mode. They run the
// cases of the shared test vectors (shared/test-vectors/gestures/): first that the tracker emits exactly what they say, then what that means
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as tracker from './gesture-tracker.ts';
import { clock, settings } from './gesture-tracker.ts';
import { at, run, stroke } from './run-gestures.js';
import { circle, rub, scribble, shake } from './strokes.js';
import { near } from '../../../base/util/test/near.js';

const vectors = (file) =>
  JSON.parse(
    readFileSync(new URL(`../../../../../../shared/test-vectors/gestures/${file}.json`, import.meta.url), 'utf8'),
  );
const files = ['presses', 'strokes', 'loops'];
const cases = Object.fromEntries(files.flatMap((f) => vectors(f).cases.map((c) => [c.name, c])));
const events = (name) => {
  assert.ok(cases[name], `no case "${name}"`);
  return run(cases[name]);
};
const types = (evs, id) =>
  evs
    .filter((e) => id === undefined || e.id === id)
    .map((e) => e.type)
    .filter((t) => t !== 'dragmove');
const turns = (evs, kind) => evs.filter((e) => e.type === 'turn' && e.kind === kind);

test('the tracker matches the shared test vectors', () => {
  for (const f of files) {
    const v = vectors(f);
    assert.equal(v.format, 1);
    for (const c of v.cases) {
      const got = run(c);
      assert.equal(got.length, c.events.length, `${f}: "${c.name}": ${got.length} events, not ${c.events.length}`);
      c.events.forEach((want, k) => {
        const { t, angle, ...rest } = got[k];
        const { t: wt, angle: wa, ...wrest } = want;
        assert.deepEqual(rest, wrest, `${f}: "${c.name}", event ${k}`);
        assert.ok(Math.abs(t - wt) <= 1e-9, `${f}: "${c.name}", event ${k}: t ${t}, not ${wt}`);
        if (wa !== undefined) {
          assert.ok(Math.abs(angle - wa) <= 1e-9, `${f}: "${c.name}", event ${k}: angle ${angle}, not ${wa}`);
        }
      });
    }
  }
});

test('a tap is a press, then a tap and a release', () => {
  assert.deepEqual(types(events('tap')), ['press', 'tap', 'release']);
});

test('a hold comes at 0.40 s, not at 0.39 s, and stays a hold when it moves', () => {
  const evs = events('hold at 0.40 s, not at 0.39 s');
  const hold = evs.find((e) => e.type === 'hold');
  assert.deepEqual(types(evs), ['press', 'hold', 'release']);
  assert.ok(Math.abs(hold.t - 0.4) <= 1e-9, `the hold at ${hold.t}`);
  assert.equal(evs.at(-1).state, 'holding');
  assert.deepEqual(types(events('a hold stays a hold when it moves')), ['press', 'hold', 'release']);
});

test('the drag threshold: 8 px from the press is still a press, more is a drag', () => {
  const evs = events('drag threshold: 8 px is still a press, more is a drag');
  const start = evs.find((e) => e.type === 'dragstart');
  assert.equal(start.x, 408.5);
  assert.ok(!types(evs).includes('hold'), 'a drag never becomes a hold');
  assert.ok(!types(evs).includes('tap'), 'nor a tap');
  assert.equal(evs.filter((e) => e.type === 'dragmove').length, 1, 'its first dragmove comes with the dragstart');
});

test('a cancel ends a drag with no release or tap', () => {
  const t = types(events('cancel'));
  assert.equal(t.at(-1), 'cancel');
  assert.ok(!t.includes('release') && !t.includes('tap'));
});

// two fingers move the view, as the design document has it: one finger is for stimming, two pan. A second finger within the two-finger
// window of the first makes them a pan: what the first started is taken back, and the pan follows the point between them
test("two fingers at once pan the view together: the first's start taken back, the pan between them, ended when one lifts", () => {
  const evs = events('two fingers at once: a pan');
  assert.deepEqual(
    types(evs).filter((t) => t !== 'panmove'),
    ['press', 'takeback', 'panstart', 'panend'],
    'nothing else: no tap, no drag, no release',
  );
  const start = evs.find((e) => e.type === 'panstart');
  const moves = evs.filter((e) => e.type === 'panmove');
  assert.deepEqual([start.id, start.x, start.y], [1, 450, 300], 'between the two fingers, as the first');
  assert.ok(moves.length > 0 && moves.every((e) => e.id === 1), 'the pan moves, as the first');
  assert.equal(moves.at(-1).x, 500, 'between them as the second moved');
});

test('a second finger after the two-finger window is ignored: the first goes on', () => {
  const evs = events('a second finger late: ignored');
  assert.deepEqual(types(evs, 2), [], 'nothing from the second');
  assert.deepEqual(
    types(evs, 1)
      .filter((t) => t !== 'dragmove')
      .slice(0, 2),
    ['press', 'dragstart'],
  );
  assert.equal(types(evs, 1).at(-1), 'release', 'the first lets go as ever');
  assert.ok(!types(evs).some((t) => t.startsWith('pan') || t === 'takeback'));
});

// directly: a third finger while two pan, and the one left after a pan
test("while two fingers pan a third is ignored, and the one left after it does nothing until it's lifted", () => {
  clock.useFake(0);
  const got = [];
  const offs = tracker.EVENTS.map((type) => tracker.on(type, (e) => got.push([type, e.id])));
  tracker.down({ ...at(1, 300, 300), button: 0, t: 0 });
  clock.advance(0.1);
  tracker.down({ ...at(2, 500, 300), button: 0, t: 0.1 });
  clock.advance(0.05);
  tracker.down({ ...at(3, 700, 300), button: 0, t: 0.15 });
  tracker.move({ ...at(3, 720, 300), t: 0.16 });
  tracker.up({ ...at(3, 720, 300), t: 0.17 });
  clock.advance(0.05);
  tracker.up({ ...at(2, 500, 300), t: 0.2 });
  for (let k = 1; k <= 10; k++) {
    clock.advance(0.05);
    tracker.move({ ...at(1, 300 + 10 * k, 300), t: 0.2 + 0.05 * k });
  } // past the hold delay too
  tracker.up({ ...at(1, 400, 300), t: 0.75 });
  offs.forEach((off) => off());
  assert.deepEqual(got, [
    ['press', 1],
    ['takeback', 1],
    ['panstart', 1],
    ['panend', 1],
  ]);
});

test('the right button pans, from the first move, and never taps, holds or drags', () => {
  const t = types(events('right button pans'));
  assert.equal(t[0], 'panstart');
  assert.equal(t.at(-1), 'panend');
  assert.ok(
    t.slice(1, -1).every((x) => x === 'panmove') && t.length === 7,
    'a panmove for every move, even 3 px, through the hold time',
  );
});

test('a straight line has no turns and stays straight, also when the pointer jumps', () => {
  for (const name of ['straight', 'straight, the pointer jumping']) {
    const evs = events(name);
    assert.deepEqual(
      evs.filter((e) => e.type === 'turn' || e.type === 'shape'),
      [],
      name,
    );
  }
});

test('a zigzag of six strokes gives its five corners, and reads as a zigzag', () => {
  const evs = events('zigzag of six strokes');
  assert.equal(turns(evs, 'corner').length, 5);
  assert.equal(evs.filter((e) => e.type === 'shape').at(-1).shape, 'zigzag');
});

test('a corner rounded off within 30 px is still a corner', () => {
  const evs = events('rounded corner');
  assert.equal(turns(evs, 'corner').length, 1);
  assert.equal(turns(evs, 'bend').length, 0);
});

test('a curve and a wave read as curves, with a bend every 90° and no corners', () => {
  const curve = events('curve');
  const wave = events('wave');
  assert.equal(curve.find((e) => e.type === 'shape').shape, 'curve');
  assert.equal(turns(curve, 'bend').length, 1, 'half a circle, less the 30 px its direction needs');
  assert.deepEqual(
    wave.filter((e) => e.type === 'shape').map((e) => e.shape),
    ['curve'],
    'a wave stays a curve',
  );
  assert.equal(turns(wave, 'bend').length, 6, 'three and a half wavelengths, each swinging about 85° twice');
  assert.equal(turns(curve, 'corner').length + turns(wave, 'corner').length, 0);
});

test('a line straight up crosses its zones, one at a time', () => {
  const steps = events('straight up').filter((e) => e.type === 'zone');
  assert.deepEqual(
    steps.map((e) => e.zone),
    [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  );
  assert.ok(steps.every((e) => e.prev === e.zone - 1));
});

test('a drag that stays still rests after 0.1 s, then moves again', () => {
  const evs = events('rest');
  const rest = evs.find((e) => e.type === 'rest');
  const last = evs.filter((e) => e.type === 'dragmove' && e.t < rest.t).at(-1);
  assert.ok(Math.abs(rest.t - last.t - 0.1) < 0.025 + 1e-9, 'within a tick of 0.1 s after it last moved');
  assert.deepEqual(types(evs).slice(-3), ['rest', 'move', 'release']);
});

// directly, not from the vectors: their time always ticks just before an input, so a tick always sees the rest first
test('a rest too short for a tick to see still comes, just before the move that ends it', () => {
  clock.useFake(0);
  const got = [];
  const offs = ['rest', 'move'].map((type) => tracker.on(type, (e) => got.push([type, +e.t.toFixed(9)])));
  tracker.down({ id: 9, button: 0, x: 100, y: 100, t: 0, g: null });
  tracker.move({ id: 9, x: 120, y: 100, t: 0, g: null });
  clock.advance(0.11, { ticks: false });
  tracker.move({ id: 9, x: 140, y: 100, t: 0.11, g: null });
  tracker.up({ id: 9, x: 140, y: 100, t: 0.11, g: null });
  offs.forEach((off) => off());
  assert.deepEqual(got, [
    ['move', 0],
    ['rest', 0.1],
    ['move', 0.11],
  ]);
});

// ---------- loops: the circle fix ----------
const loops = (evs) => evs.filter((e) => e.type === 'loop');
// today's circle check, before the fix: play.js's checkCircle, on the vine's points 0.12 units apart on the floor (vineAdd), from where it
// was pressed. Their winding added up, and the vine's box at most circleSize. Kept here only to show the jitter cases are the bug it had
function oldCircle(input) {
  const down = input[0].down;
  const pts = [down.g];
  const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  let dragging = false;
  let turn = 0;
  let dir = null;
  for (const { move } of input.slice(1)) {
    if (!move) {
      continue;
    }
    if (!dragging && Math.hypot(move.x - down.x, move.y - down.y) <= settings.moveThreshold) {
      continue;
    }
    dragging = true;
    const q = pts[pts.length - 1];
    const g = move.g;
    if (Math.hypot(g.x - q.x, g.z - q.z) < 0.12) {
      continue;
    }
    pts.push(g);
    const d = Math.atan2(g.z - q.z, g.x - q.x);
    if (dir !== null) {
      turn += wrapAngle(d - dir);
    }
    dir = d;
    const w = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
    const h = Math.max(...pts.map((p) => p.z)) - Math.min(...pts.map((p) => p.z));
    if (Math.abs(turn) >= settings.circleTurn * 2 * Math.PI && Math.max(w, h) <= settings.circleSize) {
      return true;
    }
  }
  return false;
}

test('a circle becomes a loop, once, centred on it, and then only drags on', () => {
  const evs = events('circle');
  const [l] = loops(evs);
  const after = evs.slice(evs.indexOf(l) + 1);
  assert.equal(loops(evs).length, 1);
  near(l.centre.x, 640 / 50, 'centre x:', 0.15);
  near(l.centre.z, 0, 'centre z:', 0.15); // the circle is at (640, 450): 12.8, 0 on the vectors' floor
  near(l.size, 120 / 50, 'size:', 0.2);
  assert.ok(
    after.every((e) => e.type === 'dragmove' || e.type === 'release'),
    "no more shape events once it's a loop",
  );
  assert.ok(after.slice(0, -1).every((e) => e.state === 'looping'));
});

// directly: a tower plays its rhythm only while you circle (mockup/architecture/sequencer.md, 10a), so it asks how long a loop has been still
test('a loop counts how long it has stayed still, as a drag does', () => {
  clock.useFake(0);
  let looped = false;
  let t = 0;
  const off = tracker.on('loop', () => {
    looped = true;
  });
  const pts = circle(640, 450, 60, 2, 120);
  tracker.down({ ...at(7, ...pts[0]), button: 0, t });
  for (const q of pts.slice(1)) {
    t += 0.016;
    clock.advance(0.016);
    tracker.move({ ...at(7, ...q), t });
  }
  off();
  assert.ok(looped, 'it became a loop');
  clock.advance(0.15);
  assert.ok(Math.abs(tracker.restingFor(7) - 0.15) < 1e-9, `still for 0.15 s, not ${tracker.restingFor(7)}`);
  tracker.move({ ...at(7, pts[0][0] + 20, pts[0][1]), t: t + 0.15 });
  assert.ok(Math.abs(tracker.restingFor(7)) < 1e-9, 'moving again');
  tracker.up({ ...at(7, pts[0][0] + 20, pts[0][1]), t: t + 0.15 });
});

// directly: a vine's energy (mockup/architecture/sequencer.md, 10a) is how fast the hand moves on the screen, in screen heights a second, smoothed
test("a drag's hand speed: screen heights a second, smoothed; from the press or a standstill not known until a move gives it, then that move's own", () => {
  clock.useFake(0);
  tracker.configure({ height: 800 });
  let t = 0;
  let x = 100;
  tracker.down({ id: 8, button: 0, x, y: 400, t, g: null });
  const drag = (pxPerS, s) => {
    for (let k = 0; k < s / 0.016; k++) {
      t += 0.016;
      x += pxPerS * 0.016;
      clock.advance(0.016);
      tracker.move({ id: 8, x, y: 400, t, g: null });
    }
  };
  drag(800, 0.016);
  assert.equal(tracker.speedOf(8), null, 'the first move comes from a press, not a move: not known yet');
  drag(800, 1);
  assert.ok(Math.abs(tracker.speedOf(8) - 1) < 0.02, `a screen height a second: ${tracker.speedOf(8)}`);
  drag(2400, 0.08);
  assert.ok(
    tracker.speedOf(8) > 1.2 && tracker.speedOf(8) < 3,
    `faster, smoothed: on its way to 3, ${tracker.speedOf(8)}`,
  );
  drag(2400, 1);
  assert.ok(Math.abs(tracker.speedOf(8) - 3) < 0.05, `there: ${tracker.speedOf(8)}`);
  t += 0.5;
  clock.advance(0.5); // still for half a second, then slow moves: the first spans the rest, the next is the hand's own
  drag(400, 0.016);
  assert.equal(
    tracker.speedOf(8),
    null,
    'the move after a standstill spans it: not known yet, so a vine keeps its feel',
  );
  drag(400, 0.016);
  assert.ok(Math.abs(tracker.speedOf(8) - 0.5) < 0.02, `from a standstill, the move's own: ${tracker.speedOf(8)}`);
  tracker.up({ id: 8, x, y: 400, t, g: null });
  assert.equal(tracker.speedOf(8), null, 'let go: none');
});

// a mouse's moves come many a frame, coalesced by the browser, those of a frame often at one time stamp (playtest: "on a desktop
// with a mouse it mostly stays in halftime even on moderately fast movement")
test("moves at one time keep their distance: it counts in the next move with a time of its own, so a mouse's speed is a finger's", () => {
  clock.useFake(0);
  tracker.configure({ height: 800 });
  let t = 0;
  let x = 100;
  tracker.down({ id: 9, button: 0, x, y: 400, t, g: null });
  // a frame's moves, 16 of them, all stamped with the frame's time
  const frame = (pxPerS) => {
    t += 0.016;
    clock.advance(0.016);
    for (let k = 0; k < 16; k++) {
      x += (pxPerS * 0.016) / 16;
      tracker.move({ id: 9, x, y: 400, t, g: null });
    }
  };
  for (let k = 0; k < 70; k++) {
    frame(800);
  }
  const speed = tracker.speedOf(9);
  tracker.up({ id: 9, x, y: 400, t, g: null });
  assert.ok(Math.abs(speed - 1) < 0.02, `a screen height a second: ${speed}`);
});

test('an oval is round enough, and so is a circle the other way round after a straight start, with the loop at the circle', () => {
  assert.equal(loops(events('oval')).length, 1);
  const [l] = loops(events('circle the other way, after a straight start'));
  assert.ok(l, 'a loop');
  near(l.centre.x, 580 / 50, 'at the circle, not the start: x', 0.2);
  near(l.centre.z, (400 - 450) / 50, 'z', 0.2);
});

test('a loop too small or too big stays a vine, and so does a long vine that ends in a loop', () => {
  for (const name of ['circle too small', 'circle too big', 'long vine that ends in a loop']) {
    assert.deepEqual(loops(events(name)), [], name);
  }
});

test('jitter never loops, where the old circle check made a tower: rubbing to and fro, shaking on a spot, scribbling', () => {
  for (const name of [
    'rubbing to and fro',
    'shaking on a spot',
    'scribbling in a small patch',
    'scribbling fast, turning back',
  ]) {
    assert.ok(oldCircle(cases[name].input), `${name}: the old check made it a tower`);
    assert.deepEqual(loops(events(name)), [], name);
  }
});

test('jitter never loops, over many seeded strokes: 240 of them, of which the old check made nearly all towers', () => {
  const strokes = [];
  for (const amp of [10, 20, 35, 60]) {
    for (const per of [3, 5, 8]) {
      for (let seed = 1; seed <= 10; seed++) {
        strokes.push(rub(640, 450, amp, 150, per, seed));
      }
    }
  }
  for (const amp of [10, 20, 40]) {
    for (const step of [6, 12]) {
      for (let seed = 1; seed <= 15; seed++) {
        strokes.push(shake(640, 450, amp, 150, step, seed));
      }
    }
  }
  for (const step of [4, 8, 14]) {
    for (let seed = 1; seed <= 10; seed++) {
      strokes.push(scribble(640, 450, 40, 150, step, seed));
    }
  }
  const base = cases.circle;
  const inputs = strokes.map((p) => stroke(1, p));
  const looped = inputs.filter((input) => loops(run({ ...base, input })).length);
  assert.equal(inputs.length, 240);
  assert.equal(looped.length, 0, `${looped.length} looped`);
  const old = inputs.filter(oldCircle).length;
  assert.ok(old >= 0.9 * inputs.length, `the old check made towers of nearly all of them: ${old}`);
});
