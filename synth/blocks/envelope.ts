// ---------- libs/synth/blocks/envelope: an envelope generator ----------
// Its knobs over the note (patch.ts, stages.ts, I1h), cabled to the port it moves (target):
// 'vca.gain', 'osc 1.gain', 'noise 1.gain', 'filter.frequency', 'osc 1.frequency', 'oscs.frequency', 'fm 1.gain'. It's written as
// automation on its target (shapes.ts), once every block has offered its ports, and before the note's glides; the planner tells the blocks
// which ports an envelope moves before they plan, so a gain is built for one (an osc's level).
// The presets for patches, each its shape (I1h2), its amount the full level of the gain it moves unless it says; times as in values.ts:
// - perc(attack, decay): up over attack, then down to silence over decay; no release, it rings on
// - adsr({ attack, decay, sustain, release }): up, down to sustain (a share of its full level) over decay, held there until the note-off,
//   then down over release
// - swell({ delay, attack, release }): after delay, up over attack, held there; down over release from the note-off, where it says
// - stage(stage): a drone's harmonic, at its level from the start (stage 0), or joining at stage times rise; its level at any velocity
import type { Block } from '../plan-builder.ts';
import type { Envelope } from '../patch.ts';
import type { Time } from '../values.ts';
import { ENVELOPE_SPECS } from '../params.ts';

// what the presets are written with: their times; a share of its full level to sustain at; whether it follows the note's velocity
interface Adsr {
  attack: Time;
  decay: Time;
  sustain: number;
  release: Time;
  velocity?: boolean;
}
interface Swell {
  attack: Time;
  delay?: Time;
  release?: Time;
  velocity?: boolean;
}

export function perc(attack: Time, decay: Time): Envelope {
  return { attack, decay, sustain: 0 }; // no release: it rings on
}
export function adsr({ attack, decay, sustain, release, velocity }: Adsr): Envelope {
  return { ...velocityOf(velocity), attack, decay, sustain, release };
}

// whether its amount follows the note's velocity, where it says
function velocityOf(velocity: boolean | undefined): Pick<Envelope, 'velocity'> {
  return velocity === undefined ? {} : { velocity };
}
export function swell({ attack, delay, release, velocity }: Swell): Envelope {
  return {
    ...velocityOf(velocity),
    ...(delay === undefined ? {} : { delay }),
    attack,
    ...(release === undefined ? {} : { release }),
  };
}
export function stage(stageIndex: number): Envelope {
  if (!stageIndex) {
    return { velocity: false };
  }
  return { velocity: false, delay: `${stageIndex} rise`, attack: '1.5 rise in 0.15..' };
}

export default {
  key: 'envelopes',
  many: true,
  paramSpecs: ENVELOPE_SPECS,
  plan(envelope, builder) {
    builder.envelope(envelope);
  },
} satisfies Block<Envelope>;
