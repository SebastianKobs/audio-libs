// ---------- build/web-audio/blocks/eq-band: an eq band in Web Audio ----------
// One BiquadFilterNode, its type Web Audio's own for each of the block's choices.
// Its gain a share, in dB there; its Q a plain ratio, which Web Audio reads in dB for a highpass, so it's told again,
// turned, as the type changes.
import { choiceIndex, dBOf } from '../../../../base/params/index.ts';
import { EQ_BAND_SPECS } from '../../../plan/blocks/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { numberOf, valueOf, type Making } from '../making.ts';
import { ParamInUnits, toldParam } from '../param-units.ts';

// Web Audio's type for each of the block's choices, in their order
const BIQUAD_TYPES: readonly BiquadFilterType[] = ['highpass', 'lowshelf', 'peaking', 'highshelf'];

export function eqBand(node: Node, making: Making): BuiltNode {
  const made = making.kept(making.context.createBiquadFilter());
  let typed = choiceIndex(EQ_BAND_SPECS.type, String(valueOf(node, 'type')));
  const resonance = new ParamInUnits([[made.Q, (q) => (BIQUAD_TYPES[typed] === 'highpass' ? dBOf(q) : q)]]);
  const gain = new ParamInUnits([[made.gain, dBOf]]);
  const type = (index: number): void => {
    typed = index;
    made.type = BIQUAD_TYPES[index]!; // one of its four, by the choices' order
    const ratio = resonance.value;
    resonance.value = ratio; // told again: a highpass's Q is in dB
  };
  resonance.value = numberOf(node, 'resonance');
  type(typed);
  made.frequency.value = numberOf(node, 'frequency');
  gain.value = numberOf(node, 'gain');
  return new BuiltNode({
    input: made,
    output: made,
    params: { type: toldParam(() => typed, type), frequency: made.frequency, gain, resonance },
    cables: { frequency: [made.frequency] },
    kind: 'an eq band, a BiquadFilterNode',
  });
}
