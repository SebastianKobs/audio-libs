// ---------- build/web-audio/blocks/crusher: a crusher in Web Audio ----------
// A worklet of its processor (processors/crusher-processor.ts, the kernel of libs/dsp/crusher/): its bits and rate its AudioParams,
// set, automated and cabled into as any.
// Where its worklet isn't loaded: nothing stands for it, a placeholder passes the sound through.
import type { Node } from '../../../plan/format/index.ts';
import type { BuiltNode } from '../built-node.ts';
import type { Making } from '../making.ts';
import { workletEffect } from './worklet-effect.ts';

export function crusher(node: Node, making: Making): BuiltNode | null {
  return workletEffect(node, making, { processor: 'crusher', kind: 'a crusher worklet' })?.built ?? null;
}
