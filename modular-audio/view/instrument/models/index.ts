// ---------- libs/modular-audio/view/instrument/models: an instrument's view models, no DOM ----------
// On a device's view models (libs/modular-audio/view/device/models/). Its parts:
//   - cards.ts: an instrument's patches as the device view edits them, a preset's readout each, the
//     patch edited in the bank;
//   - instrument-racks.ts: the instruments as the device view shows them, a rack of cards each,
//     the test note every one plays, which of its own values each reads.
export { InstrumentCards, type CardValues } from './cards.ts';
export { InstrumentRacks, type InstrumentRack } from './instrument-racks.ts';
