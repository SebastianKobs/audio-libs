// The stand-in for Web Audio's recordings (audio-stand-in.js, beside it): canonical() writes a graph as a tree from its endpoints back to
// its sources. A node named in it, met on the way, is written as a ref to its name and not walked again, so a desk whose strips are all
// named is written once, strip by strip, however many ways the sound goes through it. A named node in the recording is written under its
// name as itself; one outside it, an endpoint, as what feeds it
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext, canonical, take } from './audio-stand-in.js';

// a strip into the sum, and from after its fader a send to the reverb, also into the sum
function desk() {
  const ctx = new StandInContext(() => 0);
  const g = () => ctx.createGain();
  const osc = ctx.createOscillator();
  const input = g();
  const fader = g();
  const send = g();
  const reverb = g();
  const sum = g();
  input.gain.value = 0.5; // a strip's own level: kept, though it's only a ref where it's met
  osc.connect(input);
  input.connect(fader);
  fader.connect(sum);
  fader.connect(send);
  send.connect(reverb);
  reverb.connect(sum);
  sum.connect(ctx.destination);
  return { ctx, input, reverb };
}
const tone = { into: 'in', node: 'oscillator', type: 'sine' };

test("a named node met on the way back is a ref to its name; it's written once under its name, as itself, with what feeds it", () => {
  const { ctx, input, reverb } = desk();
  const got = canonical(
    take(ctx, 0),
    new Map([
      [ctx.destination, 'destination'],
      [input, 'ambient'],
      [reverb, 'reverb'],
    ]),
  );
  const fader = { into: 'in', node: 'gain', inputs: [{ into: 'in', ref: 'ambient' }] };
  assert.deepEqual(got, {
    destination: {
      node: 'destination',
      inputs: [{ into: 'in', node: 'gain', inputs: [fader, { into: 'in', ref: 'reverb' }] }],
    },
    ambient: { node: 'gain', params: { gain: [['value', 0.5]] }, inputs: [tone] },
    reverb: { node: 'gain', inputs: [{ into: 'in', node: 'gain', inputs: [fader] }] },
  });
});

test('a named endpoint outside the recording, built before it, is written as what feeds it, as before', () => {
  const { ctx, input } = desk();
  const from = ctx.rec.nodes.length;
  ctx.createOscillator().connect(input);
  assert.deepEqual(canonical(take(ctx, from), new Map([[input, 'ambient']])), { ambient: [tone] });
});

test('with only the way out named, the tree is every path as before: the source written once for each', () => {
  const { ctx } = desk();
  const got = canonical(take(ctx, 0), new Map([[ctx.destination, 'destination']]));
  assert.equal(JSON.stringify(got).match(/oscillator/g).length, 2);
});

// a note's time worked out as its 16th comes (P3c1), from the grid's time added up step by step, lies a float's noise from where it was
// worked out at once: within a nanosecond of the start, written as the start
test('a time within a nanosecond of the start written as the start, a float’s noise; one further as it is', () => {
  const ctx = new StandInContext(() => 0);
  const input = ctx.createGain();
  const level = ctx.createGain();
  level.gain.setValueAtTime(0.5, 10 + 2.842170943040401e-14);
  level.gain.setValueAtTime(0.25, 10.001);
  level.connect(input);
  const [{ params }] = canonical(take(ctx, 1), new Map([[input, 'in']]), 10).in.inputs;
  assert.deepEqual(params.gain, [
    ['set', 0.5, 0],
    ['set', 0.25, 0.001],
  ]);
});
