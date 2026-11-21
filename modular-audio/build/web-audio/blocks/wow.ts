// ---------- build/web-audio/blocks/wow: a tape's wow in Web Audio ----------
// A looping AudioBufferSourceNode of 64 s of drift: 512000 frames at 8000 Hz, as it moves under 10 Hz, so a low rate holds it.
// Made from a generator of its own (dsp/wow/), seeded by one draw from the builder's random: the desk draws from one
// stream, and 512000 draws would move every noise and impulse made after it.
// Its frequency the node's playback rate, a rate of 1 being the curve at about 1 Hz. Started with the rest.
import { seeded } from '../../../../base/util/index.ts';
import { wowCurve } from '../../../../dsp/wow/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode, webAudioNode } from '../built-node.ts';
import { numberOf, type Making } from '../making.ts';

const WOW_FRAMES = 512000;
const WOW_RATE = 8000; // Hz
const SEED_RANGE = 2 ** 32;

export function wow(node: Node, making: Making): BuiltNode {
  const made = making.kept(making.context.createBufferSource());
  const buffer = making.context.createBuffer(1, WOW_FRAMES, WOW_RATE);
  buffer.getChannelData(0).set(wowCurve(WOW_FRAMES, WOW_RATE, seeded(Math.floor(making.random() * SEED_RANGE))));
  made.buffer = buffer;
  made.loop = true;
  made.playbackRate.value = numberOf(node, 'frequency');
  making.started(made);
  return new BuiltNode({
    input: made,
    output: made,
    params: { frequency: made.playbackRate },
    cables: { frequency: [made.playbackRate] },
    node: webAudioNode(made),
    kind: 'an AudioBufferSourceNode of drift',
  });
}
