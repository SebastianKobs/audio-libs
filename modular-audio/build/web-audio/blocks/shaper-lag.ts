// ---------- build/web-audio/blocks/shaper-lag: a dry held back as long as a shaper ----------
// A DelayNode at the lag of a WaveShaper oversampling as it's told (../shaper-lags.ts): the lags the builder is handed, as
// they were when it was made, Chromium's where it had none measured.
import { choiceAt, choiceIndex } from '../../../../base/params/index.ts';
import { OVERSAMPLE } from '../../../plan/blocks/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { valueOf, type Making } from '../making.ts';
import { toldParam } from '../param-units.ts';
import type { Oversampling } from '../shaper-lags.ts';

const LONGEST = 0.05; // s: past any browser's lag

export function shaperLag(node: Node, making: Making): BuiltNode {
  const { context, shaperLags } = making;
  const delay = making.kept(context.createDelay(LONGEST));
  let chosen = choiceIndex(OVERSAMPLE, String(valueOf(node, 'oversample')));
  const hold = (): void => {
    delay.delayTime.value = shaperLags[choiceAt(OVERSAMPLE, chosen) as Oversampling] / context.sampleRate; // one of its choices
  };
  hold();
  const oversample = toldParam(
    () => chosen,
    (index) => {
      chosen = index;
      hold();
    },
  );
  return new BuiltNode({ input: delay, output: delay, params: { oversample }, kind: "a DelayNode, a shaper's lag" });
}
