# The libraries

The libraries in `mockup/src/libs/`, and how they fit together. Each is a folder: its entry, `index.ts`, and `content.ts` where it holds templates as data; its `README.md`; its tests in `test/`. A library imports only those its row in the import test names (`mockup/test/module-rules.js`), each through its entry, and nothing above the libraries. So a project takes the layers it needs: a plan without a builder, a builder without a view, a view of a plan without the desk.

## By role

- **At the bottom**, words and helpers every library shares: `util` (maths, searches, events, a bus, seeded draws, addresses, data read for its shape), `automation` (what a param is told as it plays), `params` (a param as a plugin declares it).
- **Time and events:** `clock` (music time, the beat grid, ticks), `timeline` (what happened, laid out in time, played back), `sequencer` (patterns of events on the grid, clips on tracks, pools of tracks).
- **MIDI:** `midi` (MIDI 2.0's channel voice messages as values), `midi-sequencer` (the input, the stream, the recorder, the recording played back), `clip-player` (a session view's clips, launched into the input).
- **Music:** `music-theory` (notes, keys, the standard scales, a play style), `phrasing` (a phrase played as a player would).
- **Places and input:** `spatial` (places perceived from where you are, a world that wraps round), `spatial-audio` (hearing by distance, as values), `gestures` (pointer input in, gestures out).
- **`plan/`, a sound as data, no audio:** `format` (what a plan is), `blocks` (the building blocks every builder makes), `planner` (templates made into plans), `effects`, `desk`, `synth` (forms and templates of each, the templates their content).
- **`build/`, a plan built:** `contract` (what every builder is and hands back), `web-audio` (the builder for Web Audio, the only code that makes Web Audio nodes), `web-audio-engine` (the audio's power, its context on the clock, building in the engine's context), `voices` (MIDI's notes played into an instrument), `desk` (a desk built, set by address and mixed), `track-channels` (a track's channel on a desk), `sequenced-desk` (a desk played from a sequencer), `instrument-channels` (a track's sounding end).
- **`view/`, by what's shown, each in layers** (`readout`, what a view reads; `models`, no DOM; `dom`, drawn), on `html` (HTML made safely): `device` (a plan's devices, knobs, choices, a composite), `mixer` (a desk as a mixer), `instrument` (an instrument's patches and racks), `transport` (play, stop, where the music is), `tracks` (the session view, the clips, the arrangement).

## By layer

A library's layer is one more than the highest of those it uses; it can be taken with only the layers below it.

| Layer | Libraries |
|---|---|
| 0 | `util`, `view/html` |
| 1 | `automation`, `music-theory`, `params`, `spatial` |
| 2 | `clock`, `plan/format`, `spatial-audio` |
| 3 | `build/contract`, `gestures`, `midi`, `plan/blocks`, `sequencer`, `timeline`, `view/device/readout`, `view/tracks/readout`, `view/transport/models` |
| 4 | `build/web-audio`, `midi-sequencer`, `plan/planner`, `view/device/models`, `view/instrument/readout`, `view/transport/dom` |
| 5 | `build/web-audio-engine`, `clip-player`, `phrasing`, `plan/effects`, `plan/synth`, `view/device/dom`, `view/mixer/models` |
| 6 | `build/voices`, `plan/desk`, `view/instrument/models`, `view/mixer/dom` |
| 7 | `build/desk`, `view/instrument/dom`, `view/tracks/models` |
| 8 | `build/track-channels`, `view/mixer/readout`, `view/tracks/dom` |
| 9 | `build/sequenced-desk` |
| 10 | `build/instrument-channels` |

## The sound's way through them

A sound is data until it's built, and built only by a builder:

1. **What a sound is** (`plan/format`, `plan/blocks`): a plan, a node, a block or a composite of others, its wires, params, macros and pools. Timeless: what to build, its values as it starts.
2. **Planned** (`plan/planner`): templates, written short or in YAML, made into a plan, checked against their forms; a block alone by its kind.
3. **What's planned** (`plan/effects`, `plan/desk`, `plan/synth`): the effects, a desk and its channels, a synth's voice cards and instruments, as forms and templates; a preset is values on one, by address.
4. **Built** (`build/contract`, `build/web-audio`): a builder handed a plan hands back what's built (`Built`), set and automated by address, built again, taken apart.
5. **Powered** (`build/web-audio-engine`): the audio context started on a first touch, what's built built into an output that fades in, the clock on the audio's time.
6. **Played by notes** (`build/voices`): MIDI's notes played into an instrument on what's built, a voice a pool's copy, a sound module a part for each track.
7. **Mixed** (`build/desk`, `build/track-channels`, `build/sequenced-desk`): a desk built, set by address, its mute and solo; a track's channel; played from a sequencer, a strip's controllers set on time (`CuedControls`).
8. **Tracks into channels** (`build/instrument-channels`): a track's notes into its instrument, its instrument into its channel on the desk, its controllers onto its strip.

Beside it, `spatial-audio` hears a place from where you listen and hands on what it hears as values: a track's controllers, a strip's, a note's own. The notes come through `midi-sequencer` (its input plays the instruments and records what's heard), from a control surface, a clip (`clip-player`) or a recording played back.

## Five scenarios

Each is a scenario the tests run (`mockup/test/scenarios/`, checked by `mockup/test/unit/library-layers.test.js` for the libraries it reaches), so the map can't drift from what runs.

### 1. An oscillator and an envelope planned and wired in code

Planning alone: `plan/planner`, no YAML, no builder.

```js
// Scenario 1 (LIBS8): a voice planned in code, as a library's user writes it: an oscillator and an envelope,
// each a block, wired into a gain, the envelope moving it; the planner alone, no template read from YAML.
import { Planner } from '../../src/libs/plan/planner/index.ts';

// the voice: the oscillator into a gain, the envelope into the gain's level
const VOICE = {
  kind: 'Voice',
  outputs: [{ name: 'out', channels: 1 }],
  children: [
    { name: 'oscillator', kind: 'oscillator' },
    { name: 'vca', kind: 'gain', values: { gain: 0 } },
    { name: 'envelope', kind: 'envelope', values: { attack: 0.01, release: 0.3 } },
  ],
  wires: [
    { from: { node: 'oscillator', output: 'out' }, to: { node: 'vca', input: 'in' } },
    { from: { node: 'envelope', output: 'out' }, to: { node: 'vca', param: 'gain' } },
    { from: { node: 'vca', output: 'out' }, to: { output: 'out' } },
  ],
};

// the voice planned, its blocks at their defaults but where it says
export function planVoice() {
  return new Planner([VOICE]).plan('Voice');
}
```

### 2. Built and run, with no view

The plan of scenario 1 handed to the Web Audio builder: `build/web-audio`, no clock, no engine.

```js
// Scenario 2 (LIBS10): the voice planned in code (plan-in-code.js) built for Web Audio, as a library's user
// writes it: into an audio context handed in, run with no view, no clock and no engine of the app's.
import { planVoice } from './plan-in-code.js';
import { WebAudioBuilder } from '../../src/libs/build/web-audio/index.ts';

// the voice built into the context's destination, its envelope's gate opened at a time
export function buildVoice(context) {
  const builder = new WebAudioBuilder({ context, beat: () => 0.5 });
  const built = builder.build(planVoice(), { into: context.destination });
  built.set(['envelope', 'gate'], 1, { at: 1 });
  return built;
}
```

### 3. A device view added

A plan's device shown, its knobs moving its params: the plan of scenario 1 read through `view/device`'s readout, shaped by its models, drawn by its dom.

```js
// Scenario 3 (LIBS13a): a plan's device drawn, as a library's user writes it: the voice planned in code
// (plan-in-code.js), read through a preset's readout, its envelope a device, drawn as HTML.
import { planVoice } from './plan-in-code.js';
import { PresetReadout } from '../../src/libs/view/device/readout/index.ts';
import { ViewBuilder } from '../../src/libs/view/device/models/index.ts';
import { controlHint, deviceHtml } from '../../src/libs/view/device/dom/index.ts';

// the voice's envelope as a device, its values the plan's, what's turned kept; drawn
export function drawEnvelope() {
  const plan = planVoice();
  const sent = [];
  const readout = new PresetReadout({ plan: () => plan, values: () => ({}), start: () => ({}) });
  const views = new ViewBuilder(readout, (command) => sent.push(command));
  const device = views.device(['envelope']);
  return { device, sent, html: deviceHtml(device, { status: 'envelope', hintOf: controlHint }).text };
}
```

### 4. A desk planned, built and mixed

A desk planned from one written short (`plan/desk`, `plan/planner`), built for Web Audio (`build/web-audio`) and mixed by address (`build/desk`), with no clock, MIDI or sequencer.

```js
// Scenario 4 (LIBS11): a desk alone, as a library's user writes it: planned from a desk written short, built for
// Web Audio into a context handed in, a value set by its address, a strip muted; no clock, no sequencer.
import { DESK_FORMS, deskTemplates } from '../../src/libs/plan/desk/index.ts';
import { Planner } from '../../src/libs/plan/planner/index.ts';
import { WebAudioBuilder } from '../../src/libs/build/web-audio/index.ts';
import { MixingDesk } from '../../src/libs/build/desk/index.ts';

// a desk written short: two channels into the master
const SMALL = {
  kind: 'Small',
  channels: [
    { name: 'voice', role: 'channel' },
    { name: 'drums', role: 'channel' },
    { name: 'master', role: 'master' },
  ],
};

// the desk built into the context's destination, the voice's volume set, the drums muted
export function mixSmallDesk(context) {
  const desk = new MixingDesk({ plan: new Planner(deskTemplates(SMALL), DESK_FORMS).plan('Small') });
  const builder = new WebAudioBuilder({ context, beat: () => 0.5 });
  desk.build((plan) => builder.build(plan, { into: context.destination }));
  desk.set(['voice', 'volume'], 0.5);
  desk.mute('drums', true);
  return desk;
}
```

### 5. An instrument planned, built and played by notes

An instrument planned from a file of instruments on the synth's modules (`plan/synth`, its `content.ts`), built (`build/web-audio`), and played by MIDI's notes (`build/voices`, `midi`).

```js
// Scenario 5: an instrument as a library's user writes it: a file of instruments
// on the synth's modules, a patch planned, built for Web Audio into a context handed
// in, played by a note; no view, desk or sequencer.
import { instrumentsOf } from '../../src/libs/plan/synth/index.ts';
import { MODULE_TEMPLATES } from '../../src/libs/plan/synth/content.ts';
import { WebAudioBuilder } from '../../src/libs/build/web-audio/index.ts';
import { Instrument } from '../../src/libs/build/voices/index.ts';
import { noteMessages } from '../../src/libs/midi/index.ts';

// a file of instruments: a pluck, an oscillator through a VCA, and a patch on it
const FILE = {
  instruments: {
    Pluck: {
      children: [
        { name: 'osc', kind: 'VCO', role: 'source' },
        {
          name: 'amp',
          kind: 'Envelope generator',
          role: 'modulator',
          values: { attack: 0.005, decay: 0.4, sustain: 0 },
        },
        { name: 'vca', kind: 'VCA', role: 'stage', values: { gain: 0 } },
        { name: 'out', kind: 'Out', role: 'out' },
      ],
      wires: [
        { from: { node: 'osc', output: 'out' }, to: { node: 'vca', input: 'in' } },
        { from: { node: 'vca', output: 'out' }, to: { node: 'out', input: 'in' } },
        { from: { node: 'out', output: 'out' }, to: { output: 'out' } },
        { from: { node: 'amp', output: 'out' }, to: { node: 'vca', param: 'gain' } },
      ],
      macros: [
        { name: 'frequency', maps: [{ to: ['osc', 'frequency'], factor: 1, offset: 0 }] },
        { name: 'gate', maps: [{ to: ['amp', 'gate'], factor: 1, offset: 0 }] },
        { name: 'velocity', maps: [{ to: ['amp', 'velocity'], factor: 1, offset: 0 }] },
      ],
    },
  },
  patches: { bright: { instrument: 'Pluck', values: { 'osc/tune': 12 } } },
};

// the patch's instrument built into the context's destination, an A played on it
export function playNote(context) {
  const instruments = instrumentsOf(FILE, 'scenario 5', MODULE_TEMPLATES);
  const builder = new WebAudioBuilder({ context, beat: () => 0.5 });
  const making = { instruments, patch: 'bright', builder, into: context.destination, at: (t) => t };
  const instrument = new Instrument({ ...making, now: () => context.currentTime });
  instrument.receive(noteMessages({ pitch: 69, velocity: 1, t: 0.1 }, 1));
  return instrument;
}
```
