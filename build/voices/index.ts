// ---------- build/voices: MIDI's notes played into an instrument, on what's built ----------
// Its parts:
//   - voices.ts: the voices, a Receiver, each note a copy of its pool's voice card, let go once
//     it has rung out;
//   - silence.ts: when a voice has rung out, worked out from its voice card.
export { Voices } from './voices.ts';
