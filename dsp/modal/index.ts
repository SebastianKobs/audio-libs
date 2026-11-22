// ---------- dsp/modal: objects that ring in their modes, and the contacts between them (its entry) ----------
// Its parts:
//   - mode-bank.ts: an object's modes, pushed and read at points;
//   - cantilever.ts: a uniform beam clamped at one end, its modes' ratios and shapes;
//   - contact-law.ts: how hard two objects push apart, by how far one presses into the other;
//   - contacts.ts: contacts between banks' points, or a point and a barrier, every force solved at once each sample.
export { ModeBank, type Mode, type ModeState } from './mode-bank.ts';
export { cantileverRatio, cantileverShape } from './cantilever.ts';
export { ContactLaw, type ContactLawValues, type MeanForce } from './contact-law.ts';
export { Contacts, type Contact, type ContactPoint } from './contacts.ts';
