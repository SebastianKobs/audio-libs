// The automation library's unit tests (base/automation):
//   - a param's level as Web Audio plays its automation, alone or at rising times in one walk;
//   - its level coming up to a time, a jump there not yet made;
//   - an event's time, a param restarted;
//   - a value at a time, one handed on now, and changes as automation events;
//   - automation later by a time; one continued as another from a time, from where it plays;
//   - automation as Web Audio holds it, told more;
//   - when it has faded for good, within a floor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Levels,
  SMOOTHING,
  automationOf,
  continuedAs,
  eventOf,
  fadedFrom,
  eventTime,
  levelAt,
  restartAt,
  scheduled,
  shiftedBy,
  timedAt,
  timedValue,
} from '../index.ts';
import { near } from '../../util/test/near.js';

// every kind of event in turn: a value as the node is made, a jump, two ramps, a target, a jump
const EVERY_KIND = [
  ['value', 0.2],
  ['set', 0, 1],
  ['linear', 1, 2],
  ['exp', 4, 3],
  ['target', 0, 4, 0.5],
  ['set', 2, 6],
];

test("a param's level as Web Audio plays its automation: a value held, a ramp straight or exponential, a target approached", () => {
  near(levelAt([['value', 0.5]], 3), 0.5, 'a value, held');
  const linear = [
    ['set', 0, 0],
    ['linear', 1, 2],
  ];
  near(levelAt(linear, 1), 0.5, 'halfway up a straight ramp');
  near(levelAt(linear, 3), 1, 'held at its end');
  near(
    levelAt(
      [
        ['set', 1, 0],
        ['exp', 4, 2],
      ],
      1,
    ),
    2,
    'halfway along an exponential ramp, by ratio',
  );
  const fromNothing = [
    ['set', 0, 0],
    ['exp', 1, 1],
  ];
  near(levelAt(fromNothing, 0.5), 0, 'an exponential ramp from nothing holds');
  near(levelAt(fromNothing, 1.5), 1, 'then jumps at its end');
  const target = [
    ['set', 1, 0],
    ['target', 0, 1, 0.5],
  ];
  near(levelAt(target, 1), 1, 'a target from its start');
  near(levelAt(target, 1.5), Math.exp(-1), 'one time constant on, 1/e of the way left');
});

test("a param's levels at rising times, its automation walked once: each the same as asked alone", () => {
  const levels = new Levels(EVERY_KIND);
  for (const t of [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 4.25, 5, 6, 7]) {
    near(levels.at(t), levelAt(EVERY_KIND, t), `at ${t}`, 1e-12);
  }
});

test("a param's level coming up to a time: a jump there not yet made; a ramp ending there at its end; a value from before anything", () => {
  const jump = new Levels([
    ['set', 0, 0],
    ['set', 1, 2],
  ]);
  assert.equal(jump.before(2), 0, "the jump's foot");
  assert.equal(jump.at(2), 1, 'and its top, the same time asked again');
  const ramp = new Levels([
    ['set', 0, 0],
    ['linear', 1, 2],
  ]);
  near(ramp.before(2), 1, "a ramp's end, as it gets there");
  const target = new Levels([
    ['set', 1, 0],
    ['target', 0, 1, 0.5],
  ]);
  assert.equal(target.before(1), 1, 'a target from where it starts');
  assert.equal(new Levels([['value', 0.5]]).before(0), 0.5, 'a value as the node is made');
});

test("an event's time, and a param restarted from a level", () => {
  assert.equal(eventTime(['value', 0.5]), -Infinity, 'a value holds from before anything');
  assert.equal(eventTime(['cancel', 2]), 2);
  assert.equal(eventTime(['target', 1, 3, 0.1]), 3, "a target's start");
  assert.equal(eventTime(['linear', 1, 4]), 4, "a ramp's end");
  assert.deepEqual(restartAt(0.3, 2), [
    ['cancel', 2],
    ['set', 0.3, 2],
  ]);
});

test("a value at a time: jumping there, or gliding there by a time constant, none kept where it has none; one handed on now, from a time or gliding, now the caller's", () => {
  assert.deepEqual(timedValue(0.5, 2), { value: 0.5, t: 2 });
  assert.deepEqual(timedValue(0.5, 2, 0.08), { value: 0.5, t: 2, glide: 0.08 });
  assert.deepEqual(timedValue(0.5, 2, undefined), { value: 0.5, t: 2 }, 'none given, none kept');
  assert.deepEqual(timedAt(1, {}, 10), { value: 1, t: 10 }, 'now');
  assert.deepEqual(timedAt(1, { at: 12 }, 10), { value: 1, t: 12 }, 'from a time');
  assert.deepEqual(timedAt(1, { glide: 0.08 }, 10), { value: 1, t: 10, glide: 0.08 }, 'gliding there from now');
  assert.deepEqual(
    timedAt(1, { at: 12, glide: 0.08 }, 10),
    { value: 1, t: 12, glide: 0.08 },
    'gliding there from a time',
  );
});

test('a change as an automation event: a jump set at its time; a glide a target by its time constant; a glide of 0 a jump; changes in time order, the first set at its time, nothing before it to glide from', () => {
  assert.deepEqual(eventOf({ value: 1, t: 2 }), ['set', 1, 2]);
  assert.deepEqual(eventOf({ value: 1, t: 2, glide: 0.1 }), ['target', 1, 2, 0.1]);
  assert.deepEqual(eventOf({ value: 1, t: 2, glide: 0 }), ['set', 1, 2]);
  const changes = [
    { value: 3, t: 1, glide: 0.5 },
    { value: 0, t: 2 },
    { value: 1, t: 3, glide: 0.2 },
  ];
  assert.deepEqual(automationOf(changes), [
    ['set', 3, 1],
    ['set', 0, 2],
    ['target', 1, 3, 0.2],
  ]);
  assert.deepEqual(automationOf([]), [], 'none: nothing told');
});

test('automation later by a time: each event but a value as the node is made, a cancel too', () => {
  assert.deepEqual(shiftedBy(EVERY_KIND, 10), [
    ['value', 0.2],
    ['set', 0, 11],
    ['linear', 1, 12],
    ['exp', 4, 13],
    ['target', 0, 14, 0.5],
    ['set', 2, 16],
  ]);
  assert.deepEqual(shiftedBy([['cancel', 1]], 2), [['cancel', 3]]);
});

test('automation continued as another from a time, from where it plays: a ramp running then cut there, at the level it has reached, as Web Audio drops a ramp whose end is cancelled; a ramp coming taken on from there; a target approached from there; a value held glided to by the smoothing', () => {
  const rising = [
    ['set', 0, 0],
    ['linear', 1, 2],
  ];
  assert.deepEqual(
    continuedAs(
      rising,
      [
        ['set', 0, 0],
        ['linear', 2, 4],
      ],
      1,
    ),
    [
      ['cancel', 1],
      ['linear', 0.5, 1],
      ['linear', 2, 4],
    ],
    'the running ramp cut where it is, so it runs up to there',
  );
  const decaying = [
    ['set', 1, 0],
    ['exp', 0.01, 2],
  ];
  assert.deepEqual(
    continuedAs(
      decaying,
      [
        ['set', 1, 0],
        ['exp', 0.01, 2],
        ['exp', 0.001, 3],
      ],
      1,
    )[1],
    ['exp', 0.1, 1],
  );
  const held = [['set', 1, 0]];
  assert.deepEqual(
    continuedAs(
      held,
      [
        ['set', 1, 0],
        ['target', 0, 0.5, 0.2],
      ],
      1,
    ),
    [
      ['cancel', 1],
      ['set', 1, 1],
      ['target', 0, 1, 0.2],
    ],
  );
  assert.deepEqual(continuedAs(held, [['set', 0.5, 0]], 1), [
    ['cancel', 1],
    ['set', 1, 1],
    ['target', 0.5, 1, SMOOTHING],
  ]);
  assert.deepEqual(
    continuedAs(held, [['set', 0.5, 0]], 1, 0.2).at(-1),
    ['target', 0.5, 1, 0.2],
    'a smoothing asked for',
  );
});

test('a target continued from where it plays, an event coming cutting it at a value on its way, as a comparator an attack: timed to reach that value then, so nothing jumps; one cut elsewhere, or past it, approached as wanted', () => {
  const charging = [
    ['set', 0, 0],
    ['target', 1.3, 0, 0.5],
  ];
  const wanted = [
    ['set', 0, 0],
    ['target', 1.3, 0, 0.8],
    ['set', 1, 2],
  ];
  const continued = continuedAs(charging, wanted, 0.5);
  const level = 1.3 * (1 - Math.exp(-1));
  near(continued[1][1], level, 'from where it is');
  const [kind, value, at, tc] = continued[2];
  assert.deepEqual([kind, value, at], ['target', 1.3, 0.5]);
  near(tc, 1.5 / Math.log((1.3 - level) / 0.3), 'timed to reach 1 at 2 s');
  near(levelAt(continued.slice(0, 3), 2), 1, 'reaching the cut as it comes');
  assert.deepEqual(continued.at(-1), ['set', 1, 2]);
  const past = continuedAs(charging, [...wanted.slice(0, 2), ['set', 0.2, 2]], 0.5);
  assert.deepEqual(past[2], ['target', 1.3, 0.5, 0.8], 'cut below where it is: as wanted');
});

test('automation as Web Audio holds it, told more: a cancel dropping what was planned from its time, the rest in time order, one told later at the same time after', () => {
  const rising = [
    ['set', 0, 0],
    ['linear', 1, 2],
  ];
  assert.deepEqual(
    scheduled(rising, [
      ['cancel', 1],
      ['set', 0.5, 1],
      ['linear', 0, 3],
    ]),
    [
      ['set', 0, 0],
      ['set', 0.5, 1],
      ['linear', 0, 3],
    ],
  );
  assert.deepEqual(
    scheduled(
      [['set', 1, 2]],
      [
        ['set', 0, 1],
        ['set', 2, 2],
      ],
    ),
    [
      ['set', 0, 1],
      ['set', 1, 2],
      ['set', 2, 2],
    ],
  );
});

test('when automation has faded for good, within a floor: its last event where that leaves it there; a target once it comes within; never where it ends above it; from the start where nothing moves it', () => {
  const floor = 1e-4;
  assert.equal(
    fadedFrom(
      [
        ['set', 1, 0],
        ['exp', floor, 2],
      ],
      floor,
    ),
    2,
  );
  assert.equal(
    fadedFrom(
      [
        ['set', 1, 0],
        ['linear', 0, 2],
      ],
      floor,
    ),
    2,
  );
  assert.equal(
    fadedFrom(
      [
        ['set', 1, 0],
        ['linear', 0.5, 2],
      ],
      floor,
    ),
    Infinity,
    'held above it',
  );
  near(
    fadedFrom(
      [
        ['set', 1, 0],
        ['target', 0, 1, 0.5],
      ],
      floor,
    ),
    1 + 0.5 * Math.log(1 / floor),
  );
  assert.equal(
    fadedFrom(
      [
        ['set', 1, 0],
        ['target', 0.5, 1, 0.5],
      ],
      floor,
    ),
    Infinity,
    'approaching a level above it',
  );
  assert.equal(
    fadedFrom(
      [
        ['set', 0, 0],
        ['target', 0, 1, 0.5],
      ],
      floor,
    ),
    1,
    'within it already',
  );
  assert.deepEqual([fadedFrom([], floor), fadedFrom([['value', 0]], floor)], [-Infinity, -Infinity]);
});
