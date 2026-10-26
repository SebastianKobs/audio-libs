// Blocks and plans as the builder's tests have them: blocks at their declared defaults, but the values
// and settings given; composites of them; a plan built on the stand-in for Web Audio.
import { BLOCKS } from '../../../plan/blocks/index.ts';
import { StandInContext } from './audio-stand-in.js';
import { WebAudioBuilder } from '../index.ts';

const MONO_OUT = [{ name: 'out', channels: 1 }];

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
// a composite as a plan has it: its children, with the wires, macros and pools it's given; no outputs unless it says
export function composite(name, children, { kind = name, outputs = [], wires = [], macros = [], pools = [] } = {}) {
  return { name, kind, inputs: [], outputs, params: [], settings: [], children, wires, macros, pools };
}
// a plan of its children wired in a row, from the first to the last, the last into its stereo output
export function chainOf(...children) {
  const wires = children.slice(1).map((child, index) => ({
    from: { node: children[index].name, output: 'out' },
    to: { node: child.name, input: 'in' },
  }));
  const closing = { from: { node: children.at(-1).name, output: 'out' }, to: { output: 'out' } };
  const outputs = [{ name: 'out', channels: 2 }];
  return { version: 1, node: composite('chain', children, { kind: 'Chain', outputs, wires: [...wires, closing] }) };
}
// an instrument whose voice is its children, the first into its output
export function instrumentOf(...children) {
  const out = { from: { node: 'voice', output: 'out' }, to: { output: 'out' } };
  const voice = composite('voice', children, {
    outputs: MONO_OUT,
    wires: [{ from: { node: children[0].name, output: 'out' }, to: { output: 'out' } }],
  });
  return {
    version: 1,
    node: composite('synth', [], { kind: 'instrument', outputs: MONO_OUT, pools: [{ child: voice, wires: [out] }] }),
  };
}
// What's built of a plan at a time on a stand-in context, the beat 0.5 s:
// the context's nodes by their kind, a source fed into the input named in `from`, left out of them.
export function builtOn(plan, { now = 4, from } = {}) {
  const context = new StandInContext(() => now);
  const source = from === undefined ? undefined : context.createGain();
  const what = new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5 }).build(plan, {
    into: context.destination,
    ...(source && { from: { [from]: source } }),
  });
  const made = (kind) => context.rec.nodes.filter((node) => node.kind === kind && node !== source);
  return { context, source, what, made };
}
// a param's last event
export function last(param) {
  return param.events.at(-1);
}
