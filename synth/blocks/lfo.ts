// ---------- libs/synth/blocks/lfo: a slow wave that moves another block's param ----------
// It never follows the note. Its rate is hertz, or a note value (one turn in that time). Its depth is in its target's units: cents for a
// detune, hertz for a frequency, or a share of the note's frequency (ofNote), a share for a level; it can fade in after a delay, by a
// target or a line (curve: 'linear'). It starts with the note, or runs free. Its target is another block's port: 'osc 1.detune',
// 'oscs.detune', 'osc 1.frequency', 'filter.frequency', 'tremolo.gain', 'noise 1.gain', 'noise 1.frequency'
import { time, val } from '../values.ts';
import type { Block } from '../plan-builder.ts';
import type { Lfo } from '../patch.ts';
import type { ParamSpecs } from '../../params/index.ts';

// its values (params.ts): its rate and depth, its fade-in after a delay, by a target or a line, and its stop; its depth in its target's
// units
const LFO_SPECS = {
  rate: { name: 'rate', unit: 'Hz', range: [0.01, 20, 0.01] },
  depth: { name: 'depth', range: [0, 1000, 0.1] },
  delay: { name: 'delay', unit: 's', range: [0, 5, 0.01], default: 0 },
  fade: { name: 'fade', unit: 's', range: [0, 5, 0.01] },
  curve: { name: 'curve', choices: ['target', 'linear'], default: 'target' },
  stop: { name: 'stop', unit: 's', range: [0, 10, 0.01] },
} as const satisfies ParamSpecs;

export default {
  key: 'lfos',
  many: true,
  paramSpecs: LFO_SPECS,
  plan(lfo, builder, index) {
    const values = builder.values;
    const oscillator = builder.node('oscillator', `lfo ${index}`);
    const amount = builder.node('gain', `lfo ${index}`);
    const rate = val(lfo.rate, values);
    const depth = val(lfo.depth, values) * (lfo.ofNote ? builder.frequency : 1);
    builder.value(oscillator, 'frequency', typeof rate === 'string' ? 1 / time(rate, values) : rate);
    if (lfo.fade === undefined) {
      builder.value(amount, 'gain', depth);
    } else {
      builder.automate(
        amount,
        'gain',
        ['set', 0, 0],
        lfo.curve === 'linear' ?
          ['linear', depth, time(lfo.delay ?? LFO_SPECS.delay.default, values) + time(lfo.fade, values)]
        : ['target', depth, time(lfo.delay ?? LFO_SPECS.delay.default, values), time(lfo.fade, values)],
      );
    }
    builder.link(oscillator, amount);
    builder.into(amount, lfo.target);
    if (lfo.free) {
      oscillator.starts.push([]);
    } else {
      builder.start(oscillator);
    }
    builder.stop(oscillator, lfo.stop);
    builder.sources.push(oscillator);
  },
} satisfies Block<Lfo>;
