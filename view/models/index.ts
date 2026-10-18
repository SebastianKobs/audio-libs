// ---------- libs/view/models: view models built from a plan, no DOM ----------
// Handed a plan and its values through a port, hands back what a view shows and what it can do.
// Its parts:
//   - model.ts: the plan and its values by address, read through the tool's port;
//   - view-builder.ts: view models for whatever part of a plan is asked;
//   - knob.ts: a param with a range as a control, its text as shown;
//   - choice.ts: a param or a setting with choices;
//   - device.ts: a node as a device, its controls in order, what every control has;
//   - strip.ts: a channel as a strip, by its form, its name as shown;
//   - mixer.ts: a desk as a mixer, its strips by role, a solo click;
//   - moves.ts: what moves each param, a macro's maps and a child wired into it, as a mod matrix;
//   - envelope.ts: an envelope's curve from its knobs, as a view draws it, the curve played;
//   - preset-port.ts: a port for a plan whose values a preset gives, a patch's on its voice card;
//   - cards.ts: an instrument's patches as the device view edits them, a port each, the patch
//     edited in the bank;
//   - desk-port.ts: a port for a desk as it plays (libs/build/desk/), its meters, its mix;
//   - command.ts: what's done in a view, by address;
//   - custom.ts: a view of its own, registered by kind;
//   - clip-tracks.ts: the clip tracks, each clip read from what holds it, a clip player or the
//     control surface, its ▶, and its × asking first;
//   - arrangement/: what was heard laid out in time, its rows, regions and lanes, the time in
//     view and the playhead, in 16ths; its port in its own words (ports.ts); a region's notes'
//     and a lane's shapes, as they're drawn; what the desk declares, read from its view models.
export { Choice } from './choice.ts';
export { ClipTracks, type ShownClip } from './clip-tracks.ts';
export type { Command } from './command.ts';
export { CustomViews } from './custom.ts';
export { Control, type Device } from './device.ts';
export { envelopeDrawing, type EnvelopeDrawing } from './envelope.ts';
export { Knob, textOf, type Ring } from './knob.ts';
export { Mixer, type BusGroup } from './mixer.ts';
export type { ModelPort, Role, Slot } from './model.ts';
export type { Move } from './moves.ts';
export { PresetPort, type PresetOwner } from './preset-port.ts';
export { InstrumentCards, type CardValues, type InstrumentCard } from './cards.ts';
export { deskPort } from './desk-port.ts';
export { Strip, shortName, shownName } from './strip.ts';
export { ViewBuilder, type MatrixRow } from './view-builder.ts';
export { Arrangement, type PlacedLane, type PlacedRegion } from './arrangement/arrangement.ts';
export { declaredBy } from './arrangement/declared.ts';
export { laneLine, type Corner } from './arrangement/lane-shapes.ts';
export { noteShape, pitchRange, type NoteShape } from './arrangement/note-shapes.ts';
export type { Row } from './arrangement/rows.ts';
export type {
  ArrangedStrip,
  ArrangementClock,
  Declared,
  Playhead,
  RecordedLane,
  RecordedNote,
  RecordedRegion,
  Recording,
  TrackGroup,
  Tracks,
} from './arrangement/ports.ts';
