// ---------- build/web-audio/blocks/shaper: a shaper in Web Audio ----------
// A WaveShaper, its curve made from its drive and shape (dsp/saturation/), made again each time either is told;
// its oversampling Web Audio's own ('none', '2x', '4x'), as its choices are named.
// A curve is no AudioParam: a change lands as it's told, at no time of its own; nothing is cabled into it.
import { choiceAt, choiceIndex } from '../../../../base/params/index.ts';
import { shaperCurve } from '../../../../dsp/saturation/index.ts';
import { SHAPER_SPECS } from '../../../plan/blocks/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { numberOf, valueOf, type Making } from '../making.ts';
import { toldParam } from '../param-units.ts';

export function shaper(node: Node, making: Making): BuiltNode {
  const made = making.kept(making.context.createWaveShaper());
  const held = { drive: numberOf(node, 'drive'), shape: numberOf(node, 'shape') };
  const bend = (): void => {
    made.curve = shaperCurve(held.drive, held.shape);
  };
  const bentBy = (name: keyof typeof held) =>
    toldParam(
      () => held[name],
      (value) => {
        held[name] = value;
        bend();
      },
    );
  let oversampled = choiceIndex(SHAPER_SPECS.oversample, String(valueOf(node, 'oversample')));
  const oversample = (index: number): void => {
    oversampled = index;
    made.oversample = choiceAt(SHAPER_SPECS.oversample, index) as OverSampleType; // its choices Web Audio's own
  };
  oversample(oversampled);
  bend();
  return new BuiltNode({
    input: made,
    output: made,
    params: { drive: bentBy('drive'), shape: bentBy('shape'), oversample: toldParam(() => oversampled, oversample) },
    kind: 'a WaveShaperNode',
  });
}
