// ---------- build/web-audio/blocks/room: a designed room in Web Audio ----------
// One ConvolverNode playing libs/dsp/impulse/'s impulse, which has energy 1 a side: normalizing is off, so a click comes
// back with energy 1 and the level after it is the room's level. The node's own normalizing scales an impulse by a rule of
// its own, and the reverb takes it.
// One channel in, explicit: left and right summed before the room, as the PCM-60's input was; the two sides of the impulse
// put it back in stereo.
// Each of the six params holds its value and sets the buffer anew from the context's `Buffers`: a design asked again
// draws nothing.
import type { ImpulseDesign } from '../../../../dsp/impulse/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { numberOf, type Making } from '../making.ts';
import { toldParam } from '../param-units.ts';

type Design = Record<'decay' | 'pre delay' | 'taps' | 'dense' | 'low decay' | 'high decay', number>;

const NAMES: readonly (keyof Design)[] = ['decay', 'pre delay', 'taps', 'dense', 'low decay', 'high decay'];

export function room(node: Node, making: Making): BuiltNode {
  const made = making.kept(making.context.createConvolver());
  made.normalize = false; // before the buffer: the node reads it as the buffer is set
  made.channelCount = 1;
  made.channelCountMode = 'explicit';
  const design = Object.fromEntries(NAMES.map((name) => [name, numberOf(node, name)])) as Design;
  made.buffer = making.buffers.room(impulseDesignOf(design));
  const params = Object.fromEntries(
    NAMES.map((name) => [
      name,
      toldParam(
        () => design[name],
        (value) => {
          design[name] = value;
          made.buffer = making.buffers.room(impulseDesignOf(design));
        },
      ),
    ]),
  );
  return new BuiltNode({ input: made, output: made, params, kind: 'a designed room, a ConvolverNode' });
}

// the impulse's design from the block's params: its low and high bands' times round the middle's
function impulseDesignOf(design: Design): ImpulseDesign {
  return {
    decay: design.decay,
    preDelay: design['pre delay'],
    taps: design.taps,
    dense: design.dense,
    decays: [design['low decay'], 1, design['high decay']],
  };
}
