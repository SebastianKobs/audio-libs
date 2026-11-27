# The libraries

The libraries, and how they fit together. Each is a folder: its entry (`base/util/index.ts`), and a content file where it holds templates as data (`modular-audio/plan/effects/content.ts`); its README; its tests in a folder beside it (`base/util/test/`). A library imports only those its row in the import test names (`test/module-rules.js`), each through its entry, and nothing above the libraries. So a project takes the layers it needs: a plan without a builder, a builder without a view, a view of a plan without the desk.

## Using them

Take the layers you need: copy their folders, or mount this repo as a git submodule, and import each library through its entry. The TypeScript runs as it is: Node strips the types, and a bundler such as Vite reads it. The only npm package the libraries need is `yaml`, for the loader below.

- **Templates as YAML.** A template is written as a `.yaml` file and imported as its data. In a Vite project add `yamlPlugin()` from `tools/yaml.js` to its config; in Node register the hooks, `node --import ./tools/yaml-hooks.js`. The types of such an import are in `types/yaml.d.ts`.
- **Worklets by their URLs.** A processor is a module of its own, loaded into an audio context from its URL by `loadWorklets()` (`modular-audio/build/web-audio/worklets.ts`). Import each with Vite's `?worker&url` (`types/worker-url.d.ts`), so it is bundled into a file of its own and can import what it shares. A page opened from `file://` can't load them: serve it over http. Without a worklet, its block passes the sound through or falls back.
- **Web Audio only in the builder.** Everything else runs in Node with no audio and no DOM, so a plan, a sequencer and a view model are tested without a browser.
- **Mounted in a project.** The project clones it with `git submodule update --init`. Changes are made and committed in the mount: once per clone, `git config core.hooksPath .githooks` there, so a labeled commit's hash is filled into `technical-log.md`; no `npm install` there: Node and npx find the tools in the project's `node_modules/`, so the project installs each package `package.json` names, at its version. `make test-unit` runs before each commit. The project then moves its pin to the new commit.

## How they're tested

`make test-unit` runs the type check, the format check, the linter, Knip, the class members check and the clone finder, then every library's tests (`*/*/test/`) and those across libraries (`test/unit/`) in Node, their memory capped. The checks come from `ts-code-checks`, an optional dependency: without it they're skipped. The scenarios of `test/scenarios/` are the code a user writes, run by `test/unit/library-layers.test.js`. The clock's, the gestures' and the space's test vectors are in `test-vectors/`, recorded on purpose by the writers in `tools/`. The docs are held by `test/unit/docs-rules.test.js`: every path exists, each README's face is its library's exports and its `Depends on:` line its row in `test/module-rules.js`, American spelling.

## By role

Nine groups, each a folder, read bottom up. A group reads only those before it. Each group's README names its libraries and what it reads, each library's what it offers.

- [`base/`](base/README.md): words and helpers every library shares.
- [`midi/`](midi/README.md): MIDI 2.0's channel voice messages as values, and what they're played into.
- [`sequencing/`](sequencing/README.md): time, events, the MIDI sequencer and the transport's view.
- [`music/`](music/README.md): notes, keys, scales and a play style, musical time in beats, a phrase played as a player would.
- [`midi-devices/`](midi-devices/README.md): inserts on a track's notes, as an audio effect is on its sound, the Scale device.
- [`spatial/`](spatial/README.md): places perceived from where you are, hearing by distance, pointer input as gestures.
- [`modular-audio/`](modular-audio/README.md): a sound as data (`modular-audio/plan/`), built (`modular-audio/build/`) and shown (`modular-audio/view/`), and its way through them.
- [`dsp/`](dsp/README.md): signal processing on sample arrays, free of any audio API: measuring, saturating, filtering, a designed impulse, oscillator voices, crushing and granular effects, a true-peak limiter.
- [`formats/`](formats/README.md): files other programs read, written from what the groups before it make, a WAV file, a MIDI file read and written.

## By layer

A library's layer is one more than the highest of those it uses; it can be taken with only the layers below it. Kept by hand, from the import test's rows.

| Layer | Libraries |
|---|---|
| 0 | `base/html`, `base/util`, `dsp/crusher`, `dsp/dynamics`, `dsp/filters`, `dsp/measures`, `dsp/operator-levels`, `dsp/oscillators`, `dsp/saturation`, `dsp/wow`, `formats/midi-file`, `formats/wav` |
| 1 | `base/automation`, `base/params`, `dsp/grains`, `dsp/impulse`, `dsp/loudness`, `music/meter`, `music/music-theory`, `spatial/places` |
| 2 | `dsp/true-peak`, `modular-audio/plan/format`, `sequencing/clock`, `midi/protocol`, `spatial/hearing` |
| 3 | `modular-audio/build/contract`, `modular-audio/plan/blocks`, `modular-audio/view/device/readout`, `modular-audio/view/tracks/readout`, `midi-devices/scale`, `sequencing/sequencer`, `sequencing/timeline`, `sequencing/view/transport/models`, `spatial/gestures` |
| 4 | `modular-audio/build/web-audio`, `modular-audio/plan/planner`, `modular-audio/view/device/models`, `modular-audio/view/instrument/readout`, `sequencing/midi-sequencer`, `sequencing/view/transport/dom` |
| 5 | `modular-audio/build/web-audio-engine`, `modular-audio/plan/effects`, `modular-audio/plan/instrument`, `modular-audio/view/desk/models`, `modular-audio/view/device/dom`, `music/phrasing`, `sequencing/clip-player` |
| 6 | `modular-audio/build/instrument`, `modular-audio/plan/desk`, `modular-audio/view/desk/dom`, `modular-audio/view/instrument/models` |
| 7 | `modular-audio/build/desk/mixing`, `modular-audio/view/instrument/dom`, `modular-audio/view/tracks/models` |
| 8 | `modular-audio/build/desk/automation`, `modular-audio/view/desk/readout`, `modular-audio/view/tracks/dom` |

## Scenarios

Five scenarios, each the code a user of the libraries writes, in `test/scenarios/`. `test/unit/library-layers.test.js` runs each and checks it reaches only the libraries it needs, so a layer can be taken alone.

1. `test/scenarios/plan-in-code.js`: an oscillator and an envelope planned and wired in code, `plan/planner` alone.
2. `test/scenarios/build-a-plan.js`: that plan built for Web Audio, with no view, clock or engine.
3. `test/scenarios/device-view.js`: a plan's device drawn, through `view/device`'s readout, models and dom.
4. `test/scenarios/desk-alone.js`: a desk planned, built and mixed, with no clock, MIDI or sequencer.
5. `test/scenarios/instrument-played.js`: an instrument planned from a file of instruments, built and played by MIDI's notes.

Scenario 2, its imports written from the repo's root:

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
