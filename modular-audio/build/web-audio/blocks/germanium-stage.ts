// ---------- build/web-audio/blocks/germanium-stage: a germanium transistor stage in Web Audio ----------
// A worklet of its processor (processors/germanium-stage-processor.ts, the kernel of dsp/circuits/): its drive, level
// and voicing its AudioParams, set, automated and cabled into as any, its voicing by its index.
// Where its worklet isn't loaded: nothing stands for it, a placeholder passes the sound through.
import type { Node } from '../../../plan/format/index.ts';
import type { BuiltNode } from '../built-node.ts';
import type { Making } from '../making.ts';
import { workletEffect } from './worklet-effect.ts';

export function germaniumStage(node: Node, making: Making): BuiltNode | null {
  return (
    workletEffect(node, making, { processor: 'germanium stage', kind: 'a germanium stage worklet' })?.built ?? null
  );
}
