// ---------- plan/desk/desk: a desk written short, read from data ----------
// Written short, as a studio's YAML writes it:
//   - its channels in order, each by its name and its role (desk-form.ts);
//     each written there, or on a channel written apart (channel), its own parts over it;
//   - each one's way out (out): a bus on the desk; the master where it names none;
//   - where a send is taken (taps), by its return, where it isn't its channel's own;
//   - its pools: channels that come and go, as a pool of tracks is played.
//     Each copy is wired as its pool's channel.
import { fromData, type Shape } from '../../../base/util/index.ts';
import { PARTS_FIELDS, TAPS, type ChannelParts, type Tap } from './channel.ts';
import { DESK_ROLES, type DeskRole } from './desk-form.ts';

// a channel on a desk, written short; its label the name a view shows it by, its short label
// the name in little room
export interface DeskChannel extends ChannelParts {
  readonly name: string;
  readonly label?: string;
  readonly short?: string;
  readonly role: DeskRole;
  readonly channel?: string;
  readonly out?: string;
  readonly taps?: Readonly<Record<string, Tap>>;
}
// a pool of channels on a desk: each copy a channel, as written
export type DeskPool = Omit<DeskChannel, 'role'>;
// a desk written short: its kind, its channels in order, its pools
export interface Desk {
  readonly kind: string;
  readonly channels: readonly DeskChannel[];
  readonly pools?: readonly DeskPool[];
}

// A channel's shape on a desk, as read from data: its name, its labels, its role, the channel
// it's on, where it goes; its parts; its taps by return, each pre or post.
const ON_DESK_FIELDS: Readonly<Record<string, Shape>> = {
  name: 'word',
  label: 'word',
  short: 'word',
  role: { oneOf: DESK_ROLES },
  channel: 'word',
  out: 'word',
  ...PARTS_FIELDS,
  taps: { byName: { oneOf: TAPS } },
};
// a desk's shape: its kind; its channels, each its name and its role; its pools, each its name
const DESK_SHAPE: Shape = {
  fields: {
    kind: 'word',
    channels: { listOf: { fields: ON_DESK_FIELDS, needs: ['name', 'role'] } },
    pools: { listOf: { fields: ON_DESK_FIELDS, needs: ['name'] } },
  },
  needs: ['kind', 'channels'],
};

// A desk read from data, as it is once it's of a desk's shape; refused where it isn't.
export function deskOf(data: unknown, source: string): Desk {
  return fromData(data, DESK_SHAPE, { source, what: 'a desk' });
}
