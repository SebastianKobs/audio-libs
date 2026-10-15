// The audio plan's unit tests (mockup/src/libs/audio-plan), on plans written by hand, no synth's:
//   - a source's last stop;
//   - a sounding plan following an edit: a held value glided by the smoothing, a ramp coming
//     taken on, a source's stop moved, a change of structure a rebuild's;
//   - a lasting one glided to an edit from where it plays;
//   - a plan faded out and in through one of its gains.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SMOOTHING, fadeInThrough, fadeOutThrough, followEdit, glideEdit, lastStop } from '../index.ts';
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

test("a source's last stop", () => {
  assert.equal(lastStop(SOUND.nodes[0]), 4);
  assert.equal(lastStop(withStops([[4], [6], [2]]).nodes[0]), 6, 'the latest of its stops');
  assert.equal(lastStop(SOUND.nodes[1]), Infinity, 'none: it sounds for good');
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

test('a lasting graph edited: each param the edit changed glided there from where it plays, nothing cancelled; one unchanged left be', () => {
  assert.deepEqual(glideEdit(SOUND, withGain([['value', 0.8]]), 2), [
    { id: 1, param: 'gain', events: [['target', 0.8, 2, SMOOTHING]] },
  ]);
  assert.deepEqual(
    glideEdit(SOUND, withGain([['value', 0.8]]), 2, 0.2)[0].events,
    [['target', 0.8, 2, 0.2]],
    'by one asked for',
  );
  assert.deepEqual(glideEdit(SOUND, withGain([['value', 0.5]]), 2), [], 'unchanged');
});

test('a lasting graph edited: a target the edited plan approaches, approached from where it plays by its own time constant', () => {
  const approaching = withGain([
    ['set', 0.5, 0],
    ['target', 0.9, 1, 0.3],
  ]);
  assert.deepEqual(glideEdit(SOUND, approaching, 2)[0].events, [['target', 0.9, 2, 0.3]]);
});

test("a lasting graph edited: none where its structure or a source's stops changed, or a changed param has events still to come, a rebuild's", () => {
  assert.equal(glideEdit(SOUND, { ...SOUND, edges: [[0, 'out']] }, 2), null, 'an edge changed');
  assert.equal(glideEdit(SOUND, withStops([[5]]), 2), null, 'a stop moved');
  const ramp = (to) =>
    withGain([
      ['set', 0.5, 0],
      ['linear', to, 3],
    ]);
  assert.equal(glideEdit(ramp(0.2), ramp(1), 1), null, 'a ramp coming');
  assert.equal(glideEdit(ramp(0.2), withGain([['value', 0.8]]), 1), null, 'one coming as it plays');
  assert.deepEqual(glideEdit(ramp(0.2), ramp(0.2), 1), [], 'one coming, unchanged');
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
