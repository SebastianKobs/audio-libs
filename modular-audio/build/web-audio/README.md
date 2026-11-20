# modular-audio/build/web-audio

The builder for Web Audio: handed a plan, where its sound goes and where its inputs come from, it builds the plan and hands back what's built, a `Built`. It knows no planner, channel, desk, effect or instrument, and is the only code that makes Web Audio nodes. What's built is fed, metered and taken apart.

Depends on: `base/automation`, `base/params`, `base/util`, `dsp/filters`, `dsp/measures`, `dsp/saturation`, `dsp/true-peak`, `modular-audio/build/contract`, `modular-audio/plan/blocks`, `modular-audio/plan/format`.

```ts
import { WebAudioBuilder } from './index.ts';
const builder = new WebAudioBuilder({ context, beat: () => 60 / bpm });
const built = builder.build(plan, { into: context.destination, from: { in: source } });
built.set(['utility', 'level'], 0.5, { glide: 0.05 }); // a macro onto its targets
built.tempo(60 / 96); // its synced delays glide there
built.set(['env', 'gate'], 1, { at: 2 }); // an envelope's curve drawn from its gate
built.placeholders; // what it couldn't make, by address
built.dispose(); // its sources stopped, its nodes disconnected
```

How a plan is built:

1. Each block is made by its kind at its values and settings as they start. A block with several inputs gives each its own way in; an input taken in nowhere gets none (a select's other).
2. A block it can't make becomes a placeholder: a gain at 1, its sound passed straight through, a source with nothing coming in silent, said by its address.
3. Each composite is opened and its wires made by names. With no pool it has no node of its own: its inputs are the children's inputs, its outputs the children's outputs. With a pool it has a gain at 1 at each of its own jacks, where the pool's copies come and go.
4. A sound into a macro goes through a gain at each map's factor into what the map moves, as CV through attenuators.
5. Its inputs are fed from where they come from, its main output into where it goes.

How a block is made:

| Kind | Made of |
|---|---|
| `oscillator` | An oscillator, its rate a time with a sync switch (synced: its note at the beat, following a new tempo; free: Hz), a signal into its frequency in Hz. Its phase is reset at its copy's time, or runs free from when it's built. |
| `noise` | A looping buffer source, drawn from its offset at each start. |
| `gain` | A gain. |
| `filter` | One biquad at 12 dB an octave, two in series at 24, each with its own Q; the lowpass's and the highpass's Q turned into Web Audio's dB. |
| `pan` | A stereo panner with a mono sound made stereo first, or a pan pot; a gain where the context can't pan. |
| `delay` | One delay line made for its longest time, its time three params (sync, note, ms) moving it, a signal into its ms in seconds, a glide of 0.3 s on a change. |
| `reverb` | A convolver, its impulse made once by its length. |
| `limiter` | Drive into a compressor held as hard as Web Audio goes, then back by the makeup the compressor adds. |
| `lookahead limiter` | A worklet node of its processor, its four params its own and its reduction as the processor posts it; the `limiter` at the same gain, ceiling and release where the worklet hasn't loaded, its clip held. |
| `saturation` | A style's color before it (a low shelf, a peak, a high shelf), a gain that is the drive, punish and the style's heat, a waveshaper of the style's curve, a DC block, its color after (a low shelf, a one pole, a lowpass) and a gain that takes the level back by the auto gain; each curve made as it's set, so no waveshaper shares a table. |
| `one pole` | An IIR filter of the cutoff's coefficients, 6 dB an octave; a new cutoff makes a new filter in its place between the same neighbors, the old one let go. |
| `tilt` | A low shelf into a high shelf at the pivot, the lows down and the highs up by half the tilt each, in dB. |
| `shaper lag` | A delay as long as a waveshaper's oversampling holds the wet back, so a dry mixed under it doesn't comb: the lag the builder was handed when it was made, Chromium's where none was measured. |
| `envelope` | A constant source following the curve from its gate, added to the params it's wired into. |
| `select` | A gain at 1 on the input its setting names. |

| Export | What it does |
|---|---|
| `new WebAudioBuilder(options)`: `build()` | The builder: `build(plan, { into, from })` hands back a `WebAudioBuilt` (`builder.ts`). |
| `WebAudioOptions`, `WebAudioWhere` | What it's made with, the `context`, the `beat` now and optionally the `random` its noise draws from, shared `buffers`, the `draws` its sources make as they start, the `worklets` its blocks make nodes of (`NO_WORKLETS` where none are handed) and the `shaperLags` a shaper lag holds a dry back by (`CHROMIUM_LAGS` where none are handed). Where a build's sound goes (`into`) and what feeds its inputs (`from`) (`builder.ts`). |
| `WebAudioBuilt`: `set()`, `automate()`, `preset()`, `tempo()`, `add()`, `stopBy()`, `letGo()`, `rebuild()`, `dispose()`, `placeholders`, `feed()`, `wayInto()`, `peak()`, `faded()`, `reading()`, `jacksOf()`, `nodesUnder()` | What it hands back. A param is set or automated by its address, a preset's values set together, a pool's copy added, stopped by a time and let go, a plan built again, everything taken apart (`built.ts`). |
| `Building` | What what's built is made with: the context, where its sound goes and where its inputs come from, and how a plan and a copy's node are built into parts (`built.ts`). |
| `CROSSFADE`, `RING_OUT` | A rebuild builds the new beside the old, fades the old out and the new in over `CROSSFADE` (0.1 s) where the old makes sound of its own, and lets the old go after `RING_OUT` (8 s) (`rebuild.ts`). |
| `BuiltNode`, `WebAudioNode` | One built node, a Web Audio node or several in one shape, its params found by the plan's names; `WebAudioNode` is one of Web Audio's (`built-node.ts`). |
| `ParamInUnits`, `Automatable` | A param in the plan's units (dB, dBFS) that moves each Web Audio param behind it in its own; `Automatable` is what a plan's automation moves (`param-units.ts`). |
| `automate()` | A param told its automation from a time, each event as Web Audio schedules it (`automation.ts`). |
| `Buffers`, `noise()`, `impulse()` | The buffers a noise or a reverb plays, each made once by what it is and how long; `noise()` and `impulse()` make their samples (`buffers.ts`). |
| `biquadOf()`, `panOf()`, `PanLaw`, `limiterNodes()`, `makeupOf()` | A biquad with its Q a plain ratio, a pan by its law (stereo or pan pot), a limiter built of several nodes, and the makeup Web Audio's compressor adds, taken back (`blocks/`). |
| `meterOn()`, `PeakMeter` | A meter on a node, a splitter and an analyser for each side; its `peak()` is the loudest sample of its last 1,024 (`meters.ts`). |
| `Output`, `FADE_IN`, `FADE_OUT` | The output after what's built, a gain of its own into where the sound goes: faded in from silence so no sound starts at full volume, faded out to pause, kept awake by a silent source (`output.ts`). |
| `loadWorklets()`, `Worklets`, `NO_WORKLETS`, `ProcessorModules`, `ProcessorName` | `loadWorklets(context, modules)` adds each processor's module, by the URL it's handed under the name it registers (`ProcessorModules`, keyed by the literal `ProcessorName`, so the app's key, the maker's and the processor's can't differ), to a context's audio worklet, and hands back the `Worklets` that loaded: `node(context, processor, options)` is a worklet node or `null`. A module that fails or takes over 4 s, a context with no audio worklet and a node that fails to be made are said once, the node `null`; `NO_WORKLETS` is none loaded (`worklets.ts`). |
| `measuredLags()`, `CHROMIUM_LAGS`, `Lags`, `OfflineContexts` | How late a waveshaper comes out at each oversampling, in samples, as the browser's own: `measuredLags(sampleRate, Offline)` renders a click through one offline, once for each oversampling, and gives Chromium's `CHROMIUM_LAGS` where a render fails. Nothing is kept between calls: the context that asks keeps what it found (`shaper-lags.ts`). |
| `Copies`, `Editable` | Every built copy of one template, an edit reaching each: a value at its address under each copy, settings changed in one change so what's built is built again once (`copies.ts`). |

A processor is a file under `processors/`, an AudioWorklet module of its own: it registers as it loads, and the page reaches it only by its URL, which Vite makes (`?worker&url`) bundling in what it imports, the `dsp/true-peak` kernel for the lookahead limiter's.

What a studio needs of what's built, beyond the contract, is Web Audio's own, not every builder's:

- A sound fed into a node's input by its address, or a way of its own into a node (`fed-sounds.ts`); each is made again when what's built is built again.
- A meter on a node's main output by its address, or at a point inside a block (a limiter's `in` and `out`), made at its first read.
- What a block says of itself by name (a limiter's `reduction`, an envelope's `faded`), and the nodes under an address.

Tests: `test/builder.test.js`, `test/set.test.js`, `test/pool.test.js`, `test/rebuild.test.js`, `test/copies.test.js`, `test/output.test.js`, `test/buffers.test.js`, `test/limiter.test.js`, `test/envelope.test.js`, `test/sources.test.js`, `test/worklets.test.js`, `test/lookahead-limiter.test.js`, `test/drive-blocks.test.js`, `test/shaper-lags.test.js` and `test/stand-in.test.js`, in node on the stand-in for Web Audio in `test/audio-stand-in.js`.
