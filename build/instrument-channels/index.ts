// ---------- build/instrument-channels: a track's sounding end ----------
// Between the sound module and the desk, so neither knows the other: a track's notes into its
// instrument, plugged into its channel, its controllers onto its strip.
//   - instrument-channel.ts: one track's, as a sequencer plays it, or a game's router;
//   - instrument-channel-factory.ts: a channel for each track's key, made as it's first asked
//     for, what's on it its owner's.
export { InstrumentChannelFactory, type Part } from './instrument-channel-factory.ts';
