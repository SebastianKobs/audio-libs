// Blocks as a plan has them, for the builder's tests: at their declared defaults, but the values
// and settings given.
import { BLOCKS } from '../../../plan/blocks/index.ts';

// A block by its name and kind.
// Its jacks' channels as declared, mono where it says none; or each as given.
export function blockNode(name, kind, values = {}, settings = {}, channels) {
  const declared = BLOCKS[kind];
  const jack = ({ name: jackName, channels: written = 1 }) => ({ name: jackName, channels: channels ?? written });
  return {
    name,
    kind,
    inputs: declared.inputs.map(jack),
    outputs: declared.outputs.map(jack),
    params: declared.params.map((spec) => ({ spec, value: values[spec.name] ?? spec.default })),
    settings: declared.settings.map((spec) => ({ spec, value: settings[spec.name] ?? spec.default })),
  };
}
// a plan of one block, named for its kind
export function oneBlockPlan(kind, values = {}, settings = {}) {
  return { version: 1, node: blockNode(kind, kind, values, settings) };
}
// a block no builder makes, a theremin: a source, its pitch a param
export const THEREMIN = Object.freeze({
  name: 'theremin',
  kind: 'theremin',
  inputs: [],
  outputs: [{ name: 'out', channels: 1 }],
  params: [{ spec: { name: 'pitch', range: [0, 1, 0.01] }, value: 0 }],
  settings: [],
});
