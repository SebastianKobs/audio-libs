// ---------- libs/web-audio-engine/nodes: the kinds of node a plan names, each made in the context ----------
// What each kind a plan's node names (libs/synth/'s blocks) is in Web Audio: an oscillator, a gain, a biquad, a buffer's source, a delay,
// a convolver, one of Web Audio's each, made with the props it can only be made with (a delay's max); a panner, a stereo panner where the
// context has one, up-mixed or a pan pot, else a gain passing the sound through; a limiter, built from several (limiter.ts). Its props and
// params are set on it, and it's started and wired, as a plan's node (build.ts).
// A biquad's Q is a plain ratio in a plan, 0.707 flat; Web Audio reads a lowpass's and a highpass's in dB, so it's turned there.
import { BuiltNode, type WebAudioNode } from './built-node.ts';
import { limiterNodes } from './limiter.ts';
import { ParamInUnits } from './param-in-units.ts';
import { dBOf } from '../params/index.ts';
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
    biquad: (props) => biquadOf(audioContext.createBiquadFilter(), props),
    buffer: () => BuiltNode.of(audioContext.createBufferSource()),
    panner: (props) => BuiltNode.of(pannerOf(audioContext, props, canPan())),
    delay: (props) => BuiltNode.of(audioContext.createDelay(typeof props.max === 'number' ? props.max : undefined)),
    convolver: () => BuiltNode.of(audioContext.createConvolver()),
    limiter: () => limiterNodes(audioContext),
  };
}
// A biquad, its Q a plain ratio as the plan has it.
// A lowpass's and a highpass's Q is in dB in Web Audio, its level at the cutoff: turned there.
// A bandpass's is a ratio there too, as it comes.
function biquadOf(biquad: BiquadFilterNode, props: Record<string, unknown>): BuiltNode {
  if (props.type !== 'lowpass' && props.type !== 'highpass') {
    return BuiltNode.of(biquad);
  }
  const { frequency, detune, gain, Q } = biquad;
  return new BuiltNode({
    input: biquad,
    output: biquad,
    params: { frequency, detune, gain, Q: new ParamInUnits([[Q, dBOf]]) },
    node: biquad as unknown as WebAudioNode, // one of Web Audio's: set, wired and cabled as it is
    kind: 'a BiquadFilterNode',
  });
}
// a pan: a stereo panner, a pan pot, or, where the context can't pan, a gain passing it through
function pannerOf(audioContext: BaseAudioContext, props: Record<string, unknown>, canPan: boolean): AudioNode {
  if (!canPan) {
    return audioContext.createGain(); // no stereo panner: it passes through, unpanned
  }
  const pan = audioContext.createStereoPanner();
  if (props.mono === 'pan pot') {
    return pan; // a mono sound panned as it comes, Web Audio's own way: constant power
  }
  pan.channelCountMode = 'explicit';
  pan.channelCount = 2; // a mono sound made stereo first, so it's as loud in the middle, as the mixer's pans are
  return pan;
}
