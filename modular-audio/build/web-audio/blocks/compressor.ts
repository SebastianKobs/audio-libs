// ---------- build/web-audio/blocks/compressor: a compressor in Web Audio ----------
// One DynamicsCompressorNode into a gain (back) that takes the node's make-up back, so a quiet sound passes at its level;
// the limiter does the same, for a hard knee.
// The make-up is worked out from the three params that set it (dsp/dynamics/), so each of them holds its value and
// tells the node's param and back the same way, set, ramped or glided.
import { gainOf } from '../../../../base/params/index.ts';
import { compressorMakeup, type CompressorSettings } from '../../../../dsp/dynamics/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { numberOf, type Making } from '../making.ts';
import { heldBy, ParamInUnits } from '../param-units.ts';

const SHAPING = ['threshold', 'knee', 'ratio'] as const;

export function compressor(node: Node, making: Making): BuiltNode {
  const made = making.kept(making.context.createDynamicsCompressor());
  const back = making.kept(making.context.createGain());
  made.connect(back);
  const held: CompressorSettings = {
    threshold: numberOf(node, 'threshold'),
    knee: numberOf(node, 'knee'),
    ratio: numberOf(node, 'ratio'),
  };
  const makeupGain = (settings: CompressorSettings): number => gainOf(-compressorMakeup(settings));
  const params: Record<string, unknown> = {
    attack: made.attack,
    release: made.release,
  };
  for (const name of SHAPING) {
    // the others as held now: a ramp's end is what it holds once told
    const behind = new ParamInUnits([
      [made[name], (value) => value],
      [back.gain, (value) => makeupGain({ ...held, [name]: value })],
    ]);
    const shaping = heldBy(behind, (value) => {
      held[name] = value;
    });
    shaping.value = held[name]; // the node's param and the make-up taken back, at the value it starts
    params[name] = shaping;
  }
  for (const name of ['attack', 'release'] as const) {
    made[name].value = numberOf(node, name);
  }
  return new BuiltNode({
    input: made,
    output: back,
    params,
    points: { in: made, out: back },
    readings: { reduction: () => -made.reduction },
    kind: 'a compressor, a DynamicsCompressorNode into its make-up taken back',
  });
}
