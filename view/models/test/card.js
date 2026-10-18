// A voice card of the tests' own, a pluck, as the view models' and the view library's tests read it; its models on a port of
// the tests' own
import { ViewBuilder } from '../index.ts';
import { paramAt, settingAt } from '../../../plan/format/index.ts';

// a block of the tests' own, its params by name and value
function block(name, kind, role, params) {
  return {
    name,
    kind,
    role,
    inputs: [{ name: 'in', channels: 1 }],
    outputs: [{ name: 'out', channels: 1 }],
    params: params.map(([param, value, range = [0, 10, 0.01]]) => ({ spec: { name: param, range }, value })),
    settings: [],
  };
}
// a pluck: an oscillator into a VCA its envelope opens; its decay and gate macros onto the envelope; a glide of its own
export const CARD = {
  version: 1,
  node: {
    name: 'voice',
    kind: 'Pluck',
    inputs: [],
    outputs: [{ name: 'out', channels: 1 }],
    params: [],
    settings: [],
    children: [
      block('osc', 'oscillator', 'source', [['frequency', 440, [20, 20000, 0.01]]]),
      block('env', 'envelope', 'modulator', [
        ['decay', 0.4],
        ['gate', 0, [0, 1, 1]],
        ['amount', 0.5, [-48, 48, 0.01]],
      ]),
      block('vca', 'gain', 'stage', [['gain', 0, [0, 2, 0.001]]]),
    ],
    wires: [
      { from: { node: 'osc', output: 'out' }, to: { node: 'vca', input: 'in' } },
      { from: { node: 'env', output: 'out' }, to: { node: 'vca', param: 'gain' } },
      { from: { node: 'vca', output: 'out' }, to: { output: 'out' } },
    ],
    macros: [
      {
        spec: { name: 'decay', unit: 's', range: [0.1, 4, 0.01] },
        value: 1,
        maps: [{ to: ['env', 'decay'], factor: 1.3, offset: 0, high: 5 }],
      },
      { spec: { name: 'gate', range: [0, 1, 1] }, value: 0, maps: [{ to: ['env', 'gate'], factor: 1, offset: 0 }] },
      { spec: { name: 'glide', unit: 's', range: [0, 1, 0.001] }, value: 0, maps: [] },
    ],
    pools: [],
  },
};
// a view builder on a port of the tests' own: every value the plan's, every one live
export function builderOn(plan) {
  return new ViewBuilder(
    {
      plan,
      valueOf: () => undefined,
      startOf: (address) => (paramAt(plan, address) ?? settingAt(plan, address))?.value,
      roleOf: () => ({ by: 'live' }),
      peakOf: () => 0,
      readingOf: () => 0,
      copiesOf: () => [],
      slotOf: () => undefined,
    },
    () => {},
  );
}
// a card's view models, what's done on them sent through its send
export function cardModels({ port, send }) {
  return new ViewBuilder(port, send);
}
