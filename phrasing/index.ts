// ---------- phrasing: a phrase played as a player would: its speed for how fast you play, its feel, kept and sliced, reshaped ----------
// Its parts:
//   - speed.ts: a pattern's speed for how fast you play, and the feel it calls for;
//   - record.ts: what's played kept, a run or slice of it, every pattern in a bank and its cycle;
//   - transforms.ts: a phrase reshaped as a player would.
export { speedFor, speedAt, notesPerBeat, feelFor } from './speed.ts';
export { keep, slice, phrases, unmute, patternsIn, cycleOf } from './record.ts';
export { answer, layBack, holdLast, halfTime, breath, rephrase, slide, type PhraseNote } from './transforms.ts';
