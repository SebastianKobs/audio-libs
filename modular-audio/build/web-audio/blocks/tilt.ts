// ---------- build/web-audio/blocks/tilt: a tilt EQ in Web Audio ----------
// A low shelf into a high shelf, both at its pivot: its tilt, a share, the highs up by half of it in dB and the lows down
// by half, as a BiquadFilterNode's gain is in dB.
import { dBOf } from '../../../../base/params/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { numberOf, type Making } from '../making.ts';
import { ParamInUnits } from '../param-units.ts';

export function tilt(node: Node, making: Making): BuiltNode {
  const shelf = (type: BiquadFilterType): BiquadFilterNode => {
    const made = making.kept(making.context.createBiquadFilter());
    made.type = type;
    return made;
  };
  const low = shelf('lowshelf');
  const high = shelf('highshelf');
  low.connect(high);
  const params = {
    tilt: new ParamInUnits([
      [low.gain, (share) => -dBOf(share) / 2],
      [high.gain, (share) => dBOf(share) / 2],
    ]),
    frequency: new ParamInUnits([
      [low.frequency, (hz) => hz],
      [high.frequency, (hz) => hz],
    ]),
  };
  params.tilt.value = numberOf(node, 'tilt');
  params.frequency.value = numberOf(node, 'frequency');
  return new BuiltNode({ input: low, output: high, params, kind: 'a tilt, two shelving BiquadFilterNodes' });
}
