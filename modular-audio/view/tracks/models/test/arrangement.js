// The arrangement's fixtures, shared by arrangement*.test.js and the arrangement view's test: the tracks as a
// control surface names them, the desk's strips, regions and lanes as recorded, and an Arrangement on a clock
// of the tests' own, 16ths a quarter of a second apart from 0.
import { Arrangement } from '../index.ts';
import { STRIP_PARAMS } from '../../../../../base/params/index.ts';

// the desk's sections as a view labels them
const SECTIONS = { buses: 'bus', returns: 'fx', master: 'master', instruments: 'instruments' };

// the desk they're from: each bus and those that go into it, the returns, the master
export const DESK = {
  buses: [
    { bus: stripOf('you', 'my playing'), members: [stripOf('trace', 'my trace')] },
    { bus: stripOf('ambient', 'background'), members: [] },
  ],
  returns: [stripOf('reverb', 'reverb')],
  master: stripOf('master', 'master'),
};

const ROLE = { tap: 'tap', vine: 'trace', bloom: 'hold', tower: 'circle' };

// the tracks, as a control surface names them: your kinds' pools first, then each kind's group,
// the background's sounds sharing one
const tracks = {
  groups: [
    ...Object.values(ROLE).map((role) => ({ group: `my ${role}`, name: `my ${role}` })),
    { group: 'background', name: 'background' },
    { group: 'tap', name: 'flowers' },
    { group: 'vine', name: 'vines' },
  ],
  groupOf: (kind, live) => (live ? myGroupOf(kind) : groupOf(kind)),
  clipName: (clip) => clip.name,
  hasClip: (clip) => !clip.gone,
};

// a strip's controllers in the order the sound goes through it, as the desk's view models list them: one with
// a dullness after its Utility, as a tower's
const ORDERS = {
  tap: ['air/cutoff', 'utility/level', 'utility/pan', 'dull/cutoff', 'send/reverb', 'volume', 'pan', 'mute', 'solo'],
  master: ['limiter/gain', 'limiter/ceiling', 'limiter/release', 'volume'],
  'instrument rhodes': ['voice/cutoff', 'voice/decay'], // a patch's, in its cards' order
};
const controllersOf = (strip) => ORDERS[strip] ?? [];

// a region as recorded, played back or live, on a track of its kind's group or its pool
export function region(kind, track, clip = {}, { from = 1, to = 2, notes = [], live = false } = {}) {
  return { clip, kind, live, track, from, to, notes };
}
export function replay(kind, track, clip) {
  return region(kind, track, clip);
}
export function yours(kind, track, clip) {
  return region(kind, track, clip, { live: true });
}
// a lane as recorded: one point, whatever its value
export function lane(kind, track, controller) {
  return { kind, track, controller, points: [{ t: 1, value: 0.5 }] };
}

// An Arrangement on its fixtures, with what drives it:
//   - clock: step(i) is 16th i, at i / 4 s; t set by hand for a time between 16ths;
//   - transport: playingBack and playhead() set by hand, in seconds;
//   - cued: the times its release asked the transport to play from.
export function arrangementOf({
  regions = [],
  lanes = [],
  instruments = [],
  midiDevices = [],
  desk = DESK,
  song = { toTimeline: (t) => t, fromTimeline: (t) => t },
} = {}) {
  const steps = [];
  const clock = {
    t: 0,
    now: () => clock.t,
    onStep: (listener) => steps.push(listener),
    grid: {
      straightAt: (t) => t * 4,
      straightTime: (place) => place / 4,
      stepsPerBar: () => 16,
      stepsPerBeat: () => 4,
      heldAt: null,
      songTime: (t) => t,
      timeOfSong: (time) => time,
      song,
    },
    step(i) {
      clock.t = i / 4;
      for (const listener of steps) {
        listener(i, clock.t);
      }
    },
  };
  const transport = { playingBack: false, playhead: () => null };
  const isMidi = (controller) => midiDevices.find(({ name }) => name === controller);
  const declared = {
    specOf: (strip, controller) => (controller === 'volume' ? STRIP_PARAMS.volume : isMidi(controller)),
    isMidiDevice: (strip, controller) => isMidi(controller) !== undefined,
    controllersOf,
  };
  const recording = { regions: () => regions, lanes: () => lanes };
  const cued = [];
  const cue = (t) => {
    cued.push(t);
    Object.assign(transport, { playingBack: t !== null }); // as the transport plays back from there, at once
  };
  const arrangement = new Arrangement({
    recording,
    transport,
    declared,
    tracks,
    desk,
    instruments,
    sections: SECTIONS,
    clock,
    cue,
  });
  return { arrangement, clock, transport, cued };
}

function stripOf(name, shown) {
  return { address: [name], name: shown };
}
function myGroupOf(kind) {
  return ROLE[kind] ? `my ${ROLE[kind]}` : null;
}
function groupOf(kind) {
  return ['ambient', 'bass'].includes(kind) ? 'background' : kind;
}
