// ---------- plan/blocks: the building blocks, declared ----------
// Nodes with no inside: the contract every builder meets, each one built or a placeholder
// put in. Kept small and fixed.
// Its parts:
//   - block.ts: a block, its inputs and outputs, its params' and settings' specs;
//   - blocks.ts: every block by its kind;
//   - one file each: oscillator, gain, filter, pan, delay, reverb, noise, limiter, lookahead limiter,
//     envelope, select, saturation, one pole, tilt, shaper lag, sync oscillator, operators,
//     phase distortion, crusher, grains, saturating filter, germanium stage, shaper, eq band, compressor,
//     wow, room,
//     with the specs other code shares (a delay's time, a limiter's, an envelope's, a source's stop,
//     a saturation's and its oversampling, a sync oscillator's, the operators', a phase distortion's,
//     a crusher's, the grains' and their memory, a saturating filter's, a germanium stage's, a shaper's,
//     an eq band's);
//   - envelope-curve.ts: how an envelope moves, stage by stage from its gate, as automation, as
//     an ARP's.
export { STOP, type Block, type Jack } from './block.ts';
export { BLOCKS, type BlockKind } from './blocks.ts';
export { CRUSHER_SPECS } from './crusher.ts';
export { DELAY_TIME } from './delay.ts';
export { ENVELOPE_SPECS } from './envelope.ts';
export { EQ_BAND_SPECS } from './eq-band.ts';
export { CHARGED, DONE, envelopeCurve, envelopeRelease, envelopeStages, type EnvelopeTimes } from './envelope-curve.ts';
export { biquadQs, FILTER_SLOPE, RESONANCE, type FilterStages } from './filter.ts';
export { GRAINS_MEMORY, GRAINS_SPECS } from './grains.ts';
export { LIMITER_SPECS } from './limiter.ts';
export { LOOKAHEAD_LIMITER_SPECS } from './lookahead-limiter.ts';
export { NOISE_SECONDS } from './noise.ts';
export { OPERATORS_SPECS } from './operators.ts';
export { DETUNE, WAVE } from './oscillator.ts';
export { PHASE_DISTORTION_SPECS } from './phase-distortion.ts';
export { REVERB_LENGTH } from './reverb.ts';
export { SATURATING_FILTER_SPECS } from './saturating-filter.ts';
export { GERMANIUM_STAGE_SPECS } from './germanium-stage.ts';
export { OVERSAMPLE, SATURATION_SPECS } from './saturation.ts';
export { SHAPER_SPECS } from './shaper.ts';
export { SYNC_OSCILLATOR_SPECS } from './sync-oscillator.ts';
