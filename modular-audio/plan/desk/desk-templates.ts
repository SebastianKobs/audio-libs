// ---------- plan/desk/desk-templates: a desk written short made into templates ----------
// Made into templates: the desk's, of the desk's form, and each channel's (channel.ts).
// Sends, as a desk's knobs:
//   - a channel has one for each return before it on the desk, none that feeds it;
//   - a return has one for every other return, as Ableton's: the only loops on a desk.
//     Each loop goes through a return's send into one after it, delayed, as a loop needs (channel.ts).
//     Without those the desk has no loops: the sends into returns before it never close one.
//   - a pool's channel has one for every return.
// Each failure said at once, naming the desk.
import { feeds, type Wire } from '../format/index.ts';
import type { WrittenTemplate } from '../planner/index.ts';
import { chainFrom } from '../../../base/util/index.ts';
import { channelTemplates, layered, type Channel, type Parts, type Send } from './channel.ts';
import type { DeskRole } from './desk-form.ts';
import type { Desk, DeskPool } from './desk.ts';

// a channel on the desk worked out: as written, its role, its parts, its sends
interface Placed {
  readonly written: DeskPool;
  readonly role: DeskRole;
  readonly parts: Parts;
  readonly sends: readonly Send[];
}

const STEREO = 2;
const FED_FROM_OUTSIDE: readonly DeskRole[] = ['channel', 'bus']; // a track or a phrase played into it

// The templates a desk written short makes:
//   - the desk's;
//   - each channel's and its sends', a pool's among them.
// Refused where it's written wrong, every failure said.
export function deskTemplates(desk: Desk, channels: readonly Channel[] = []): WrittenTemplate[] {
  const problems: string[] = [];
  const parts = partsOn(desk, new Map(channels.map((channel) => [channel.kind, channel])), problems);
  const outs = outWires(desk, problems);
  const placed = sendsOn(desk, { parts, outs }, problems);
  if (problems.length) {
    throw new Error(
      [`desk ${desk.kind}, written short, not well-formed:`, ...problems.map((each) => `  ${each}`)].join('\n'),
    );
  }
  const kindOf = (name: string): string => `${desk.kind}: ${name}`;
  const fixed = placed.slice(0, desk.channels.length);
  const pooled = placed.slice(desk.channels.length);
  return [
    {
      kind: desk.kind,
      form: 'desk',
      inputs: fixed
        .filter(({ role }) => FED_FROM_OUTSIDE.includes(role))
        .map(({ written }) => ({ name: written.name, channels: STEREO })),
      outputs: [{ name: 'out', channels: STEREO }],
      children: fixed.map(({ written, role }) => ({ ...childOf(written, kindOf), role })),
      wires: fixed.flatMap((each) => wiresOf(each, outs)),
      pools: pooled.map((each) => ({
        child: { ...childOf(each.written, kindOf), role: each.role },
        wires: wiresOf(each, outs).filter(({ from }) => 'node' in from), // fed by its copy's own input, as it's added
      })),
    },
    ...placed.flatMap(({ written, role, parts: own, sends }) =>
      channelTemplates(own, { kind: kindOf(written.name), master: role === 'master', sends }),
    ),
  ];
}

// A channel as the desk's template's child: its name, its kind on the desk, its labels where
// it's written with them.
function childOf(
  { name, label, short }: DeskPool,
  kindOf: (name: string) => string,
): { name: string; kind: string; label?: string; short?: string } {
  return {
    name,
    kind: kindOf(name),
    ...(label !== undefined && { label }),
    ...(short !== undefined && { short }),
  };
}
// each channel's parts, a pool's after the desk's: its base's, then its own
function partsOn(desk: Desk, byKind: ReadonlyMap<string, Channel>, problems: string[]): Parts[] {
  return [...desk.channels, ...(desk.pools ?? [])].map((written) => {
    const bases = basesOf(written, byKind, problems);
    return layered([...bases.reverse(), written]);
  });
}
// the channels a channel is written on, the nearest first; a missing one or a loop said
function basesOf(written: DeskPool, byKind: ReadonlyMap<string, Channel>, problems: string[]): Channel[] {
  const { keys, again } = chainFrom(written.channel, byKind, (base) => base.extends);
  if (again !== undefined) {
    const kinds = [...keys, again];
    problems.push(
      `${written.name}: channel ${kinds[0]} built on ${kinds.slice(1).join(', which is built on ')}: a loop`,
    );
    return [];
  }
  const missing = keys.find((kind) => !byKind.has(kind));
  if (missing !== undefined) {
    problems.push(`${written.name}: no channel ${missing}`);
    return [];
  }
  return keys.map((kind) => byKind.get(kind)!); // each there, as just found
}
// Each way out, the desk's channels' and its pools':
//   - into a bus on the desk, else the master;
//   - the master's, the desk's own way out.
function outWires(desk: Desk, problems: string[]): Map<string, Wire> {
  const master = desk.channels.find(({ role }) => role === 'master')?.name;
  const buses = new Set(
    desk.channels.filter(({ role }) => role === 'bus' || role === 'master').map(({ name }) => name),
  );
  const wires = new Map<string, Wire>();
  for (const written of [...desk.channels, ...(desk.pools ?? [])]) {
    const into = written.out ?? master;
    if ('role' in written && written.role === 'master') {
      wires.set(written.name, { from: { node: written.name, output: 'out' }, to: { output: 'out' } });
    } else if (into !== undefined && buses.has(into)) {
      wires.set(written.name, { from: { node: written.name, output: 'out' }, to: { node: into, input: 'in' } });
    } else {
      problems.push(`${written.name}: its way out into ${into ?? 'nothing'}, no bus on the desk`);
    }
  }
  return wires;
}
// Each channel's sends, in the desk's order, a pool's after:
//   - the returns it reaches (returnsFor());
//   - its tap the desk's, else its channel's;
//   - a return's into a return after it able to close a loop.
// A tap written for a return it has no send to said.
function sendsOn(
  desk: Desk,
  { parts, outs }: { parts: readonly Parts[]; outs: ReadonlyMap<string, Wire> },
  problems: string[],
): Placed[] {
  const wires: Wire[] = [...outs.values()];
  const every = desk.channels.filter(({ role }) => role === 'return').map(({ name }) => name);
  const before: string[] = [];
  const all = [...desk.channels, ...(desk.pools ?? []).map((pool) => ({ ...pool, role: 'channel' as const }))];
  const placed = all.map((written, index) => {
    const own = parts[index]!; // one for each, in order
    const reached = returnsFor(written, { every, before, wires });
    const loops = (to: string): boolean => written.role === 'return' && !before.includes(to);
    const sends = reached.map((to) => ({ to, tap: written.taps?.[to] ?? own.tap, loops: loops(to) }));
    for (const to of Object.keys(written.taps ?? {}).filter((to) => !reached.includes(to))) {
      problems.push(`${written.name}: a tap for ${to}, no send to it`);
    }
    wires.push(...sends.filter((send) => !send.loops).map(({ to }) => sendWire(written.name, to)));
    if (written.role === 'return') {
      before.push(written.name);
    }
    return { written, role: written.role, parts: own, sends };
  });
  return placed;
}
// The returns a channel sends to, in the desk's order:
//   - the master: none;
//   - a return: every other;
//   - any other: each before it, none that feeds it.
//     Fed by the ways out and the sends so far, those that can close a loop left out.
function returnsFor(
  { name, role }: { name: string; role: DeskRole },
  { every, before, wires }: { every: readonly string[]; before: readonly string[]; wires: readonly Wire[] },
): string[] {
  if (role === 'master') {
    return [];
  }
  if (role === 'return') {
    return every.filter((to) => to !== name);
  }
  return before.filter((to) => !feeds({ wires }, to, name));
}
// A channel's wires on the desk:
//   1. in from the desk's own input, where it's fed from outside;
//   2. its way out;
//   3. its sends.
function wiresOf({ written, role, sends }: Placed, outs: ReadonlyMap<string, Wire>): Wire[] {
  const input: Wire[] =
    FED_FROM_OUTSIDE.includes(role) ? [{ from: { input: written.name }, to: { node: written.name, input: 'in' } }] : [];
  return [...input, outs.get(written.name)!, ...sends.map(({ to }) => sendWire(written.name, to))]; // a way out each, as checked
}
// a send out of a channel by its return's name, into the return
function sendWire(from: string, to: string): Wire {
  return { from: { node: from, output: to }, to: { node: to, input: 'in' } };
}
