// ---------- plan/desk: the desk's forms, a desk written short, mute and solo ----------
// A desk is a template. This library:
//   - says what a valid one is;
//   - makes one from a desk written short;
//   - says which channels a mute or a solo silences.
// Its parts:
//   - channel-form.ts, desk-form.ts: what every channel and every desk is, as forms;
//   - channel.ts: a channel written short, read from data, made into templates of its form, alone or on a desk;
//   - desk.ts: a desk written short, its channels and pools, read from data, made into templates;
//   - mute-solo.ts: which channels a mute or a solo silences, over a plan's wires;
// A channel's own params, as a strip's, are libs/params/'s (STRIP_PARAMS, SEND_PARAM).
import { CHANNEL_FORM } from './channel-form.ts';
import { DESK_FORM } from './desk-form.ts';
import { frozen } from '../../util/index.ts';

export { type DeskRole } from './desk-form.ts';
export {
  SEND,
  channelOf,
  channelTemplates,
  controlAddress,
  layered,
  type Channel,
  type ChannelParts,
  type Insert,
  type OnDesk,
  type Parts,
  type Send,
  type Tap,
} from './channel.ts';
export { CHANNEL_FORM } from './channel-form.ts';
export { deskOf, deskTemplates, type Desk, type DeskChannel, type DeskPool } from './desk.ts';
export { MUTE_GLIDE, silenced, type Muting } from './mute-solo.ts';

// the desk's forms, to hand the planner beside the effect's
export const DESK_FORMS = frozen([CHANNEL_FORM, DESK_FORM]);
