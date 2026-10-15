// ---------- build/web-audio/blocks/noise: noise in Web Audio ----------
// A buffer of noise looping, its length its colour's (NOISE_SECONDS), running from the moment
// it's built, what it plays into gating it.
import { NOISE_SECONDS } from '../../../plan/blocks/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { settingOf, type Making } from '../making.ts';

export function noise(node: Node, making: Making): BuiltNode {
  const made = making.kept(making.context.createBufferSource());
  const colour = settingOf(node, 'colour') as keyof typeof NOISE_SECONDS; // one of its block's colours
  made.buffer = making.buffers.noise(NOISE_SECONDS[colour]);
  made.loop = true;
  making.started(made);
  return BuiltNode.of(made);
}
