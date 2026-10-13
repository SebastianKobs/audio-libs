// ---------- libs/synth/blocks/pan: a stage that pans ----------
// A stereo pan, its position from -1 left to 1 right, 0 centred; centred, still a pan, so what sets it later has one. A mono sound is
// made stereo before it, so it isn't 3 dB down in the middle, as the mixer's pans are; or, written so ({ position, mono: 'pan pot' }),
// panned as a console's pan pot, constant power, as a replay track's is. How is the engine's. Its ports: 'pan', 'pan.pan'
import type { Block } from '../plan-builder.ts';
import { val } from '../values.ts';
import type { Pan } from '../patch.ts';

export default {
  key: 'pan',
  paramSpecs: {
    name: 'pan',
    range: [-1, 1, 0.01],
    parts: {
      position: { name: 'position', range: [-1, 1, 0.01] },
      mono: { name: 'mono', choices: ['up-mix', 'pan pot'], default: 'up-mix' },
    },
  },
  plan(written, builder) {
    const { position, mono } = asPan(written);
    const pan = builder.node('panner', 'pan', mono === 'pan pot' ? { mono } : {}); // up-mixed, the engine's way unless told
    builder.value(pan, 'pan', val(position, builder.values));
    builder.offer('pan', pan);
    builder.offer('pan.pan', pan, 'pan');
  },
} satisfies Block<number | Pan>;

// a pan as written: its position alone, or with how it pans a mono sound
function asPan(written: number | Pan): Pan {
  if (typeof written === 'object') {
    return written;
  }
  return { position: written };
}
