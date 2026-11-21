// Scenario 5: an instrument as a library's user writes it: a file of instruments
// on the synth's modules, a patch planned, built for Web Audio into a context handed
// in, played by a note; no view, desk or sequencer.
// Two sources on one instrument, as a game plays it with no sequencer: a creature heard from
// its own place, an input of its own into a panner; the ambience summed, the instrument's own input.
import { instrumentsOf } from '../../modular-audio/plan/instrument/index.ts';
import { MODULE_TEMPLATES } from '../../modular-audio/plan/instrument/content.ts';
import { WebAudioBuilder } from '../../modular-audio/build/web-audio/index.ts';
import { Instrument } from '../../modular-audio/build/instrument/index.ts';
import { noteMessages } from '../../midi/protocol/index.ts';

// a file of instruments: a pluck, an oscillator through a VCA, and a patch on it
const FILE = {
  instruments: {
    Pluck: {
      children: [
        { name: 'osc', kind: 'VCO', role: 'source' },
        {
          name: 'amp',
          kind: 'Envelope generator',
          role: 'modulator',
          values: { attack: 0.005, decay: 0.4, sustain: 0 },
        },
        { name: 'vca', kind: 'VCA', role: 'stage', values: { gain: 0 } },
        { name: 'out', kind: 'Out', role: 'out' },
      ],
      wires: [
        { from: { node: 'osc', output: 'out' }, to: { node: 'vca', input: 'in' } },
        { from: { node: 'vca', output: 'out' }, to: { node: 'out', input: 'in' } },
        { from: { node: 'out', output: 'out' }, to: { output: 'out' } },
        { from: { node: 'amp', output: 'out' }, to: { node: 'vca', param: 'gain' } },
      ],
      macros: [
        { name: 'frequency', maps: [{ to: ['osc', 'frequency'], factor: 1, offset: 0 }] },
        { name: 'gate', maps: [{ to: ['amp', 'gate'], factor: 1, offset: 0 }] },
        { name: 'velocity', maps: [{ to: ['amp', 'velocity'], factor: 1, offset: 0 }] },
      ],
    },
  },
  patches: { bright: { instrument: 'Pluck', values: { 'osc/tune': 12 } } },
};

// the patch's instrument built into the context's destination; a creature's A through a panner
// of its own, and a C on the instrument's own input, both played
export function playTwoSources(context) {
  const instruments = instrumentsOf(FILE, 'scenario 5', MODULE_TEMPLATES);
  const builder = new WebAudioBuilder({ context, beat: () => 0.5 });
  const making = { instruments, patch: 'bright', builder, into: context.destination, at: (t) => t };
  const instrument = new Instrument({ ...making, now: () => context.currentTime });
  const creaturePan = context.createStereoPanner();
  creaturePan.connect(context.destination);
  const creature = instrument.input(() => creaturePan);
  creature.receive(noteMessages({ pitch: 69, velocity: 1, t: 0.1 }, 1));
  instrument.receive(noteMessages({ pitch: 64, velocity: 1, t: 0.1 }, 1));
  return { instrument, creaturePan };
}
