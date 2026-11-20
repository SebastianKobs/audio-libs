// ---------- build/web-audio/blocks/phase-distortion: a CZ's line in Web Audio ----------
// A worklet source of its processor: its frequency, detune and dcw its AudioParams, a signal cabled into each
// (an envelope sweeping its dcw, the CZ's own sweep); its wave by its index.
// Its start phase is handed to the processor as it is made: a voice is made a note, so the phase is read once,
// one draw of the builder's random at `free`, none at `reset`, and told later it holds the value and moves nothing.
// Started and stopped as an oscillator is, each time told it by message (worklet-source.ts).
// Where its worklet isn't loaded: the library's oscillator at the note, a triangle for the saw and a square for
// the square (an estimate: between a sine and the bent wave), its dcw held and heard nowhere, so a bass still sounds, plainer.
import { PHASE_DISTORTION_SPECS } from '../../../plan/blocks/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import type { BuiltNode } from '../built-node.ts';
import { valueOf, type Making } from '../making.ts';
import { heldAt, oscillatorInstead } from './oscillator-instead.ts';
import { numericOf, workletSource } from './worklet-source.ts';

const { frequency, detune, dcw, wave, phase } = PHASE_DISTORTION_SPECS;

export function phaseDistortion(node: Node, making: Making): BuiltNode {
  const free = valueOf(node, 'phase') === 'free';
  const made = workletSource(node, making, {
    processor: 'phase distortion',
    parameterData: Object.fromEntries([frequency, detune, dcw, wave].map((spec) => [spec.name, numericOf(node, spec)])),
    processorOptions: { phase: free ? making.random() : 0 }, // one draw at free, none at reset
    cabled: ['frequency', 'detune', 'dcw'],
    held: { phase: heldAt(node, phase) },
    kind: 'a phase distortion worklet',
  });
  return (
    made
    ?? oscillatorInstead(node, making, {
      wave,
      typeOf: (choice) => (choice === 'square' ? 'square' : 'triangle'),
      unheard: [dcw],
      held: [phase],
      kind: 'an OscillatorNode, for a phase distortion line',
    })
  );
}
