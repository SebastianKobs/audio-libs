// Scenario 1: a voice planned in code, as a library's user writes it: an oscillator and an envelope,
// each a block, wired into a gain, the envelope moving it; the planner alone, no template read from YAML.
import { Planner } from '../../modular-audio/plan/planner/index.ts';

// the voice: the oscillator into a gain, the envelope into the gain's level
const VOICE = {
  kind: 'Voice',
  outputs: [{ name: 'out', channels: 1 }],
  children: [
    { name: 'oscillator', kind: 'oscillator' },
    { name: 'vca', kind: 'gain', values: { gain: 0 } },
    { name: 'envelope', kind: 'envelope', values: { attack: 0.01, release: 0.3 } },
  ],
  wires: [
    { from: { node: 'oscillator', output: 'out' }, to: { node: 'vca', input: 'in' } },
    { from: { node: 'envelope', output: 'out' }, to: { node: 'vca', param: 'gain' } },
    { from: { node: 'vca', output: 'out' }, to: { output: 'out' } },
  ],
};

// the voice planned, its blocks at their defaults but where it says
export function planVoice() {
  return new Planner([VOICE]).plan('Voice');
}
