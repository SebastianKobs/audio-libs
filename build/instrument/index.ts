// ---------- build/instrument: MIDI's notes played into an instrument, on what's built ----------
// Its parts:
//   - voices.ts: the voices, a Receiver, each note a copy of its pool's voice card, let go once
//     it has rung out;
//   - silence.ts: when a voice has rung out, worked out from its voice card;
//   - instrument.ts: one instrument playing one patch from a file of instruments, its voices,
//     built by the builder handed in, its edits glided or built again;
//   - sound-module.ts: a multitimbral sound module, a part for each track, each playing a
//     patch from its bank, an edit reaching every part that plays it;
//   - test-notes.ts: a device view's test note, an instrument of its own for each key, pressed
//     and let go as messages on a bus too.
export { Voices } from './voices.ts';
export { Instrument, type InstrumentMaking } from './instrument.ts';
export { SoundModule, type PartMaking } from './sound-module.ts';
export { TestNotes, type HeldTestNote, type PhrasedTestNote } from './test-notes.ts';
