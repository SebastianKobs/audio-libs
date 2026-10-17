// The tests' voice card, as an architecture writes it (mockup/src/libs/plan/synth/test/): an oscillator through a VCA
// its envelope moves, out; the note's frequency, gate and velocity its macros.
export const PLUCK = {
  kind: 'Pluck',
  form: 'architecture',
  outputs: [{ name: 'out' }],
  children: [
    { name: 'osc 1', kind: 'VCO', role: 'source' },
    { name: 'amp', kind: 'Envelope generator', role: 'modulator', values: { attack: 0.005, decay: 0.4, sustain: 0 } },
    { name: 'vca', kind: 'VCA', role: 'stage', values: { gain: 0 } },
    { name: 'out', kind: 'Out', role: 'out' },
  ],
  wires: [
    { from: { node: 'osc 1', output: 'out' }, to: { node: 'vca', input: 'in' } },
    { from: { node: 'vca', output: 'out' }, to: { node: 'out', input: 'in' } },
    { from: { node: 'out', output: 'out' }, to: { output: 'out' } },
    { from: { node: 'amp', output: 'out' }, to: { node: 'vca', param: 'gain' } },
  ],
  macros: [
    { name: 'frequency', maps: [{ to: ['osc 1', 'frequency'], factor: 1, offset: 0 }] },
    { name: 'gate', maps: [{ to: ['amp', 'gate'], factor: 1, offset: 0 }] },
    { name: 'velocity', maps: [{ to: ['amp', 'velocity'], factor: 1, offset: 0 }] },
  ],
};
// The pluck as a file of instruments writes it, its kind its name there; and the tests' file: the pluck by its name, two
// patches on it, a rack of one pad.
const { kind: _kind, form: _form, outputs: _outputs, ...card } = PLUCK;
export const PLUCK_CARD = card;
export const PLUCK_FILE = {
  instruments: { Pluck: PLUCK_CARD },
  patches: {
    bright: { instrument: 'Pluck', values: { 'osc 1/tune': 12 } },
    rtlprnf: { instrument: 'Pluck', settings: { 'osc 1/osc/wave': 'triangle' } },
  },
  racks: { kit: [{ key: 38, patch: 'bright' }] },
};
