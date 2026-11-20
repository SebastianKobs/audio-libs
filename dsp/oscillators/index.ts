// ---------- libs/dsp/oscillators: oscillator voices rendered sample by sample, and a way to start and stop one (its entry) ----------
// Its parts:
//   - voice.ts: what a voice is handed, `VoiceParams`, and the numbers they all read;
//   - sync-voice.ts: a slave oscillator reset by a master;
//   - operator-voice.ts, operator-algorithms.ts: phase modulation between up to four operators, and the eight ways to route them;
//   - phase-distortion-voice.ts: a cosine through a phase bent at a knee;
//   - scheduled-voice.ts: any voice told when to start and stop, the one way each is made a source.
export { OPERATOR_ALGORITHMS, type OperatorAlgorithm } from './operator-algorithms.ts';
export { OperatorVoice, type OperatorSetup } from './operator-voice.ts';
export { PhaseDistortionVoice, type PhaseDistortionSetup } from './phase-distortion-voice.ts';
export { ScheduledVoice, type BlockClock } from './scheduled-voice.ts';
export { SyncVoice } from './sync-voice.ts';
export type { Voice, VoiceParams } from './voice.ts';
