// ---------- libs/synth/blocks/delay: a delay line, for an FX module ----------
// A delay with a lowpass in its loop, so every repeat is darker than the last. Its values:
//   - its time, with a sync switch (sync): synced, a note value (note) at the beat; free, in ms (ms);
//   - its feedback: how much of each repeat comes round again;
//   - its tone: the lowpass, in hertz;
//   - max: the longest time it can take, 4 s.
// Each a value, or a param it names: 'sync', 'note', 'ms'.
// It goes in at the delay and out from the lowpass.
// While synced, with the patch's handle.tempo, it follows a new beat, gliding (tc).
// Its ports: 'delay', 'delay.time', 'delay.feedback', 'delay.tone'.
import { val, wordOf, type Values } from '../values.ts';
import type { Block } from '../plan-builder.ts';
import type { Delay } from '../patch.ts';
import type { ParamSpecs, Time } from '../../params/index.ts';
import { DELAY_TIME } from '../../plan/blocks/index.ts';
import { timeSeconds } from '../../clock/index.ts';

// its values (params.ts): its time, its feedback, its tone, and the longest time it can take
const DELAY_SPECS = {
  ...DELAY_TIME,
  feedback: { name: 'feedback', range: [0, 0.95, 0.01] },
  tone: { name: 'tone', unit: 'Hz', range: [100, 12000, 10] },
  max: { name: 'max', unit: 's', range: [0.1, 10, 0.1], default: 4 },
} as const satisfies ParamSpecs;

export default {
  key: 'delay',
  paramSpecs: DELAY_SPECS,
  plan(delay, builder, _index, patch) {
    const values = builder.values;
    const time = timeOf(delay, values);
    const line = builder.node('delay', 'delay', { max: delay.max ?? DELAY_SPECS.max.default });
    const lp = builder.node('biquad', 'delay', { type: 'lowpass' });
    const fb = builder.node('gain', 'delay');
    builder.value(line, 'delayTime', seconds(time, values.beat));
    builder.value(lp, 'frequency', val(delay.tone, values));
    builder.value(fb, 'gain', val(delay.feedback, values));
    builder.link(line, lp);
    builder.link(lp, fb);
    builder.link(fb, line);
    builder.offer('delay', line);
    builder.exit('delay', lp);
    builder.offer('delay.time', line, 'delayTime');
    builder.offer('delay.feedback', fb, 'gain');
    builder.offer('delay.tone', lp, 'frequency');
    const tempo = patch.handle?.tempo;
    if (tempo && time.sync) {
      builder.handle('tempo', (beat: number, at: number) => [
        { id: line.id, param: 'delayTime', events: [['target', seconds(time, beat), at, tempo.tc]] },
      ]);
    }
  },
} satisfies Block<Delay>;

// its time as its values set it: its note a value, or the param it names
function timeOf(delay: Delay, values: Values): Time {
  return {
    sync: val(delay.sync, values) === 1,
    note: wordOf(delay.note, values),
    free: val(delay.ms, values),
    unit: 'ms',
  };
}
// its time in seconds at a beat; synced, it needs one
function seconds(time: Time, beat = 0): number {
  if (time.sync && !(beat > 0)) {
    throw new Error(`a synced delay with no beat: ${time.note}`);
  }
  return timeSeconds(time, beat);
}
