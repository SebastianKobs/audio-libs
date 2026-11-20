// ---------- libs/dsp/grains: granular freeze and smear, on sample arrays (its entry) ----------
// Its parts:
//   - grain-cloud.ts: an input kept in a ring and played back as short overlapping grains.
export { GrainCloud, type GrainCloudSetup, type GrainParams } from './grain-cloud.ts';
