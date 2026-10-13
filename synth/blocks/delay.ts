// ---------- libs/synth/blocks/delay: a delay line, for an FX module ----------
// A delay with a lowpass in its loop, so every repeat is darker than the last: its time (seconds, or a note value, from the length of a
// beat; or a param holding one: 'time'), its feedback (how much of each repeat comes round again), its tone (the lowpass, in hertz) and
// the longest time it can take (max, 4 s). It goes in at the delay and out from the lowpass. With the patch's handle.tempo, it follows
// a new beat, gliding (tc). Its ports: 'delay', 'delay.time', 'delay.feedback', 'delay.tone'
import { time, val } from '../values.ts';
import type { Block } from '../plan-builder.ts';
import type { Delay } from '../patch.ts';
import type { ParamSpecs } from '../params.ts';

// a delay line's time as a note length, shortest first: up to a dotted half, which fits its 4 s at 50 BPM
const NOTE_LENGTHS = [
  '1/16t',
  '1/16',
  '1/16.',
  '1/8t',
  '1/8',
  '1/8.',
  '1/4t',
  '1/4',
  '1/4.',
  '1/2t',
  '1/2',
  '1/2.',
] as const;
// its values (params.ts): its time, seconds or one of the note lengths; its feedback, its tone, and the longest time it can take
const DELAY_SPECS = {
  time: { name: 'time', range: [0, 5, 0.01], choices: NOTE_LENGTHS },
  feedback: { name: 'feedback', range: [0, 0.95, 0.01] },
  tone: { name: 'tone', unit: 'Hz', range: [100, 12000, 10] },
  max: { name: 'max', unit: 's', range: [0.1, 10, 0.1], default: 4 },
} as const satisfies ParamSpecs;

export default {
  key: 'delay',
  paramSpecs: DELAY_SPECS,
  plan(delay, builder, _index, patch) {
    const values = builder.values;
    const line = builder.node('delay', 'delay', { max: delay.max ?? DELAY_SPECS.max.default });
    const lp = builder.node('biquad', 'delay', { type: 'lowpass' });
    const fb = builder.node('gain', 'delay');
    builder.value(line, 'delayTime', time(delay.time, values));
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
    if (tempo) {
      builder.handle('tempo', (beat: number, at: number) => [
        { id: line.id, param: 'delayTime', events: [['target', time(delay.time, { ...values, beat }), at, tempo.tc]] },
      ]);
    }
  },
} satisfies Block<Delay>;

// a delay's time in beats, as a track's controller carries it (G3c4): a note length's at its value, seconds at the beat
export function delayBeats(delayTime: string | number, beat: number): number {
  return time(delayTime, { beat, random: () => 0.5 }) / beat; // a time draws nothing
}
// a delay's time from beats: the note length it matches, or seconds at the beat where none does
export function delayTimeOf(beats: number, beat: number): string | number {
  const length = NOTE_LENGTHS.find((noteLength) => Math.abs(delayBeats(noteLength, beat) - beats) < 1e-9);
  return length ?? beats * beat;
}
