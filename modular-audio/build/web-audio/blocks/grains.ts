// ---------- build/web-audio/blocks/grains: grains in Web Audio ----------
// A worklet of its processor (processors/grains-processor.ts, the kernel of dsp/grains/): its six params its AudioParams,
// set, automated and cabled into as any. It's handed what it keeps, the block's GRAINS_MEMORY seconds,
// and a seed drawn once from the builder's random: one seed, one cloud.
// Where its worklet isn't loaded: nothing stands for it, a placeholder passes the sound through.
import { GRAINS_MEMORY } from '../../../plan/blocks/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import type { BuiltNode } from '../built-node.ts';
import type { Making } from '../making.ts';
import { drawnSeed, workletEffect } from './worklet-effect.ts';

export function grains(node: Node, making: Making): BuiltNode | null {
  const processorOptions = { memory: GRAINS_MEMORY, seed: drawnSeed(making) };
  return (
    workletEffect(node, making, { processor: 'grains', processorOptions, kind: 'a grains worklet' })?.built ?? null
  );
}
