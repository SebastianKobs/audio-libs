// ---------- libs/view/mixer/models: a desk's view models, no DOM ----------
// On a device's view models (libs/view/device/models/).
// Its parts:
//   - mixer-view-builder.ts: a desk's view models, its strips and its mixer;
//   - strip.ts: a channel as a strip, by its form, its name as shown;
//   - mixer.ts: a desk as a mixer, its strips by role, a solo click;
//   - mixer-groups.ts: the groups of tracks a mixer shows, a desk's channels as one;
//   - toggles.ts: keys turned from where each starts, a section folded, a group unfolded;
export { MixerViewBuilder } from './mixer-view-builder.ts';
export { Strip, shortName, shownName } from './strip.ts';
export { Mixer, type BusGroup } from './mixer.ts';
export { channelGroups, type MixerGroup, type MixerTrack, type TrackNow } from './mixer-groups.ts';
export { Toggles } from './toggles.ts';
