// A block alone as a plan, for the device models' tests: its params and settings at their defaults.
import { BLOCKS } from '../../../../plan/blocks/index.ts';

export function lone(kind) {
  const { inputs, outputs, params, settings } = BLOCKS[kind];
  return {
    version: 1,
    node: {
      name: kind,
      kind,
      inputs: [...inputs],
      outputs: [...outputs],
      params: params.map((spec) => ({ spec, value: spec.default })),
      settings: settings.map((spec) => ({ spec, value: spec.default })),
    },
  };
}
