// ---------- libs/web-audio-mixer/params: a strip's own parameters, as a plugin declares its own ----------
// Each with its name, its range and its taper (libs/synth/'s ParamSpec), so a knob, a lane and a controller's CC each turn a position
// into a value the same way. A gain is a share, shown in dB, its range in dB.
//   volume, and each send: by the fader law, unity two thirds up, +6 dB at the top, as Ableton's faders and sends;
//   pan: left -1 to right 1, centred at 0, in a line;
//   mute and solo: switches, off 0 or on 1.
import type { ParamSpec } from '../synth/index.ts';

// a strip's own parameters, by name
export const STRIP_PARAMS = Object.freeze({
  volume: Object.freeze({
    name: 'volume',
    range: Object.freeze([-60, 6, 0.1] as const),
    dB: true as const,
    taper: 'fader' as const,
  }),
  pan: Object.freeze({ name: 'pan', range: Object.freeze([-1, 1, 0.01] as const) }),
  mute: Object.freeze({ name: 'mute', range: Object.freeze([0, 1, 1] as const) }),
  solo: Object.freeze({ name: 'solo', range: Object.freeze([0, 1, 1] as const) }),
}) satisfies Readonly<Record<string, ParamSpec>>;
// a send to a return, each by the return's name
export const SEND_PARAM: ParamSpec = Object.freeze({
  name: 'send',
  range: Object.freeze([-60, 6, 0.1] as const),
  dB: true,
  taper: 'fader',
});
