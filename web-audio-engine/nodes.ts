// ---------- libs/web-audio-engine/nodes: the kinds of node a plan names, each made in the context ----------
// What each kind a plan's node names (sound/synth/'s blocks) is in Web Audio: an oscillator, a gain, a biquad, a buffer's source, a delay,
// a convolver, one of Web Audio's each, made with the props it can only be made with (a delay's max); a panner, a stereo panner where the
// context has one, up-mixed or a pan pot, else a gain passing the sound through; a limiter, built from several (limiter.ts). Its props and
// params are set on it, and it's started and wired, as a plan's node (build.ts)
import type { CompositeNode } from './composite.ts';
import { limiterNodes } from './limiter.ts';
import type { NodeKind } from '../audio-plan/index.ts';

// a kind of node made in the context, by its props
export type NodeMaker = (props: Record<string, unknown>) => AudioNode | CompositeNode;

// each kind a plan names, made in the context; a panner only where it can pan (canPan()), asked each time
export function nodeMakers(audioContext: BaseAudioContext, canPan: () => boolean): Record<NodeKind, NodeMaker> {
  return {
    oscillator: () => audioContext.createOscillator(),
    gain: () => audioContext.createGain(),
    biquad: () => audioContext.createBiquadFilter(),
    buffer: () => audioContext.createBufferSource(),
    panner: (props) => {
      if (!canPan()) {
        return audioContext.createGain(); // no stereo panner: it passes through, unpanned
      }
      const pan = audioContext.createStereoPanner();
      if (props.mono === 'pan pot') {
        return pan; // a mono sound panned as it comes, Web Audio's own way: constant power
      }
      pan.channelCountMode = 'explicit';
      pan.channelCount = 2; // a mono sound made stereo first, so it's as loud in the middle, as the mixer's pans are
      return pan;
    },
    delay: (props) => audioContext.createDelay(typeof props.max === 'number' ? props.max : undefined),
    convolver: () => audioContext.createConvolver(),
    limiter: () => limiterNodes(audioContext),
  };
}
