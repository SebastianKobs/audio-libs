// ---------- libs/synth/blocks/osc: a tone ----------
// A wave at a ratio to the note, or in hertz: an instrument gets pitches only, the key the caller's (G0.1d). With a level, or a level an envelope moves (blocks/envelope.ts: its level's gain built for one cabled to it), or straight into where it goes
// (into: the chain, or a port such as 'ring 1'). Detunes make one osc for each, sharing its level, or each with a level of its own (levels:
// 'each'). An envelope cabled to its frequency moves its pitch (a scoop into the note). With the patch's glide, it slides to the note's
// glides, after its envelopes; the handle glides it on (a vine's phrase note).
// Its ports: 'osc 1.gain' (its level), 'osc 1.frequency', 'osc 1.detune', and every osc's, 'oscs.frequency', 'oscs.detune'
import { mtof } from '../../music-theory/index.ts';
import type { Block, PlanBuilder } from '../plan-builder.ts';
import type { Osc, Patch } from '../patch.ts';
import type { PlanNode } from '../../audio-plan/index.ts';
import type { ParamSpecs } from '../../params/index.ts';
import { LEVEL_SPEC, RATIO_SPEC, STOP_SPEC } from '../params.ts';
import { DETUNE, WAVE } from '../../plan/blocks/index.ts';

// its values (params.ts): its wave; its frequency, by one of them; its detune, level and stop
const OSC_SPECS = {
  wave: WAVE,
  hz: { name: 'hz', unit: 'Hz', range: [20, 20000, 1] },
  ratio: { ...RATIO_SPEC, default: 1 },
  detune: DETUNE,
  level: LEVEL_SPEC,
  stop: STOP_SPEC,
} as const satisfies ParamSpecs;

export default {
  key: 'oscs',
  many: true,
  paramSpecs: OSC_SPECS,
  plan(osc, builder, index, patch) {
    const frequency = baseFrequency(osc, builder);
    const levelled = osc.level !== undefined || builder.moves(`osc ${index}.gain`);
    const shared = levelled && osc.levels !== 'each' ? levelGain(osc, builder, index) : null;
    for (const detune of osc.detune === undefined ? [undefined] : ([] as number[]).concat(osc.detune)) {
      const oscillator = sounding(osc, builder, index, patch, frequency, detune);
      if (shared) {
        builder.link(oscillator, shared);
      } else if (levelled) {
        builder.link(oscillator, levelGain(osc, builder, index));
      } else {
        builder.into(oscillator, osc.into);
      }
      offerPorts(builder, index, oscillator, frequency);
      builder.oscs.push(oscillator);
      builder.sources.push(oscillator);
    }
    handleGlides(builder, patch);
  },
} satisfies Block<Osc>;

// its frequency: in hertz, or at its ratio to the note's
function baseFrequency(osc: Osc, builder: PlanBuilder): number {
  if (osc.hz !== undefined) {
    return osc.hz;
  }
  return builder.frequency * (osc.ratio ?? OSC_SPECS.ratio.default);
}
// its level's gain, into where it goes
function levelGain(osc: Osc, builder: PlanBuilder, index: number): PlanNode {
  const gain = builder.levelGain(`osc ${index}`, osc.level);
  builder.into(gain, osc.into);
  return gain;
}
// one oscillator, at its frequency and detune, sliding to the note's glides with the patch's glide, started and stopped
function sounding(
  osc: Osc,
  builder: PlanBuilder,
  index: number,
  patch: Patch,
  frequency: number,
  detune: number | undefined,
): PlanNode {
  const oscillator = builder.node('oscillator', `osc ${index}`, { type: osc.wave ?? OSC_SPECS.wave.default });
  builder.value(oscillator, 'frequency', frequency);
  if (detune !== undefined) {
    builder.value(oscillator, 'detune', detune);
  }
  const glides = builder.values.pitchGlides;
  const glide = patch.note?.glide;
  if (glide !== undefined && glides) {
    builder.later(() => {
      for (const [at, pitch] of glides) {
        builder.automate(oscillator, 'frequency', ['target', mtof(pitch + builder.transpose), at, glide]);
      }
    });
  }
  builder.start(oscillator);
  builder.stop(oscillator, osc.stop);
  return oscillator;
}
// its ports, its own and every osc's: its frequency and its detune
function offerPorts(builder: PlanBuilder, index: number, oscillator: PlanNode, frequency: number): void {
  for (const name of ['frequency', 'detune']) {
    const base = name === 'frequency' ? frequency : 0;
    builder.offer(`osc ${index}.${name}`, oscillator, name, { base });
    builder.offer(`oscs.${name}`, oscillator, name, { base });
  }
}
// the handle's: a glide on to a new pitch (a vine's phrase note)
function handleGlides(builder: PlanBuilder, patch: Patch): void {
  if (!patch.handle?.glide) {
    return;
  }
  builder.handle('glide', (pitch: number, at: number) =>
    builder.oscs.map((node) => ({
      id: node.id,
      param: 'frequency',
      events: [['target', mtof(pitch + builder.transpose), at, patch.note!.glide!]], // a patch whose handle glides has a glide
    })),
  );
}
