// ---------- libs/view/desk/models: a desk's view models, no DOM ----------
// On a device's view models (libs/view/device/models/).
// Its parts:
//   - desk-view-builder.ts: a desk's view models, its strips and its desk;
//   - strip.ts: a channel as a strip, by its form, its name as shown;
//   - desk-model.ts: a desk read as its strips, by role, a solo click;
//   - desk-groups.ts: the groups of tracks a desk shows, a desk's channels as one;
//   - toggles.ts: keys turned from where each starts, a section folded, a group unfolded;
export { DeskViewBuilder } from './desk-view-builder.ts';
export { Strip, shortName, shownName } from './strip.ts';
export { DeskModel, type BusGroup } from './desk-model.ts';
export { channelGroups, type DeskGroup, type DeskTrack, type TrackNow } from './desk-groups.ts';
export { Toggles } from './toggles.ts';
