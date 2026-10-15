// ---------- build/web-audio/blocks/oscillator: an oscillator in Web Audio ----------
// Its wave, its frequency and detune; running from the moment it's built, as a hardware
// oscillator does, what it plays into gating it.
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { atValues, settingOf, type Making } from '../making.ts';

export function oscillator(node: Node, making: Making): BuiltNode {
  const made = making.kept(making.context.createOscillator());
  made.type = settingOf(node, 'wave') as OscillatorType; // one of its block's waves
  const built = atValues(BuiltNode.of(made), node);
  making.started(made);
  return built;
}
