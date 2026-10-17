// ---------- plan/desk/channel: a channel written short, and its templates ----------
// Written short, as a studio's YAML writes it:
//   - its inserts, in order, each an effect by its kind or a preset, by its slot's name;
//   - a pan, or none (pan: false);
//   - its fader's start (volume), at unity unless it says;
//   - where its sends are taken (tap): after its pan, or before its fader (pre);
//   - the channel it's built on (extends): that one's inserts first, then its own.
//     Its pan, volume and tap its own where it says, else that one's.
// Made into templates of the channel's form (channel-form.ts):
//   1. its stages wired in order: its inserts, its mute (cut), its fader, its pan;
//   2. its own params as a strip's: volume, pan, mute, solo.
//      Mute and solo are wired to nothing: what they silence is mute-solo.ts's.
//   3. its sends one child (send), a template of its own. For each return:
//      a select between its taps, then a gain, its amount (send/reverb);
//      a delay after it where the send can close a loop: a return's into one after it.
// The master: its inserts and its fader alone.
import { addressOf, type Address, type Wire } from '../format/index.ts';
import type { PresetChild, Template, TemplateChild, TemplateMacro, WrittenTemplate } from '../planner/index.ts';
import { SEND_PARAM, STRIP_PARAMS } from '../../params/index.ts';
import { fromData, type Shape } from '../../util/index.ts';

// where a send is taken: after the mute, before the fader (pre); or after the pan (post)
export type Tap = (typeof TAPS)[number];
// an insert: an effect, by its kind or a preset, under its slot's name
export type Insert = TemplateChild | PresetChild;
// what a channel is written with, apart or on a desk
export interface ChannelParts {
  readonly inserts?: readonly Insert[];
  readonly pan?: boolean;
  readonly volume?: number;
  readonly tap?: Tap;
}
// a channel written apart, by its kind, on another where it says
export interface Channel extends ChannelParts {
  readonly kind: string;
  readonly extends?: string;
}
// a channel's parts worked out: its base's, then its own
export interface Parts {
  readonly inserts: readonly Insert[];
  readonly pan: boolean;
  readonly volume: number | undefined;
  readonly tap: Tap;
}
// a send on a channel: the return it goes to, where it's taken, and whether it can close a loop
// (a return's into one after it)
export interface Send {
  readonly to: string;
  readonly tap: Tap;
  readonly loops?: boolean;
}
// a channel as its desk makes it: its kind there, whether it's the master, its sends
export interface OnDesk {
  readonly kind: string;
  readonly master: boolean;
  readonly sends: readonly Send[];
}

// the sends' child's name: a send's address on a channel is under it (send/reverb)
export const SEND = 'send';
// where a send can be taken
export const TAPS = ['pre', 'post'] as const;
// A channel's parts' shape, as read from data, apart or on a desk: its inserts, each its name and
// its kind or a preset; its pan, true or false; its volume, a number; its tap, pre or post.
export const PARTS_FIELDS: Readonly<Record<string, Shape>> = {
  inserts: { listOf: { needs: ['name', ['kind', 'preset']] } },
  pan: 'switch',
  volume: 'number',
  tap: { oneOf: TAPS },
};
// a channel written apart: its kind, the channel it's built on, its parts
const CHANNEL_SHAPE: Shape = { fields: { kind: 'word', extends: 'word', ...PARTS_FIELDS }, needs: ['kind'] };
const STEREO = 2;
const PLAIN = { factor: 1, offset: 0 } as const; // a macro onto its target as it is
// a send's select: post its first input, pre its second
const TAP_INPUT: Readonly<Record<Tap, string>> = { post: 'a', pre: 'b' };
// A send that can close a loop, delayed by the least a loop can be worked out with.
// That's a block, as Web Audio works in: 128 samples, 2.9 ms at 44.1 kHz.
// Free of the tempo; its line no longer than it needs.
const LOOP_DELAY = { values: { sync: 0, ms: 3 }, settings: { longest: 0.1 } } as const;

// A controller on a strip, as its param's address on the desk: the strip's address in front,
// a pool's copy's its pool's name and number (my tap/3/send/reverb).
export function controlAddress(strip: string, controller: string): Address {
  return [...addressOf(strip), ...addressOf(controller)];
}
// A channel read from data, as it is once it's of a channel's shape; refused where it isn't.
export function channelOf(data: unknown, source: string): Channel {
  return fromData(data, CHANNEL_SHAPE, { source, what: 'a channel' });
}
// Parts layered, the base first:
//   - inserts one after the other;
//   - a pan, a volume and a tap: the last that says.
export function layered(layers: readonly ChannelParts[]): Parts {
  return {
    inserts: layers.flatMap((layer) => layer.inserts ?? []),
    pan: lastOf(layers, (layer) => layer.pan) ?? true,
    volume: lastOf(layers, (layer) => layer.volume),
    tap: lastOf(layers, (layer) => layer.tap) ?? 'post',
  };
}
// A channel's templates: its own, of the channel's form, and its sends', where it has any.
export function channelTemplates(parts: Parts, onDesk: OnDesk): WrittenTemplate[] {
  const sends = onDesk.sends.length ? [sendsTemplate(`${onDesk.kind} sends`, onDesk.sends)] : [];
  return [channelTemplate(parts, onDesk), ...sends];
}

// the last value the layers give, the base's under its own; none where none says
function lastOf<Value>(
  layers: readonly ChannelParts[],
  pick: (layer: ChannelParts) => Value | undefined,
): Value | undefined {
  return layers.map(pick).findLast((value) => value !== undefined);
}
// a channel of the channel's form: its stages wired in a row, its sends taken off it
function channelTemplate(parts: Parts, { kind, master, sends }: OnDesk): WrittenTemplate {
  const panned = parts.pan && !master;
  const stages: TemplateChild[] = [
    ...(master ? [] : [{ name: 'cut', kind: 'gain', role: 'mute' }]),
    { name: 'fader', kind: 'gain', role: 'fader' },
    ...(panned ? [{ name: 'pan', kind: 'pan', role: 'pan' }] : []),
  ];
  const row = [...parts.inserts, ...stages].map((child) => child.name); // the way the sound goes, in order
  const last = row.at(-1)!; // a fader at least
  return {
    kind,
    form: 'channel',
    inputs: [{ name: 'in', channels: STEREO }],
    outputs: [{ name: 'out', channels: STEREO }, ...sends.map(({ to }) => ({ name: to, channels: STEREO }) as const)],
    children: [
      ...parts.inserts.map((insert) => ({ ...insert, role: 'insert' })),
      ...stages,
      ...(sends.length ? [{ name: SEND, kind: `${kind} sends`, role: 'sends' }] : []),
    ],
    wires: [...rowWires(row), ...sendWires(last, sends)],
    macros: stripMacros(parts, { master, panned }),
  };
}
// the row wired: in into its first, each into the next, its last out
function rowWires(row: readonly string[]): Wire[] {
  return [
    { from: { input: 'in' }, to: { node: row[0]!, input: 'in' } }, // a fader at least
    ...row
      .slice(1)
      .map((name, index) => ({ from: { node: row[index]!, output: 'out' }, to: { node: name, input: 'in' } })),
    { from: { node: row.at(-1)!, output: 'out' }, to: { output: 'out' } },
  ];
}
// its sends: taken after its mute and after its last stage; out by each return's name
function sendWires(last: string, sends: readonly Send[]): Wire[] {
  if (!sends.length) {
    return [];
  }
  return [
    { from: { node: 'cut', output: 'out' }, to: { node: SEND, input: 'pre' } },
    { from: { node: last, output: 'out' }, to: { node: SEND, input: 'post' } },
    ...sends.map(({ to }) => ({ from: { node: SEND, output: to }, to: { output: to } })),
  ];
}
// a strip's own params:
//   - volume onto its fader, at its start;
//   - pan onto its pan;
//   - mute and solo onto nothing.
function stripMacros(parts: Parts, { master, panned }: { master: boolean; panned: boolean }): TemplateMacro[] {
  const volume: TemplateMacro = {
    name: 'volume',
    spec: STRIP_PARAMS.volume,
    ...(parts.volume !== undefined && { value: parts.volume }),
    maps: [{ to: ['fader', 'gain'], ...PLAIN }],
  };
  const pan: TemplateMacro = { name: 'pan', spec: STRIP_PARAMS.pan, maps: [{ to: ['pan', 'pan'], ...PLAIN }] };
  const switches: TemplateMacro[] = [
    { name: 'mute', spec: STRIP_PARAMS.mute, maps: [] },
    { name: 'solo', spec: STRIP_PARAMS.solo, maps: [] },
  ];
  return [volume, ...(panned ? [pan] : []), ...(master ? [] : switches)];
}
// A channel's sends, for each return:
//   1. a select between its taps: post its first input, pre its second;
//   2. its amount, a gain;
//   3. a delay, where it can close a loop (its loop);
//   4. out by the return's name.
function sendsTemplate(kind: string, sends: readonly Send[]): Template {
  return {
    kind,
    inputs: [
      { name: 'pre', channels: STEREO },
      { name: 'post', channels: STEREO },
    ],
    outputs: sends.map(({ to }) => ({ name: to, channels: STEREO })),
    children: sends.flatMap(({ to, tap, loops }) => [
      { name: `${to} tap`, kind: 'select', settings: { input: TAP_INPUT[tap] } },
      { name: to, kind: 'gain' },
      ...(loops ? [{ name: `${to} loop`, kind: 'delay', ...LOOP_DELAY }] : []),
    ]),
    wires: sends.flatMap(({ to, loops }) => {
      const last = loops ? `${to} loop` : to;
      return [
        { from: { input: 'post' }, to: { node: `${to} tap`, input: 'a' } },
        { from: { input: 'pre' }, to: { node: `${to} tap`, input: 'b' } },
        { from: { node: `${to} tap`, output: 'out' }, to: { node: to, input: 'in' } },
        ...(loops ? [{ from: { node: to, output: 'out' }, to: { node: last, input: 'in' } }] : []),
        { from: { node: last, output: 'out' }, to: { output: to } },
      ];
    }),
    macros: sends.map(({ to }) => ({ name: to, spec: SEND_PARAM, maps: [{ to: [to, 'gain'], ...PLAIN }] })),
  };
}
