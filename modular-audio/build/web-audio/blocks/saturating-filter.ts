// ---------- build/web-audio/blocks/saturating-filter: a saturating filter in Web Audio ----------
// A worklet of its processor (processors/saturating-filter-processor.ts, the kernel of dsp/filters/), one input and one output,
// a filter a channel; its params its AudioParams, set, automated and cabled into as any, its mode by its index.
// A seed drawn once from the builder's random: the filter's own noise is drawn in the audio thread.
// Told { stop } as a source is: a voice's filter is a fresh node a note, and a processor never told to stop is never let go.
// Told nothing at its start; a desk's is never stopped while the desk stands.
// Where its worklet isn't loaded: the library's filter, at the mode's type and slope, its resonance a share worked into a Q.
// A pass-through would put a raw oscillator where a filtered bass was.
// Its drive, compensation and mode are held and move nothing.
import { BLOCKS, SATURATING_FILTER_SPECS } from '../../../plan/blocks/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { numberOf, standingIn, valueOf, type Making } from '../making.ts';
import { ParamInUnits } from '../param-units.ts';
import { filter } from './filter.ts';
import { heldAt } from './oscillator-instead.ts';
import { drawnSeed, workletEffect } from './worklet-effect.ts';
import { messaged } from './worklet-source.ts';

const { drive, compensation, mode } = SATURATING_FILTER_SPECS;

// The library's filter's type and slope for each mode: the ladder a 24 dB lowpass, the state-variable's three 12 dB.
const FILTERS: Readonly<Record<string, { type: string; slope: string }>> = {
  ladder: { type: 'lowpass', slope: '24' },
  lowpass: { type: 'lowpass', slope: '12' },
  bandpass: { type: 'bandpass', slope: '12' },
  highpass: { type: 'highpass', slope: '12' },
};
const FLAT_Q = Math.SQRT1_2; // the library filter's flat resonance, at a resonance of 0
const TOP_Q = 30; // the library filter's most, at a resonance of 1 [est.]

export function saturatingFilter(node: Node, making: Making): BuiltNode {
  const seed = drawnSeed(making);
  const effect = workletEffect(node, making, {
    processor: 'saturating filter',
    processorOptions: { seed },
    kind: 'a saturating filter worklet',
  });
  if (!effect) {
    return libraryFilter(node, making);
  }
  making.started(messaged(effect.worklet.port), () => undefined); // stopped by message, started by nothing
  return effect.built;
}

// The library's filter at the mode's type and slope, the resonance a share worked into its Q: the sound still filtered
// where the worklet is missing. Its drive and compensation a sound can be cabled into, going nowhere.
function libraryFilter(node: Node, making: Making): BuiltNode {
  const resonance = numberOf(node, 'resonance');
  const library = filter(stoodIn(node, qOf(resonance)), making);
  const shared = new ParamInUnits([[library.param('resonance')!, qOf]]); // the library filter's own, declared
  shared.value = resonance;
  const nowhere = making.kept(making.context.createGain()).gain;
  return new BuiltNode({
    input: library.input,
    output: library.output,
    params: {
      frequency: library.param('frequency'),
      detune: library.param('detune'),
      resonance: shared,
      drive: heldAt(node, drive),
      compensation: heldAt(node, compensation),
      mode: heldAt(node, mode),
    },
    cables: {
      frequency: library.cablesOf('frequency'),
      detune: library.cablesOf('detune'),
      resonance: [nowhere],
      drive: [nowhere],
      compensation: [nowhere],
      mode: [nowhere],
    },
    kind: 'a filter of biquads, for a saturating filter',
  });
}

// The node as the library's filter block plans it: the mode's type and slope, the frequency and the detune as they are, a Q.
function stoodIn(node: Node, q: number): Node {
  const values = { frequency: numberOf(node, 'frequency'), detune: numberOf(node, 'detune'), resonance: q };
  return standingIn(node, BLOCKS.filter, { values, choices: FILTERS[String(valueOf(node, 'mode'))]! }); // one of the mode's choices
}

// the library filter's Q for a resonance of 0 to 1: flat at 0, its top at 1, by octaves between
function qOf(resonance: number): number {
  return FLAT_Q * (TOP_Q / FLAT_Q) ** resonance;
}
