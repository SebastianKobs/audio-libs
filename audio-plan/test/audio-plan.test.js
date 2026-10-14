// The audio plan's unit tests (mockup/src/libs/audio-plan, W2c), on plans written by hand, no synth's: a param's level as Web Audio
// plays its automation; a sounding plan following an edit, a held value glided by the smoothing, a ramp coming taken on, a source's stop
// moved, a change of structure a rebuild's; a plan faded out and in through one of its gains
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SMOOTHING, fadeInThrough, fadeOutThrough, followEdit, levelAt } from '../index.ts';
import { near } from '../../util/test/near.js';

// a sound: an oscillator from 0, stopped at 4, into a gain at 0.5, out
const SOUND = {
  nodes: [
    { id: 0, node: 'oscillator', block: 'tone', props: {}, params: {}, starts: [[0]], stops: [[4]] },
    { id: 1, node: 'gain', block: 'level', props: {}, params: { gain: [['value', 0.5]] }, starts: [], stops: [] },
  ],
  edges: [
    [0, 1],
    [1, 'out'],
  ],
};
// the sound with its gain's automation, or its oscillator's stops, changed
const withGain = (gain) => ({ ...SOUND, nodes: [SOUND.nodes[0], { ...SOUND.nodes[1], params: { gain } }] });
const withStops = (stops) => ({ ...SOUND, nodes: [{ ...SOUND.nodes[0], stops }, SOUND.nodes[1]] });

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

test('an unchanged plan: nothing to do', () => {
  assert.deepEqual(followEdit(SOUND, withGain([['value', 0.5]]), 2), []);
});

test('a held value changed: glided there from where it is, by the smoothing, or by one asked for', () => {
  const told = [
    {
      id: 1,
      param: 'gain',
      events: [
        ['cancel', 2],
        ['set', 0.5, 2],
        ['target', 0.8, 2, SMOOTHING],
      ],
    },
  ];
  assert.deepEqual(followEdit(SOUND, withGain([['value', 0.8]]), 2), told);
  assert.deepEqual(followEdit(SOUND, withGain([['value', 0.8]]), 2, [], 0.2)[0].events.at(-1), ['target', 0.8, 2, 0.2]);
});

test('a ramp coming: taken on to its new end from where the param is as it plays', () => {
  const before = withGain([
    ['set', 0.5, 0],
    ['linear', 0.2, 3],
  ]);
  const after = withGain([
    ['set', 0.5, 0],
    ['linear', 1, 3],
  ]);
  const [moved] = followEdit(before, after, 1);
  assert.deepEqual(moved.events.slice(0, 1), [['cancel', 1]]);
  near(moved.events[1][1], 0.4, 'set where it is, a third of the way down');
  assert.deepEqual(moved.events.slice(2), [['linear', 1, 3]]);
});

test("a source's stop moved where the edit has it; one that would never stop now, or a change of structure, a rebuild's", () => {
  assert.deepEqual(followEdit(SOUND, withStops([[5]]), 2), [{ id: 0, stop: 5 }]);
  assert.equal(followEdit(SOUND, withStops([]), 2), null, 'a stop never taken back');
  assert.equal(followEdit(SOUND, { ...SOUND, edges: [[0, 'out']] }, 2), null, 'an edge changed');
  const filtered = { ...SOUND, nodes: [SOUND.nodes[0], { ...SOUND.nodes[1], node: 'biquad' }] };
  assert.equal(followEdit(SOUND, filtered, 2), null, "a node's kind changed");
});

test('a plan faded out through one of its gains, its sources stopped once it has; one faded in through its own', () => {
  const [gain] = SOUND.nodes.filter((node) => node.node === 'gain');
  assert.deepEqual(fadeOutThrough(SOUND, gain, 2, 0.1), [
    {
      id: 1,
      param: 'gain',
      events: [
        ['cancel', 2],
        ['set', 0.5, 2],
        ['linear', 0, 2.1],
      ],
    },
    { id: 0, stop: 2.1 },
  ]);
  assert.deepEqual(fadeOutThrough(SOUND, gain, 3.95, 0.1).at(-1), { id: 0, stop: 4 }, 'none later than its own stop');
  const faded = fadeInThrough(SOUND, gain, 2, 0.1);
  assert.deepEqual(faded.nodes[1].params.gain, [
    ['value', 0.5],
    ['set', 0, 2],
    ['linear', 0.5, 2.1],
  ]);
  assert.equal(faded.nodes[0], SOUND.nodes[0], 'the rest as planned');
  assert.deepEqual(SOUND.nodes[1].params.gain, [['value', 0.5]], 'the plan it was made from left as it was');
});
