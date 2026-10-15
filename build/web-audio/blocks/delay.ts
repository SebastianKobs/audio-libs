// ---------- build/web-audio/blocks/delay: a delay in Web Audio ----------
// Made for its longest time; its time with a sync switch, synced a note value at the beat,
// free in ms, turned into seconds by the clock's note values.
import { timeSeconds } from '../../../clock/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { settingOf, valueOf, type Making } from '../making.ts';

export function delay(node: Node, making: Making): BuiltNode {
  const made = making.kept(making.context.createDelay(Number(settingOf(node, 'longest'))));
  const time = {
    sync: valueOf(node, 'sync') === 1,
    note: String(valueOf(node, 'note')),
    free: Number(valueOf(node, 'ms')),
    unit: 'ms',
  } as const;
  made.delayTime.value = timeSeconds(time, making.beat());
  return BuiltNode.of(made);
}
