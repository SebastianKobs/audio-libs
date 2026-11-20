// ---------- build/web-audio/blocks/operators: four operators in Web Audio ----------
// A worklet source of its processor: its nineteen params its AudioParams (a level cabled into by an envelope, a ratio,
// a detune, the note's frequency), each wave by its index.
// Its algorithm (routes and carriers) and its start phases are handed to the processor as it is made:
// a voice is made a note, so the algorithm and the phase are read once, and told later they hold the value and move nothing.
// The phases are four draws of the builder's random at `free`, none at `reset`.
// Started and stopped as an oscillator is, each time told it by message (worklet-source.ts).
// Where its worklet isn't loaded: the library's oscillator, a sine at the note, into a gain that is the first carrier's
// level, so the card's envelope still opens and closes it: a plain tone in place of the patch.
// Every other param held and unheard.
import { OPERATOR_ALGORITHMS } from '../../../../dsp/oscillators/index.ts';
import { BLOCKS, OPERATORS_SPECS } from '../../../plan/blocks/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { numberOf, valueOf, type Making } from '../making.ts';
import { heldAt, libraryOscillator } from './oscillator-instead.ts';
import { numericOf, workletSource } from './worklet-source.ts';

const FEEDBACK_ON = 4; // the operator that feeds itself, in every algorithm
const OPERATORS = [1, 2, 3, 4] as const;
const SPECS = BLOCKS.operators.params;
const READ_ONCE = ['algorithm', 'phase'] as const; // the processor's options, not its AudioParams
const PROCESSOR_SPECS = SPECS.filter(({ name }) => name !== 'stop' && !(READ_ONCE as readonly string[]).includes(name));
const CABLED = PROCESSOR_SPECS.map(({ name }) => name);

export function operators(node: Node, making: Making): BuiltNode {
  const { routes, carriers } = algorithmOf(node);
  const free = valueOf(node, 'phase') === 'free';
  const phases = OPERATORS.map(() => (free ? making.random() : 0)); // no draw at reset
  const made = workletSource(node, making, {
    processor: 'operators',
    parameterData: Object.fromEntries(PROCESSOR_SPECS.map((spec) => [spec.name, numericOf(node, spec)])),
    processorOptions: { routes, carriers, feedbackOn: FEEDBACK_ON, phases },
    cabled: CABLED,
    held: Object.fromEntries(READ_ONCE.map((name) => [name, heldAt(node, OPERATORS_SPECS[name])])),
    kind: 'an operators worklet',
  });
  return made ?? toneInstead(node, making, carriers[0]!);
}

// an algorithm's routes and carriers by its number, 1 to 8; a number off the ends held at the end
function algorithmOf(node: Node) {
  const number = Math.min(OPERATOR_ALGORITHMS.length, Math.max(1, Math.round(numberOf(node, 'algorithm'))));
  return OPERATOR_ALGORITHMS[number - 1]!; // held to the list
}

// The library's oscillator, a sine at the note, into a gain that is the first carrier's level:
// that level's param and cables the gain's, so an envelope cabled into it still opens and closes the tone.
// Every other param held, its cables nowhere.
function toneInstead(node: Node, making: Making, carrier: number): BuiltNode {
  const plain = libraryOscillator(node, making, 'sine');
  const level = making.kept(making.context.createGain());
  level.gain.value = numberOf(node, `level${carrier}`);
  plain.output.connect(level);
  const nowhere = making.kept(making.context.createGain()).gain;
  const sounded = ['frequency', 'detune', 'stop', `level${carrier}`];
  const held = PROCESSOR_SPECS.filter(({ name }) => !sounded.includes(name));
  return new BuiltNode({
    input: plain.input,
    output: level,
    params: {
      ...Object.fromEntries(
        [...held, ...READ_ONCE.map((name) => OPERATORS_SPECS[name])].map((spec) => [spec.name, heldAt(node, spec)]),
      ),
      frequency: plain.param('frequency'),
      detune: plain.param('detune'),
      stop: plain.param('stop'),
      [`level${carrier}`]: level.gain,
    },
    cables: {
      ...Object.fromEntries(held.map(({ name }) => [name, [nowhere]])),
      frequency: plain.cablesOf('frequency'),
      detune: plain.cablesOf('detune'),
      [`level${carrier}`]: [level.gain],
    },
    node: plain.node,
    kind: 'an OscillatorNode into a gain, for the operators',
  });
}
