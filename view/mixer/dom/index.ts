// ---------- libs/view/mixer/dom: a desk drawn in the DOM ----------
// On a device's drawers (libs/view/device/dom/).
// Its parts:
//   - strip-view.ts: a strip drawn, its slots, its mute and solo;
//   - section-view.ts: a section of a view, its strips in a row, folding, its light;
//   - mixer-view.ts: a mixer drawn, its strips side by side in its sections, the groups of
//     tracks it's handed, its level bars and its lights;
//   - insert-devices.ts: a strip's inserts, each a composite drawn flat, a reset for what's live;
export { muteSoloHtml, slotsHtml, stripHtml, type StripLook } from './strip-view.ts';
export { SectionView } from './section-view.ts';
export { deskHtml, fedBy, MixerView, trackHtml, type MixerLook } from './mixer-view.ts';
export { InsertDevices } from './insert-devices.ts';
