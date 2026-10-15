// ---------- libs/web-audio-engine/nodes: the kinds of node a plan names, each made in the context ----------
// What each kind a plan's node names (libs/synth/'s blocks) is in Web Audio: an oscillator, a gain, a biquad, a buffer's source, a delay,
// a convolver, one of Web Audio's each, made with the props it can only be made with (a delay's max); a panner, a biquad and a limiter
// made as the builder makes them (libs/build/web-audio/): a pan by its law, a biquad's Q a plain ratio, a limiter from several. Its
// props and params are set on it, and it's started and wired, as a plan's node (build.ts).
import { biquadOf, BuiltNode, limiterNodes, panOf } from '../build/web-audio/index.ts';
import type { NodeKind } from '../audio-plan/index.ts';

// a kind of node made in the context, by its props
export type NodeMaker = (props: Record<string, unknown>) => BuiltNode;

// Props a node is made with, read by its maker below, not set on it.
// A delay's max, a panner's mono.
export const MADE_WITH: ReadonlySet<string> = new Set(['max', 'mono']);

// each kind a plan names, made in the context; a panner only where it can pan (canPan()), asked each time
export function nodeMakers(audioContext: BaseAudioContext, canPan: () => boolean): Record<NodeKind, NodeMaker> {
  return {
    oscillator: () => BuiltNode.of(audioContext.createOscillator()),
    gain: () => BuiltNode.of(audioContext.createGain()),
    biquad: (props) => biquadOf(audioContext.createBiquadFilter(), props.type),
    buffer: () => BuiltNode.of(audioContext.createBufferSource()),
    panner: (props) => BuiltNode.of(panOf(audioContext, props.mono === 'pan pot' ? 'pan pot' : 'stereo', canPan())),
    delay: (props) => BuiltNode.of(audioContext.createDelay(typeof props.max === 'number' ? props.max : undefined)),
    convolver: () => BuiltNode.of(audioContext.createConvolver()),
    limiter: () => limiterNodes(audioContext),
  };
}
