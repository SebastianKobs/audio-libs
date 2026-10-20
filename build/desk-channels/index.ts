// ---------- build/desk-channels: the tracks' channels on a mixing desk ----------
// Each track's channel its pool's copy on the desk (libs/build/desk/), added as it's first played on:
//   - desk-channels.ts: its instrument's way in, and what its notes set on it, the setup saying which;
//   - change.ts: a change to a param by its address, and when it lands on what's built's clock.
export { DeskChannels, type ChannelInput } from './desk-channels.ts';
export { whenOf, type Change } from './change.ts';
