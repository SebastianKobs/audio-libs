# The libraries

The libraries in `mockup/src/libs/`, and how they fit together. Each is a folder: its entry (`libs/base/util/index.ts`), and a content file where it holds templates as data (`libs/modular-audio/plan/effects/content.ts`); its README; its tests in a folder beside it (`libs/base/util/test/`). A library imports only those its row in the import test names (`mockup/test/module-rules.js`), each through its entry, and nothing above the libraries. So a project takes the layers it needs: a plan without a builder, a builder without a view, a view of a plan without the desk.

## By role

Ten groups, each a folder, read bottom up. A group reads only those before it. Each group's README names its libraries and what it reads, each library's what it offers.

- [`base/`](base/README.md): words and helpers every library shares.
- [`generative/`](generative/README.md): the rules the visual ideas found, medium-free.
- [`midi/`](midi/README.md): MIDI 2.0's channel voice messages as values, and what they're played into.
- [`sequencing/`](sequencing/README.md): time, events, the MIDI sequencer and the transport's view.
- [`music/`](music/README.md): notes, keys, scales and a play style, a phrase played as a player would.
- [`midi-devices/`](midi-devices/README.md): inserts on a track's notes, as an audio effect is on its sound, the Scale device.
- [`spatial/`](spatial/README.md): places perceived from where you are, hearing by distance, pointer input as gestures.
- [`modular-audio/`](modular-audio/README.md): a sound as data (`libs/modular-audio/plan/`), built (`libs/modular-audio/build/`) and shown (`libs/modular-audio/view/`), and its way through them.
- [`dsp/`](dsp/README.md): signal processing on sample arrays, free of any audio API: measuring, saturating, filtering, a designed impulse, a true-peak limiter.
- [`formats/`](formats/README.md): files other programs read, written from what the groups before it make, a WAV file.

## By layer

A library's layer is one more than the highest of those it uses; it can be taken with only the layers below it. Kept by hand, from the import test's rows.

| Layer | Libraries |
|---|---|
| 0 | `base/html`, `base/util`, `dsp/dynamics`, `dsp/filters`, `dsp/measures`, `dsp/operator-levels`, `dsp/saturation`, `dsp/wow`, `formats/wav`, `generative/randomness` |
| 1 | `base/automation`, `base/params`, `dsp/impulse`, `dsp/loudness`, `generative/articulation`, `generative/automata`, `generative/genetics`, `generative/rewriting`, `generative/sync`, `generative/trails`, `music/music-theory`, `spatial/places` |
| 2 | `dsp/true-peak`, `modular-audio/plan/format`, `sequencing/clock`, `midi/protocol`, `spatial/hearing` |
| 3 | `modular-audio/build/contract`, `modular-audio/plan/blocks`, `modular-audio/view/device/readout`, `modular-audio/view/tracks/readout`, `midi-devices/scale`, `sequencing/sequencer`, `sequencing/timeline`, `sequencing/view/transport/models`, `spatial/gestures` |
| 4 | `modular-audio/build/web-audio`, `modular-audio/plan/planner`, `modular-audio/view/device/models`, `modular-audio/view/instrument/readout`, `sequencing/midi-sequencer`, `sequencing/view/transport/dom` |
| 5 | `modular-audio/build/web-audio-engine`, `modular-audio/plan/effects`, `modular-audio/plan/instrument`, `modular-audio/view/desk/models`, `modular-audio/view/device/dom`, `music/phrasing`, `sequencing/clip-player` |
| 6 | `modular-audio/build/instrument`, `modular-audio/plan/desk`, `modular-audio/view/desk/dom`, `modular-audio/view/instrument/models` |
| 7 | `modular-audio/build/desk/mixing`, `modular-audio/view/instrument/dom`, `modular-audio/view/tracks/models` |
| 8 | `modular-audio/build/desk/automation`, `modular-audio/view/desk/readout`, `modular-audio/view/tracks/dom` |

## Scenarios

Five scenarios, each the code a user of the libraries writes, in `mockup/test/scenarios/`. `mockup/test/unit/library-layers.test.js` runs each and checks it reaches only the libraries it needs, so a layer can be taken alone.

1. `mockup/test/scenarios/plan-in-code.js`: an oscillator and an envelope planned and wired in code, `plan/planner` alone.
2. `mockup/test/scenarios/build-a-plan.js`: that plan built for Web Audio, with no view, clock or engine.
3. `mockup/test/scenarios/device-view.js`: a plan's device drawn, through `view/device`'s readout, models and dom.
4. `mockup/test/scenarios/desk-alone.js`: a desk planned, built and mixed, with no clock, MIDI or sequencer.
5. `mockup/test/scenarios/instrument-played.js`: an instrument planned from a file of instruments, built and played by MIDI's notes.

Scenario 2, its imports written from `libs/`:

```js
import { planVoice } from './plan-in-code.js';
import { WebAudioBuilder } from './modular-audio/build/web-audio/index.ts';

// the voice built into the context's destination, its envelope's gate opened at a time
export function buildVoice(context) {
  const builder = new WebAudioBuilder({ context, beat: () => 0.5 });
  const built = builder.build(planVoice(), { into: context.destination });
  built.set(['envelope', 'gate'], 1, { at: 1 });
  return built;
}
```
