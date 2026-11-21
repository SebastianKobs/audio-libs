// ---------- plan/blocks/room: a room, a designed impulse through a convolver ----------
// Beside the reverb, whose impulse is noise that fades as (1 - t)^2.5, its tail holding, then dropping: this one's dies
// evenly from its start (dsp/impulse/): a pre-delay, early taps, echoes growing dense, three bands each with a
// time of its own, held between 20 Hz and 10 kHz, the PCM-60's path.
// Mono in, stereo out. The six params are the design's; the rest of it stays the kernel's.
// A new design is a new buffer, which cuts the tail that was ringing.
import type { ParamSpecs } from '../../../base/params/index.ts';
import type { Block } from './block.ts';

const SPECS = {
  decay: { name: 'decay', unit: 's', range: [0.2, 8, 0.01], default: 1 }, // the middle band down 60 dB, up to the reverb's 8 s
  'pre delay': { name: 'pre delay', unit: 's', range: [0, 0.2, 0.001], default: 0.02 },
  taps: { name: 'taps', range: [0, 12, 1], default: 8 },
  dense: { name: 'dense', unit: 's', range: [0.005, 0.2, 0.001], default: 0.08 },
  'low decay': { name: 'low decay', range: [0.25, 2, 0.01], default: 1 }, // each band's time as a share of decay
  'high decay': { name: 'high decay', range: [0.1, 1, 0.01], default: 0.5 },
} as const satisfies ParamSpecs;

const { decay, taps, dense } = SPECS;

export default {
  kind: 'room',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out', channels: 2 }],
  params: [decay, SPECS['pre delay'], taps, dense, SPECS['low decay'], SPECS['high decay']],
  settings: [],
  tail: true,
} as const satisfies Block;
