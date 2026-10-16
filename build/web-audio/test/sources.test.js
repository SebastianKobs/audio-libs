// Sources in Web Audio, started and stopped at their times (mockup/src/libs/build/web-audio), on the stand-in:
//   - a plan's sources started as it's built; a pool's copy's at the time it's added, a free
//     oscillator's as it's built, running free;
//   - a source's stop, its stop after it starts, 0 none; changed once started, moved;
//   - a noise looped where it says, started drawn into its buffer up to its offset;
//   - an oscillator's rate synced: its note at the beat, in Hz, a new tempo followed; free, its
//     frequency.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext } from './audio-stand-in.js';
import { WebAudioBuilder } from '../index.ts';
import { blockNode, oneBlockPlan } from './blocks.js';

// what's built of a plan at 4 s on a stand-in context, the beat 0.5 s; the context's nodes by their kind
function built(plan) {
  const context = new StandInContext(() => 4);
  const what = new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5 }).build(plan, {
    into: context.destination,
  });
  const made = (kind) => context.rec.nodes.filter((node) => node.kind === kind);
  return { what, made };
}
// an instrument whose voice is its children, the first into its output
function instrumentOf(...children) {
  const voice = {
    name: 'voice',
    kind: 'voice',
    inputs: [],
    outputs: [{ name: 'out', channels: 1 }],
    params: [],
    settings: [],
    children,
    wires: [{ from: { node: children[0].name, output: 'out' }, to: { output: 'out' } }],
    macros: [],
    pools: [],
  };
  return {
    version: 1,
    node: {
      name: 'synth',
      kind: 'instrument',
      inputs: [],
      outputs: [{ name: 'out', channels: 1 }],
      params: [],
      settings: [],
      children: [],
      wires: [],
      macros: [],
      pools: [{ child: voice, wires: [{ from: { node: 'voice', output: 'out' }, to: { output: 'out' } }] }],
    },
  };
}

test("a plan's sources started as it's built; a pool's copy's at the time it's added, a free oscillator's as it's built", () => {
  const tone = built(oneBlockPlan('oscillator'));
  assert.deepEqual(tone.made('oscillator')[0].starts, [[]], 'now: told no time');
  const { what, made } = built(
    instrumentOf(blockNode('tone', 'oscillator'), blockNode('lfo', 'oscillator', {}, { phase: 'free' })),
  );
  what.add(['voice', '1'], 6);
  what.add(['voice', '2']);
  assert.deepEqual(
    made('oscillator').map((oscillator) => oscillator.starts),
    [[[6]], [[]], [[]], [[]]],
    "the tone at its voice's time, now where none; the LFO as it's built",
  );
});

test("a source's stop: stopped its stop after it starts, 0 none; changed once started, moved", () => {
  const { what, made } = built(instrumentOf(blockNode('tone', 'oscillator', { stop: 0.5 })));
  what.add(['voice', '1'], 6);
  what.add(['voice', '2'], 6);
  what.set(['voice', '2', 'tone', 'stop'], 0, { at: 6 });
  const [first, second] = made('oscillator');
  assert.deepEqual([first.stops, second.stops], [[[6.5]], [[6.5]]], 'a stop of 0 takes none back');
  what.set(['voice', '1', 'tone', 'stop'], 1, { at: 6.25 });
  assert.deepEqual(first.stops.at(-1), [7], 'moved');
  const held = built(instrumentOf(blockNode('tone', 'oscillator')));
  held.what.add(['voice', '1'], 6);
  assert.deepEqual(held.made('oscillator')[0].stops, [], 'none: playing until its voice is let go');
});

test('a noise looped where it says, its buffer by its colour; started drawn into its buffer up to its offset', () => {
  const { made } = built(oneBlockPlan('noise', { offset: 1.5 }, { loop: 'on', colour: 'breath' }));
  const [hiss] = made('buffer');
  assert.deepEqual([hiss.loop, hiss.buffer.duration, hiss.starts], [true, 0.2, [[4, 0.75]]]);
  const once = built(oneBlockPlan('noise'));
  assert.deepEqual([once.made('buffer')[0].loop, once.made('buffer')[0].starts], [false, [[]]]);
});

test("an oscillator's rate synced: its note at the beat, in Hz, a new tempo followed; free, its frequency", () => {
  const synced = built(oneBlockPlan('oscillator', { sync: 1, note: '1/4' }));
  const [lfo] = synced.made('oscillator');
  assert.equal(lfo.frequency.value, 2, 'a beat of 0.5 s: twice a second');
  synced.what.tempo(0.25, { at: 5 });
  assert.deepEqual(lfo.frequency.events.at(-1), ['set', 4, 5]);
  const free = built(oneBlockPlan('oscillator', { frequency: 220 }));
  const [tone] = free.made('oscillator');
  assert.equal(tone.frequency.value, 220);
  free.what.set(['frequency'], 330, { glide: 0.1 });
  assert.deepEqual(tone.frequency.events.at(-1), ['target', 330, 4, 0.1]);
  free.what.tempo(0.25, { at: 5 });
  assert.deepEqual(tone.frequency.events.at(-1), ['target', 330, 4, 0.1], 'free: a new tempo leaves it');
});
