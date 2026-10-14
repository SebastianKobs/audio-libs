// ---------- libs/desk-plan/params: a strip's own parameters, as a plugin declares its own ----------
// Each with its name, its range and its taper (libs/synth/'s ParamSpec), so a knob, a lane and a controller's CC each turn a position
// into a value the same way. A gain is a share, shown in dB, its range in dB.
//   volume, and each send: by the fader law, unity two thirds up, +6 dB at the top, as Ableton's faders and sends;
//   pan: left -1 to right 1, centred at 0, in a line;
//   mute and solo: switches, off 0 or on 1.
import { FADER_GAIN, PAN, SWITCH, type ParamSpec } from '../params/index.ts';

// a strip's own parameters, by name
export const STRIP_PARAMS = Object.freeze({
  volume: Object.freeze({ ...FADER_GAIN, name: 'volume' }),
  pan: PAN,
  mute: Object.freeze({ ...SWITCH, name: 'mute' }),
  solo: Object.freeze({ ...SWITCH, name: 'solo' }),
}) satisfies Readonly<Record<string, ParamSpec>>;
// a send to a return, each by the return's name
export const SEND_PARAM: ParamSpec = Object.freeze({ ...FADER_GAIN, name: 'send' });
