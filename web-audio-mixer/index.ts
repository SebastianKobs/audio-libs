// ---------- libs/web-audio-mixer: the desk every sound goes through, into the engine's context ----------
// The sum, then the master's insert, then the master, then the context's output: a bigger mix gets fuller, never louder. The sum and the
// master each a Gain module the engine builds (libs/web-audio-fx/'s BuiltModule, F5b); a channel's and a bus's input, fader, sends and room each a
// Gain module, its pan a Pan module (F5c); an FX channel's input, level, output and sends each a Gain module, its pan a Pan module
// (F5d): the mixer makes no node of its own. The insert is
// built by the caller (master: a MasterInsert), the desk's a chain of libs/web-audio-fx/'s Limiter module, as Ableton's: its gain into it, and its
// ceiling in dBFS. The master starts at 0 and fades in to its volume: never at full volume. On the desk, as on a mixing desk:
// - channel(name, { volume, pan, sends, room, out, inserts }): a fader, sent after the fader to the FX channels it names, at 1, or by
//   amount; with a pan, after the fader, its sends and its way out after it; with room, a second input that goes only to that FX channel,
//   the extra reverb far sounds get: a send of its own, at its amount (roomAmount, 1 if none is given) times the fader's level, set by
//   sendTo(room, v) as any send. Out to the master, or a bus. With inserts, they come before the fader, and
//   a send can be taken from one's tap (below). Every pan on the desk is stereo, so a mono sound is as loud in the middle
// - bus(name, { volume, pan, sends, room, roomAmount, out, inserts }): a submix, a channel whose input takes what's routed into it: channels, FX channels, phrases.
//   With sends, a group, as Ableton's: its tracks into it, through its fader, sent after it
// - peak(name): a strip's peak, for a meter, after its fader and pan; the master's after its insert, and the points its insert names (the
//   limiter's in, after its gain, and out)
//   (meterFall(): how a meter falls back; meterPosition(): where a level shows on it). reduction(): what the insert takes away, in dB
// - fx(name, { level, pan, sends, out, inserts }): an FX channel, stereo. An input, where sends arrive; a chain of FX modules (libs/web-audio-fx/),
//   built between its input and chainOut: its inserts, as a channel's but after the chain, in order, into its level, or else its level; its level; a pan, if it has one; sends to other FX channels, taken after the pan, so they keep
//   its panning ({ reverb: 0.4 }); and its output, to the master or a bus. volume(v), panTo(v) and sendTo(name, v) glide them
// A send or an output goes only to what's on the desk already, so there are no loops. route(name, out) moves a strip's output while it
// plays, to the master or any bus that doesn't feed it, through an output or a send. volume(v) glides the master. pause() fades the
// master out, and the context stops once it has faded; resume() fades it in again, from where the fade got to
// if it hadn't stopped yet. Its settings are passed in
// Its parts: the desk (mixer.ts), a channel or bus (channel.ts), an FX channel (fx-channel.ts), a strip's mute's time constant (gains.ts).
// Where each strip goes, and mute and solo, its routing's (libs/mixer/, since X3b; out of mixer.ts and mute-solo.ts in X3a). A meter itself
// the engine's; a strip's controls' names the sound's (sound/controls.ts), their order and their scales the views' (mixer-surface/controls.ts),
// since X1; the fader's law a param's taper (libs/synth/taper.ts) since U2c4a
export { Mixer } from './mixer.ts';
export type { MasterInsert, Strip } from './mixer.ts';
export { Channel } from './channel.ts';
export { deviceInsert } from './device-insert.ts';
export { buildChannel, buildFxChannel } from './build.ts';
export type { StripValues } from './build.ts';
export { setTarget, targetOf } from './target.ts';
export type { Target, Timing } from './target.ts';
export type { Insert, Send, StripOptions } from './channel.ts';
export { FxChannel } from './fx-channel.ts';
export type { FxOptions } from './fx-channel.ts';
