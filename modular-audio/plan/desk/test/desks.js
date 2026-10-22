// Small desks written short, as a studio's YAML would write them: the desk's tests' data.
//   REPLAY: a channel written apart: its air and a Utility panning as a pan pot, no pan of its own, its sends
//     taken before its fader.
//   TOWER: a channel built on REPLAY, a dullness after it.
//   STUDIO: today's desk, small: the reverb, the garden sings bus, a delay into it, your bus, your taps' channel
//     into it, the master with its limiter; a pool of your taps' tracks, a pool of towers' replays.
//   PRESETS: a theme's, the delay's echo.
// planned(): a desk written short, STUDIO unless another, planned with the effects, the forms and the presets.
import { DESK_FORMS, deskTemplates } from '../index.ts';
import { Planner } from '../../planner/index.ts';
import { EFFECT_FORM } from '../../effects/index.ts';
import { EFFECT_TEMPLATES } from '../../effects/content.ts';

export const REPLAY = {
  kind: 'Replay',
  pan: false,
  tap: 'pre',
  inserts: [
    { name: 'air', kind: 'Filter', does: 'the air' },
    { name: 'utility', kind: 'Utility', settings: { 'pan/law': 'pan pot' } },
  ],
};

export const TOWER = {
  kind: 'Tower',
  extends: 'Replay',
  volume: 0,
  inserts: [{ name: 'dull', kind: 'Filter', values: { cutoff: 350 } }],
};

export const STUDIO = {
  kind: 'Studio',
  channels: [
    {
      name: 'reverb',
      role: 'return',
      inserts: [
        { name: 'reverb', kind: 'Reverb' },
        { name: 'utility', kind: 'Utility', values: { level: 0.6 } },
      ],
    },
    { name: 'sings', role: 'bus' },
    {
      name: 'delay 1',
      role: 'return',
      out: 'sings',
      inserts: [
        { name: 'delay', preset: 'echo' },
        { name: 'utility', kind: 'Utility', values: { level: 0.8 } },
      ],
    },
    { name: 'you', role: 'bus' },
    { name: 'tap', role: 'bus', out: 'you', inserts: [{ name: 'utility', kind: 'Utility', values: { level: 0.7 } }] },
    { name: 'master', role: 'master', inserts: [{ name: 'limiter', kind: 'Limiter' }] },
  ],
  pools: [
    { name: 'my tap', channel: 'Replay', out: 'tap', volume: 1 },
    { name: 'replay tower', channel: 'Tower', out: 'sings', taps: { 'delay 1': 'post' } },
  ],
};

export const PRESETS = { echo: { kind: 'Delay', values: { note: '1/8.', feedback: 0.5 } } };

// a desk written short, planned with the effects, the forms and the presets
export function planned(desk = STUDIO) {
  const templates = [...EFFECT_TEMPLATES, ...deskTemplates(desk, [REPLAY, TOWER])];
  return new Planner(templates, [EFFECT_FORM, ...DESK_FORMS], PRESETS).plan(desk.kind);
}
