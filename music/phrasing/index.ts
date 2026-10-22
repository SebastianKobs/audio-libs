// ---------- phrasing: a phrase played as a player would: its speed for how fast you play, its feel, reshaped ----------
// Its parts:
//   - speed.ts: a pattern's speed for how fast you play, and the feel it calls for;
//   - transforms.ts: a phrase reshaped as a player would.
export { speedFor, speedAt, notesPerBeat, feelFor } from './speed.ts';
export { answer, layBack, holdLast, halfTime, breath, rephrase, slide, type PhraseNote } from './transforms.ts';
