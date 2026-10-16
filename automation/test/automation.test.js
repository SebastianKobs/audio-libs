// The automation library's unit tests (mockup/src/libs/automation):
//   - a param's level as Web Audio plays its automation, alone or at rising times in one walk;
//   - its level coming up to a time, a jump there not yet made;
//   - an event's time, a param restarted;
//   - a value at a time, when a value lands, and changes as automation;
//   - automation later by a time; one continued as another from a time, from where it plays;
//   - automation as Web Audio holds it, told more.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Levels,
  SMOOTHING,
  automationOf,
  continuedAs,
  eventOf,
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
  const again = new Levels(EVERY_KIND);
  near(again.at(0.5), 0.2, 'the value, before the first jump');
  near(again.at(1.5), 0.5, 'halfway up the straight ramp');
  near(again.at(2.5), 2, 'halfway along the exponential one');
  near(again.at(4.5), 4 * Math.exp(-1), 'a time constant into the target');
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

test('a value at a time: jumping there, or gliding there by a time constant; no glide where it has none', () => {
  assert.deepEqual(timedValue(0.5, 2), { value: 0.5, t: 2 });
  assert.deepEqual(timedValue(0.5, 2, 0.08), { value: 0.5, t: 2, glide: 0.08 });
  assert.deepEqual(timedValue(0.5, 2, undefined), { value: 0.5, t: 2 }, 'none given, none kept');
});

test("a value handed on now, from a time or gliding, as a value at a time: now the caller's", () => {
  assert.deepEqual(timedAt(1, {}, 10), { value: 1, t: 10 }, 'now');
  assert.deepEqual(timedAt(1, { at: 12 }, 10), { value: 1, t: 12 }, 'from a time');
  assert.deepEqual(timedAt(1, { glide: 0.08 }, 10), { value: 1, t: 10, glide: 0.08 }, 'gliding there from now');
  assert.deepEqual(
    timedAt(1, { at: 12, glide: 0.08 }, 10),
    { value: 1, t: 12, glide: 0.08 },
    'gliding there from a time',
  );
});

test('a change as an automation event: a jump set at its time; a glide a target by its time constant; a glide of 0 a jump', () => {
  assert.deepEqual(eventOf({ value: 1, t: 2 }), ['set', 1, 2]);
  assert.deepEqual(eventOf({ value: 1, t: 2, glide: 0.1 }), ['target', 1, 2, 0.1]);
  assert.deepEqual(eventOf({ value: 1, t: 2, glide: 0 }), ['set', 1, 2]);
});

test('changes in time order as automation: the first set at its time, nothing before it to glide from; each after it a jump or a glide', () => {
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

test('automation continued as another from a time, from where it plays: a ramp coming taken on from there; a target approached from there; a value held glided to by the smoothing', () => {
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
      ['set', 0.5, 1],
      ['linear', 2, 4],
    ],
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
  assert.equal(SMOOTHING, 0.05, 's: as a plugin smooths a knob against zipper noise');
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
