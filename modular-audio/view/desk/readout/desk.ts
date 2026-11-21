// ---------- view/desk/readout/desk: a desk as it plays, the plan's readout ----------
// The plan's readout (PlanReadout) for a desk (modular-audio/build/desk/mixing/), as PresetReadout is for a preset.
// What the views' models read of the desk, by address:
//   - a value as it plays, the desk's; a strip's mute and solo, its live mix's;
//   - its start, the desk's, which a reset brings back;
//   - how a param is set (roleOf()), and what a slot does there (slotOf()), worked out from
//     the plan and its setup's rules, a slot's words its plan's where it has them;
//   - a channel's level, its meter's, or a block's in it at a point, once the desk is built;
//     a reading, a limiter's reduction;
//   - a pool's copies added so far.
// What's done sent as the desk's message (deskEdited()), its owner playing it in as it hears
// it (the desk's surface).
import { nodeAt, splitAtChild, type Node } from '../../../plan/format/index.ts';
import { addressText, type Address } from '../../../../base/util/index.ts';
import { SEND, type DeskMessage } from '../../../plan/desk/index.ts';
import type { DeskBuilt, DeskSetup, MixingDesk } from '../../../build/desk/mixing/index.ts';
import type { Command, PlanReadout, Role, Slot } from '../../device/readout/index.ts';

// What the desk's readout asks of what's built beyond the desk's: its meters, a level and a reading,
// by address.
interface Metered {
  peak(address: Address, point?: string): number;
  reading(address: Address, name: string): number;
}
// a desk whose built has meters, as its readout reads it
type MeteredDesk = MixingDesk<DeskBuilt & Metered>;

const LIVE: Role = { by: 'live' };
const AUTOMATED: Role = { by: 'automated', recorded: true }; // a desk's automation, in its lanes
const FIXED: Role = { by: 'fixed' };
// a strip's own switches, the live mix's
const SWITCHES: readonly string[] = ['mute', 'solo'];

// A desk as the view models read it, by its setup's rules.
export function deskReadout({ desk, setup }: { desk: MeteredDesk; setup: DeskSetup }): PlanReadout {
  return {
    plan: desk.plan, // the desk's plan never changes: its settings are kept apart, set as it's built
    valueOf: (address) => switchOf(desk, address) ?? desk.valueOf(address),
    startOf: (address) => desk.startOf(address),
    roleOf: (address) => roleOn(address, { desk, setup }),
    peakOf: (address, point) => peakOn(desk, address, point),
    readingOf: (address, reading) => readingOn(desk, address, reading),
    copiesOf: ([pool = '']) => desk.copiesOf(pool),
    slotOf: (address) => slotOn(address, { desk, setup }),
  };
}
// What's done on the desk as its message: a param's value, or a setting.
export function deskEdited({ type, address, value }: Command): DeskMessage {
  if (type === 'setting') {
    return { type: 'desk edited', of: 'settings', address, value };
  }
  return { type: 'desk edited', of: 'values', address, value };
}

// A strip's mute or solo, 1 where the live mix has it on; none for any other address.
function switchOf(desk: Pick<MeteredDesk, 'mixState'>, address: Address): number | undefined {
  const { child, within } = splitAtChild(address);
  const [own = ''] = within;
  if (within.length !== 1 || !SWITCHES.includes(own)) {
    return undefined;
  }
  const { muted, soloed } = desk.mixState();
  const on = own === 'mute' ? muted : soloed;
  return on.has(addressText(child)) ? 1 : 0;
}
// How a param is set:
//   - a strip's mute and solo: live;
//   - its own volume, pan and sends: live on the desk's own channels and the background's
//     tracks; on another track, by its notes where they set it, else live;
//   - an insert's on a live strip: its own params and settings live, those deeper fixed;
//   - an insert's on a track: by what its setup says sets it, recorded; fixed where nothing
//     does.
function roleOn(address: Address, { desk, setup }: { desk: MeteredDesk; setup: DeskSetup }): Role {
  const { child, within } = splitAtChild(address);
  const strip = addressText(child);
  const [first = '', ...inSlot] = within;
  const live = desk.isOwn(strip) || setup.isLive(strip);
  if (within.length === 1 || first === SEND) {
    return ownRole(address, first, live, setup);
  }
  if (live) {
    const own = inSlot.length === 1 && ownControls(nodeAt(desk.plan, [...child, first])).includes(inSlot[0]!);
    return own ? LIVE : FIXED;
  }
  const source = setup.setBy(address);
  if (source === undefined) {
    return FIXED;
  }
  return { by: 'automated', source, recorded: true };
}
// A strip's own param or send: its mute and solo live; its volume, pan and sends live on a
// live strip, else by its notes where they set it.
function ownRole(address: Address, own: string, live: boolean, setup: Pick<DeskSetup, 'setBy'>): Role {
  if (SWITCHES.includes(own) || live || setup.setBy(address) === undefined) {
    return LIVE;
  }
  return AUTOMATED;
}
// What an insert's slot does on its strip: its plan's words, else on its strip; what sets it
// there, on a track, what its setup says sets its own controls. None where there's no insert.
function slotOn(address: Address, { desk, setup }: { desk: MeteredDesk; setup: DeskSetup }): Slot | undefined {
  const { child, within } = splitAtChild(address);
  const [slot = ''] = within;
  const strip = addressText(child);
  const insert = nodeAt(desk.plan, [...child, slot]);
  if (insert?.role !== 'insert') {
    return undefined;
  }
  const job = insert.does ?? `on ${strip}`;
  if (desk.isOwn(strip) || setup.isLive(strip)) {
    return { job }; // set live here
  }
  const sources = ownControls(insert).flatMap((name) => setup.setBy([...child, slot, name]) ?? []);
  if (!sources.length) {
    return { job };
  }
  return { job, setBy: [...new Set(sources)].join(', ') };
}
// an insert's own controls by name: its macros, its params, its settings; none where there's none
function ownControls(insert: Node | undefined): string[] {
  if (!insert) {
    return [];
  }
  return [...(insert.macros ?? []), ...insert.params, ...insert.settings].map(({ spec }) => spec.name);
}
// A level once the desk is built, a channel's or a block's in it at a point: a copy's once
// it's added; 0 before.
function peakOn(desk: MeteredDesk, address: Address, point?: string): number {
  if (!isBuilt(desk, address)) {
    return 0;
  }
  return desk.built!.peak(address, point); // built, as checked
}
// what's read of a block once the desk is built, a limiter's reduction; 0 before
function readingOn(desk: MeteredDesk, address: Address, reading: string): number {
  if (!isBuilt(desk, address)) {
    return 0;
  }
  return desk.built!.reading(address, reading); // built, as checked
}
// whether what's built has an address's channel: one of the desk's own, or a copy added
function isBuilt(desk: MeteredDesk, address: Address): boolean {
  const strip = addressText(splitAtChild(address).child);
  return desk.built !== null && (desk.added(strip) || desk.isOwn(strip));
}
// What's done: a param played on its strip's track, a choice by its index as a controller
// carries it; a setting, the desk built again with it.
