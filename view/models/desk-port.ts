// ---------- view/models/desk-port: a port for a desk as it plays ----------
// The models' port (ModelPort) for a desk (libs/build/desk/), as PresetPort is for a preset.
// What the views' models ask of the desk, by address:
//   - a value as it plays, the desk's; a strip's mute and solo, its live mix's;
//   - its start, the desk's, which a reset brings back;
//   - how a param is set (roleOf()), and what a slot does there (slotOf()), its setup's;
//   - a channel's level, its meter's, or a block's in it at a point, once the desk is built;
//     a reading, a limiter's reduction;
//   - a pool's copies added so far;
//   - what's done: a param handed to where its owner says a move goes, a controller on its
//     strip's track for a studio, so it's recorded as every move is; a setting, the desk built
//     again with it.
import { choiceIndex } from '../../params/index.ts';
import { addressText, splitAtChild, type Address, type Plan } from '../../plan/format/index.ts';
import { SEND } from '../../plan/desk/index.ts';
import type { Desk, DeskBuilt, DeskSetup, SlotRole } from '../../build/desk/index.ts';
import type { Command } from './command.ts';
import type { ModelPort, Role, Slot } from './model.ts';

// What the port asks of what's built beyond the desk's: its meters, a level and a reading,
// by address.
interface Metered {
  peak(address: Address, point?: string): number;
  reading(address: Address, name: string): number;
}
// a desk whose built has meters, as the port reads it
type MeteredDesk = Desk<DeskBuilt & Metered>;
// where a move goes, by its strip and its controller: a studio's into the sequencer
type Control = (strip: string, controller: string, value: number) => void;

const LIVE: Role = { by: 'live' };
const AUTOMATED: Role = { by: 'automated', recorded: true }; // a desk's automation, in its lanes
const FIXED: Role = { by: 'fixed' };
// a strip's own switches, the live mix's
const SWITCHES: readonly string[] = ['mute', 'solo'];

// A desk as the view models read it: its setup's rules, the desk's own slots' among them, and
// where a move goes, its owner's.
export function deskPort({
  desk,
  setup,
  control,
}: {
  desk: MeteredDesk;
  setup: Pick<DeskSetup, 'isLive' | 'setByNotes' | 'roleOf'>;
  control: Control;
}): ModelPort {
  const slotRole = (strip: string, slot: string): SlotRole | undefined => setup.roleOf(strip, slot);
  return {
    get plan(): Plan {
      return desk.plan;
    },
    valueOf: (address) => switchOf(desk, address) ?? desk.valueOf(address),
    startOf: (address) => desk.startOf(address),
    roleOf: (address) => roleOn(address, { desk, setup, slotRole }),
    peakOf: (address, point) => peakOn(desk, address, point),
    readingOf: (address, reading) => readingOn(desk, address, reading),
    copiesOf: ([pool = '']) => desk.copiesOf(pool),
    slotOf: (address) => slotOn(address, slotRole),
    send: (command) => sent(command, { desk, control }),
  };
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
//   - an insert's: as its slot's role says, fixed where it sets none of it.
function roleOn(
  address: Address,
  {
    desk,
    setup,
    slotRole,
  }: {
    desk: MeteredDesk;
    setup: Pick<DeskSetup, 'isLive' | 'setByNotes'>;
    slotRole: (strip: string, slot: string) => SlotRole | undefined;
  },
): Role {
  const { child, within } = splitAtChild(address);
  const strip = addressText(child);
  const [first = '', ...inSlot] = within;
  if (within.length === 1 || first === SEND) {
    return ownRole(address, first, desk.isOwn(strip) || setup.isLive(strip), setup);
  }
  const role = slotRole(strip, first);
  if (!role || (role.sets && !role.sets.includes(addressText(inSlot)))) {
    return FIXED;
  }
  return {
    by: role.by,
    ...(role.source !== undefined && { source: role.source }),
    ...(role.by === 'automated' && { recorded: true }),
  };
}
// A strip's own param or send: its mute and solo live; its volume, pan and sends live on a
// live strip, else by its notes where they set it.
function ownRole(address: Address, own: string, live: boolean, setup: Pick<DeskSetup, 'setByNotes'>): Role {
  if (SWITCHES.includes(own) || live || !setup.setByNotes(address)) {
    return LIVE;
  }
  return AUTOMATED;
}
// What a slot does on its strip, and what sets it there; none where nothing says.
function slotOn(address: Address, slotRole: (strip: string, slot: string) => SlotRole | undefined): Slot | undefined {
  const { child, within } = splitAtChild(address);
  const [slot = ''] = within;
  const role = slotRole(addressText(child), slot);
  if (!role) {
    return undefined;
  }
  return { job: role.job, ...(role.setBy !== undefined && { setBy: role.setBy }) };
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
function sent({ type, address, value }: Command, { desk, control }: { desk: MeteredDesk; control: Control }): void {
  if (type === 'setting') {
    desk.settings({ [addressText(address)]: value });
    return;
  }
  const { child, within } = splitAtChild(address);
  control(addressText(child), addressText(within), controllerValue(desk, address, value));
}
// a value as a controller carries it: a choice by its index among its param's choices
function controllerValue(desk: MeteredDesk, address: Address, value: number | string): number {
  if (typeof value === 'number') {
    return value;
  }
  return choiceIndex(desk.specOf(address)!, value); // a choice is a param's, found there
}
