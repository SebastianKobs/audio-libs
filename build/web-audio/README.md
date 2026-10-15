# build/web-audio

The builder for Web Audio: handed a plan, where its sound goes and where its inputs come from, it builds it and hands back what's built, the ports' `Builder` and `Built` (`libs/build/ports/`). A package of its own since LAY8a. It reads only the plan's format and its blocks (`libs/plan/format/`, `libs/plan/blocks/`), and knows no planner, channel, desk, effect or instrument. With the engine it takes over from (`libs/web-audio-engine/`, until LAY16), it's the only code that makes Web Audio nodes; the engine's node as built, its params in a plan's units, its limiter, pan, biquad and buffers are this library's, the engine on them.

```ts
import { WebAudioBuilder } from './index.ts';
const builder = new WebAudioBuilder({ context, beat: () => 60 / bpm });
const built = builder.build(plan, { into: context.destination, from: { in: source } });
built.set(['utility', 'level'], 0.5, { glide: 0.05 }); // a macro onto its targets
built.tempo(60 / 96);                                  // its synced delays glide there
built.placeholders; // what it couldn't make, by address: an envelope, until it's built
built.dispose();    // its sources stopped, its nodes disconnected
```

How a plan is built:
1. each block made by its kind (`blocks/makers.ts`), at its values and settings as they start;
2. a block it can't make a placeholder, a gain at 1, its sound passed straight through, a source with nothing coming in silent, said by its address;
3. each composite opened, its wires made by names (`wiring.ts`): with no pool, no node of its own, its inputs the children's inputs and params they lead to, its outputs the children's outputs that lead to them; holding a pool, a gain at 1 at each of its own jacks, where its pool's copies come and go;
4. its inputs fed from where they come from, its main output into where it goes.

| | |
|---|---|
| `WebAudioBuilder`, `WebAudioOptions`, `WebAudioWhere` | made with the context, the beat's length now, the random its noise is drawn from; `build(plan, { into, from })` (`builder.ts`) |
| `WebAudioBuilt` | what it hands back: a param set or automated by its address, a block's on what's built of it, a macro's mapped onto its targets, a choice by its index, a placeholder's left alone, an address with no param or a setting refused; a preset's values set together, a setting it changes refused until a rebuild; a new tempo told what follows it; a pool's copy added, built from the pool's child into parts of its own and wired by its rule, and let go, those parts taken apart and given back; built again, each build a generation, its plan, parts, jacks and copies: the new beside the old, its inputs moved over, the old faded out and the new in over `CROSSFADE` (0.1 s) where the old makes sound of its own, an oscillator or a noise running, else left to ring out unfaded, the copies added and the values set told the new again, the old let go after `RING_OUT` (8 s), a copy let go forgotten; a preset that changes a setting built again with it (`withSettings()`); its placeholders by address; disposed, its sources stopped, its nodes disconnected; times the context's (`built.ts`, its parts `parts.ts`) |
| `CROSSFADE`, `RING_OUT`, `fadedThrough()`, `disconnectFrom()` | a rebuild's crossfade and ring-out, the synth's and the FX library's too; a build's outputs led through a fade, put in only where one's needed (`rebuild.ts`) |
| `automate()` | a param told its automation from a time, each event as Web Audio schedules it; the engine's too (`automation.ts`) |
| the blocks (`blocks/`) | an oscillator and a noise running from the moment they're built, what they play into gating them; a gain; a filter, biquads in series, one at 12 dB an octave, two at 24, their Qs the filter block's, a lowpass's and a highpass's in Web Audio's dB, its frequency and resonance each one param on every stage; a pan by its law, a stereo panner up-mixed or a pan pot, a gain where the context can't pan; a delay made for its longest time, its time three params moving its one delay line, synced its note at the beat, free its ms, following a new tempo while synced, gliding by 0.3 s unless told otherwise, a signal wired into its ms into the line's own time, in seconds (LAY9b); a reverb's impulse by its length; a limiter, drive into a compressor and back, its makeup taken back |
| `Making`, `valueOf()`, `settingOf()`, `atValues()` | what a block's maker is handed: the context, its buffers, the beat, whether it can pan, and the hands that keep what it makes and start a source; a block's values and settings read from its node, set on what's built (`making.ts`) |
| `BuiltNode` | a node built, one of Web Audio's or one made of several, in one shape: its way in and out, its params by the plan's names, the Web Audio params a sound cabled into one goes into, several where one param moves several (`built-node.ts`) |
| `ParamInUnits`, `Automatable` | a param in a plan's units, each change made to every Web Audio param behind it in its own (`param-units.ts`) |
| `Buffers`, `noise()`, `impulse()` | the buffers a noise or a reverb plays, each made once by what it is and how long; their samples, pure (`buffers.ts`) |
| `biquadOf()`, `panOf()`, `limiterNodes()`, `makeupOf()` | a biquad its Q a plain ratio, a pan by its law, a limiter from several, Web Audio's makeup taken back; the engine's too (`blocks/`) |

Tested in node, in its `test/` folder, on the stand-in for Web Audio there (`test/audio-stand-in.js`, which the engine's tests and those on it reach through the engine's `test/audio-stand-in.js`): the Utility built between a source and where it goes; each block made by its kind; a placeholder, the format's desk's channels with no inside among them; what's built taken apart (`test/builder.test.js`); set by address, a macro onto its targets, a filter's on every stage, a delay's time and a new tempo, automated, a preset sent, what's refused (`test/set.test.js`); a pool's copies, an instrument's voices and a desk's channels, added, set by their own addresses and let go, what's refused (`test/pool.test.js`); built again, what only processes sound left to ring out, what makes its own faded, what was told kept, a copy let go forgotten, a preset changing a setting (`test/rebuild.test.js`).
