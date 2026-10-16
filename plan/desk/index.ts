// ---------- plan/desk: the desk's forms, a desk written short, mute and solo ----------
// A desk is a template. This library:
//   - says what a valid one is;
//   - makes one from a desk written short;
//   - says which channels a mute or a solo silences.
// Its parts:
//   - channel-form.ts, desk-form.ts: what every channel and every desk is, as forms;
//   - channel.ts: a channel written short, made into templates of its form;
//   - desk.ts: a desk written short, its channels and pools, made into templates;
//   - mute-solo.ts: which channels a mute or a solo silences, over a plan's wires;
//   - shape.ts: a desk or a channel read from data, YAML's, its shape checked.
// A channel's own params, as a strip's, are libs/params/'s (STRIP_PARAMS, SEND_PARAM).
import { CHANNEL_FORM } from './channel-form.ts';
import { DESK_FORM } from './desk-form.ts';
import { frozen } from '../../util/index.ts';

export { CHANNEL_FORM } from './channel-form.ts';
export { DESK_FORM, type DeskRole } from './desk-form.ts';
export type { Channel, ChannelParts, Insert, Tap } from './channel.ts';
export { deskTemplates, type Desk, type DeskChannel, type DeskPool } from './desk.ts';
export { silenced, type Muting } from './mute-solo.ts';
export { channelOf, deskOf } from './shape.ts';

// the desk's forms, to hand the planner beside the effect's
export const DESK_FORMS = frozen([CHANNEL_FORM, DESK_FORM]);
