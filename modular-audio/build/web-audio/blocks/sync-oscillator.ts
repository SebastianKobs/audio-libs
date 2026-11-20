// ---------- build/web-audio/blocks/sync-oscillator: a sync oscillator in Web Audio ----------
// A worklet source of its processor: its frequency, detune and sync its AudioParams, a signal cabled into each
// (an envelope sweeping its sync); its wave by its index.
// Started and stopped as an oscillator is, each time told it by message (worklet-source.ts).
// Where its worklet isn't loaded: the library's oscillator at the note, its wave the slave's,
// its sync heard nowhere, so a lead still sounds, plainer.
import { SYNC_OSCILLATOR_SPECS } from '../../../plan/blocks/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import type { BuiltNode } from '../built-node.ts';
import type { Making } from '../making.ts';
import { oscillatorInstead } from './oscillator-instead.ts';
import { numericOf, workletSource } from './worklet-source.ts';

const { frequency, detune, sync, wave } = SYNC_OSCILLATOR_SPECS;

export function syncOscillator(node: Node, making: Making): BuiltNode {
  const made = workletSource(node, making, {
    processor: 'sync oscillator',
    parameterData: Object.fromEntries(
      [frequency, detune, sync, wave].map((spec) => [spec.name, numericOf(node, spec)]),
    ),
    cabled: ['frequency', 'detune', 'sync'],
    kind: 'a sync oscillator worklet',
  });
  return (
    made
    ?? oscillatorInstead(node, making, {
      wave,
      typeOf: (choice) => (choice === 'square' ? 'square' : 'sawtooth'),
      unheard: [sync],
      held: [],
      kind: 'an OscillatorNode, for a sync oscillator',
    })
  );
}
