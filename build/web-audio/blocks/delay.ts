// ---------- build/web-audio/blocks/delay: a delay in Web Audio ----------
// Made for its longest time. Its time with a sync switch, three params side by side, moving its one
// delay line: synced, its note at the beat; free, its ms; turned into seconds by the clock's note values.
// While synced, a new tempo followed, gliding.
// A signal wired into its ms goes into the line's own time: it moves the line in seconds, as
// Web Audio's does, whichever of the three sets it (a tape's wobble, 0.004 four ms either way).
import { timeSeconds } from '../../../clock/index.ts';
import { NOTE_VALUES } from '../../../params/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import type { When } from '../../../automation/index.ts';
import { BuiltNode } from '../built-node.ts';
import { settingOf, valueOf, type Making } from '../making.ts';
import type { Automatable } from '../param-units.ts';

// a delay's time as its three params hold it: its switch, its note by its index, its ms, and the beat
interface TimeHeld {
  sync: number;
  note: number;
  ms: number;
  beat: number;
}

// s: a new tempo glided into, as the FX chains' delay lines do
const TEMPO_GLIDE = 0.3;

export function delay(node: Node, making: Making): BuiltNode {
  const made = making.kept(making.context.createDelay(Number(settingOf(node, 'longest'))));
  const time = new DelayTime(made.delayTime, {
    sync: Number(valueOf(node, 'sync')),
    note: NOTE_VALUES.indexOf(String(valueOf(node, 'note'))),
    ms: Number(valueOf(node, 'ms')),
    beat: making.beat(),
  });
  making.followsTempo((beat, when, now) => time.tempo(beat, when, now));
  return new BuiltNode({
    input: made,
    output: made,
    params: { sync: time.param('sync'), note: time.param('note'), ms: time.param('ms') },
    cables: { ms: [made.delayTime] },
    kind: 'a DelayNode',
  });
}

// A delay's time: its three params, each moving its one delay line to the seconds they make together.
// A change to one lands as its event does, now, at a time, ramping or gliding, the line moved alike.
class DelayTime {
  readonly #line: AudioParam;
  readonly #held: TimeHeld;

  constructor(line: AudioParam, held: TimeHeld) {
    this.#line = line;
    this.#held = held;
    line.value = this.#seconds();
  }
  // one of its three params, as a param is automated
  param(name: 'sync' | 'note' | 'ms'): Automatable {
    const line = this.#line;
    const held = this.#held;
    const at = (value: number): number => {
      held[name] = value;
      return this.#seconds();
    };
    return {
      get value() {
        return held[name];
      },
      set value(value: number) {
        line.value = at(value);
      },
      setValueAtTime: (value, time) => line.setValueAtTime(at(value), time),
      linearRampToValueAtTime: (value, time) => line.linearRampToValueAtTime(at(value), time),
      exponentialRampToValueAtTime: (value, time) => line.exponentialRampToValueAtTime(at(value), time),
      setTargetAtTime: (value, time, constant) => line.setTargetAtTime(at(value), time, constant),
      cancelScheduledValues: (time) => line.cancelScheduledValues(time),
    };
  }
  // a new beat: while synced, the line glided there, by its own glide unless told otherwise; free, left
  tempo(beat: number, { at, glide = at === undefined ? TEMPO_GLIDE : undefined }: When, now: number): void {
    this.#held.beat = beat;
    if (this.#held.sync !== 1) {
      return;
    }
    if (glide !== undefined) {
      this.#line.setTargetAtTime(this.#seconds(), now, glide);
      return;
    }
    this.#line.setValueAtTime(this.#seconds(), at ?? now);
  }

  // its seconds, as its params hold it
  #seconds(): number {
    const { sync, note, ms, beat } = this.#held;
    return timeSeconds({ sync: sync === 1, note: NOTE_VALUES[note] ?? NOTE_VALUES[0]!, free: ms, unit: 'ms' }, beat);
  }
}
