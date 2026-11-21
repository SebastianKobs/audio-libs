// The instrument modules the visual ideas added (libs/modular-audio/plan/instrument/modules/), played from a patch's plan on
// the Web Audio builder's stand-in, its worklets loaded:
//   - a lead: a SyncVCO through a VCA, out through a Panned out, the note's pan handed to the card that has it;
//   - the note's pan set on its own voice's panner as it starts, a note with none in the middle;
//   - a saturating filter ahead of the VCA stopped as its voice falls silent, and let go once it has rung out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Voices } from '../../modular-audio/build/instrument/index.ts';
import { WebAudioBuilder } from '../../modular-audio/build/web-audio/index.ts';
import { StandInContext } from '../../modular-audio/build/web-audio/test/audio-stand-in.js';
import { standInWorklets } from '../../modular-audio/build/web-audio/test/worklet-nodes.js';
import { instrumentsOf, patchPlan } from '../../modular-audio/plan/instrument/index.ts';
import { MODULE_TEMPLATES } from '../../modular-audio/plan/instrument/content.ts';
import { noteMessages } from '../../midi/protocol/index.ts';

const into = (from, to) => ({ from: { node: from, output: 'out' }, to: { node: to, input: 'in' } });
const onto = (from, to, param) => ({ from: { node: from, output: 'out' }, to: { node: to, param } });
const map = (node, param) => ({ to: [node, param], factor: 1, offset: 0 });
const MACROS = [
  { name: 'frequency', spec: { unit: 'Hz', range: [20, 20000, 0.01], default: 440 }, maps: [map('osc', 'frequency')] },
  { name: 'gate', spec: { range: [0, 1, 1], default: 0 }, maps: [map('amp', 'gate')] },
  { name: 'velocity', spec: { range: [0, 1, 0.01], default: 1 }, maps: [map('amp', 'velocity')] },
  { name: 'volume', spec: { range: [0, 1, 0.001], default: 1 }, maps: [map('out', 'note volume')] },
  { name: 'pan', spec: { range: [-1, 1, 0.01], default: 0 }, maps: [map('out', 'pan')] },
];
const FILE = {
  instruments: {
    Lead: {
      children: [
        { name: 'osc', kind: 'SyncVCO', role: 'source' },
        { name: 'amp', kind: 'Envelope generator', role: 'modulator' },
        { name: 'vca', kind: 'VCA', role: 'stage' },
        { name: 'out', kind: 'Panned out', role: 'out' },
      ],
      wires: [
        into('osc', 'vca'),
        into('vca', 'out'),
        { from: { node: 'out', output: 'out' }, to: { output: 'out' } },
        onto('amp', 'vca', 'gain'),
      ],
      macros: MACROS,
    },
    Driven: {
      children: [
        { name: 'osc', kind: 'SyncVCO', role: 'source' },
        { name: 'tone', kind: 'SaturatingVCF', role: 'stage' },
        { name: 'amp', kind: 'Envelope generator', role: 'modulator' },
        { name: 'vca', kind: 'VCA', role: 'stage' },
        { name: 'out', kind: 'Panned out', role: 'out' },
      ],
      wires: [
        into('osc', 'tone'),
        into('tone', 'vca'),
        into('vca', 'out'),
        { from: { node: 'out', output: 'out' }, to: { output: 'out' } },
        onto('amp', 'vca', 'gain'),
      ],
      macros: MACROS,
    },
  },
  patches: {
    lead: { instrument: 'Lead', values: { 'vca/gain': 0 } },
    driven: { instrument: 'Driven', values: { 'vca/gain': 0 } },
  },
};
const INSTRUMENTS = instrumentsOf(FILE, 'test', MODULE_TEMPLATES);

// a patch's note at 1 s for half a second, on a stand-in context whose clock the test moves
function played(patch, { controllers = {} } = {}) {
  const clock = { now: 0 };
  const context = new StandInContext(() => clock.now);
  const plan = patchPlan(patch, INSTRUMENTS);
  const worklets = standInWorklets(['sync oscillator', 'saturating filter']);
  const built = new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5, worklets }).build(plan, {
    into: context.destination,
  });
  const voices = new Voices(built, plan, () => clock.now);
  voices.receive(noteMessages({ pitch: 60, velocity: 0.8, t: 1, duration: 0.5, controllers }, 0));
  const made = (kind) => context.rec.nodes.filter((node) => node.kind === kind);
  return { clock, voices, made, worklets: context.rec.nodes.filter((node) => node.kind === 'worklet') };
}

test("a patch planned with the added modules: its sync oscillator a block, the note's pan handed to the card that has it", () => {
  const [pool] = patchPlan('lead', INSTRUMENTS).node.pools;
  assert.deepEqual(pool.note.pan, [['pan']]);
  assert.deepEqual(pool.note.frequency, [['frequency']], "the library's sources kept");
  assert.equal(pool.child.children.find(({ name }) => name === 'osc').children[0].kind, 'sync oscillator');
});

test("a note's pan sets its own voice's panner as it starts; the panner is left as Web Audio makes it, a mono sound panned at constant power", () => {
  const { made } = played('lead', { controllers: { pan: -0.5 } });
  const [panner] = made('panner');
  assert.ok(
    panner.pan.events.some(([kind, value]) => kind === 'set' && value === -0.5),
    JSON.stringify(panner.pan.events),
  );
  assert.equal(panner.props.channelCountMode, undefined);
});

test('a note with no pan sits in the middle: nothing set on its panner', () => {
  const { made } = played('lead');
  const [panner] = made('panner');
  assert.equal(panner.pan.value, 0);
  assert.ok(!panner.pan.events.some(([kind]) => kind === 'set'));
});

test("a sync oscillator played: a worklet started at its note's time, its voice not yet sounding before it", () => {
  const { worklets } = played('lead');
  const [osc] = worklets;
  assert.equal(osc.extra.processor, 'sync oscillator');
  assert.deepEqual(osc.port.messages[0], { start: 1 });
});

test("a saturating filter ahead of the VCA is a voice's own: told once to stop as its note's gate closes, let go once it has rung out", () => {
  const { worklets, voices, clock } = played('driven');
  const [filter, ...others] = worklets.filter((node) => node.extra.processor === 'saturating filter');
  assert.ok(filter && others.length === 0, 'one saturating filter, built as a worklet');
  const stops = () => filter.port.messages.map(({ stop }) => stop).filter((stop) => stop !== undefined);
  assert.equal(stops().length, 1, 'told once');
  assert.ok(stops()[0] >= 1.5, `stopped at ${stops()[0]}, when its VCA has closed`);
  clock.now = 5;
  voices.receive([]);
  assert.deepEqual(stops().slice(1), [0], 'let go with its voice');
});
