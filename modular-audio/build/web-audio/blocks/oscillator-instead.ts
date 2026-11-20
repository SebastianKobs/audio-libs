// ---------- build/web-audio/blocks/oscillator-instead: the library's oscillator standing in for a worklet source ----------
// Where a source's worklet isn't loaded: the library's oscillator at the note, started as any oscillator is.
// What the oscillator can't do is held at the value it has and heard nowhere, so a voice still sounds, plainer.
import { choiceAt, choiceIndex, type ParamSpec } from '../../../../base/params/index.ts';
import { BLOCKS } from '../../../plan/blocks/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { numberOf, standingIn, valueOf, type Making } from '../making.ts';
import { toldParam, type Automatable } from '../param-units.ts';
import { oscillator } from './oscillator.ts';
import { numericOf } from './worklet-source.ts';

// How a source with a wave of its own stands in.
interface InsteadOf {
  // the block's wave, a param of choices
  readonly wave: ParamSpec;
  // the library oscillator's wave for each of the block's choices
  readonly typeOf: (choice: string) => OscillatorType;
  // params a signal is cabled into that the oscillator has no use for: held, their cables going nowhere
  readonly unheard: readonly ParamSpec[];
  // params only held
  readonly held: readonly ParamSpec[];
  // what it is, for an error's message
  readonly kind: string;
}

// The library's oscillator made of the node's frequency, detune and stop, its wave given.
export function libraryOscillator(node: Node, making: Making, wave: OscillatorType): BuiltNode {
  const values = {
    frequency: numberOf(node, 'frequency'),
    detune: numberOf(node, 'detune'),
    stop: numberOf(node, 'stop'),
  };
  const stood = standingIn(node, BLOCKS.oscillator, { values, choices: { wave } });
  return oscillator(stood, making);
}

// The library's oscillator for a source with a wave: the wave changed on the oscillator as it's told, the rest held.
export function oscillatorInstead(
  node: Node,
  making: Making,
  { wave, typeOf, unheard, held, kind }: InsteadOf,
): BuiltNode {
  let chosen = choiceIndex(wave, String(valueOf(node, wave.name)));
  const plain = libraryOscillator(node, making, typeOf(choiceAt(wave, chosen)));
  const nowhere = making.kept(making.context.createGain()).gain;
  return new BuiltNode({
    input: plain.input,
    output: plain.output,
    params: {
      frequency: plain.param('frequency'),
      detune: plain.param('detune'),
      stop: plain.param('stop'),
      wave: toldParam(
        () => chosen,
        (index) => {
          chosen = index;
          plain.node!.type = typeOf(choiceAt(wave, index)); // the library's oscillator has a node
        },
      ),
      ...Object.fromEntries([...unheard, ...held].map((spec) => [spec.name, heldAt(node, spec)])),
    },
    cables: {
      frequency: plain.cablesOf('frequency'),
      detune: plain.cablesOf('detune'),
      ...Object.fromEntries(unheard.map(({ name }) => [name, [nowhere]])),
    },
    node: plain.node,
    kind,
  });
}

// A param that holds the value it has, as the node plans it, and moves nothing.
export function heldAt(node: Node, spec: ParamSpec): Automatable {
  let held = numericOf(node, spec);
  return toldParam(
    () => held,
    (value) => {
      held = value;
    },
  );
}
