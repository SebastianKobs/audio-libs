// ---------- plan/effects: what every effect is, its form ----------
// One input and one output, its form (form.ts).
// The effects themselves, a template each read from YAML, are its content (content.ts),
// imported apart, so code needing the form alone loads no YAML.
// What some are played with, beside them:
//   - ducking.ts: a Ducker's level as the kicks dip it, automation from their times;
//   - chorus.ts: a Chorus's lags at its rate, its three lines a third of a turn apart;
//   - juno-chorus.ts: the Juno-60's two rates, I and II;
//   - tape-echo.ts: the tape echo's time glide, TAPE_GLIDE;
//   - room.ts: the PCM-60's room and plate, PCM60, and its range of decay.
export { EFFECT_FORM } from './form.ts';
export { duckEvents, type Ducking } from './ducking.ts';
export { chorusLags, chorusValues } from './chorus.ts';
export { JUNO_CHORUS } from './juno-chorus.ts';
export { TAPE_GLIDE } from './tape-echo.ts';
export { PCM60, PCM60_DECAY } from './room.ts';
