# build/web-audio

The builder for Web Audio: handed a plan, where its sound goes and where its inputs come from, it builds it and hands back what's built, the ports' `Builder` and `Built` (`libs/build/ports/`). A package of its own since LAY8a. It reads only the plan's format and its blocks (`libs/plan/format/`, `libs/plan/blocks/`), and knows no planner, channel, desk, effect or instrument. With the engine it takes over from (`libs/web-audio-engine/`, until LAY16), it's the only code that makes Web Audio nodes; the engine's node as built, its params in a plan's units, its limiter, pan, biquad and buffers are this library's, the engine on them.

```ts
import { WebAudioBuilder } from './index.ts';
const builder = new WebAudioBuilder({ context, beat: () => 60 / bpm });
const built = builder.build(plan, { into: context.destination, from: { in: source } });
built.placeholders; // what it couldn't make, by address: an envelope, until it's built
built.dispose();    // its sources stopped, its nodes disconnected
```

How a plan is built:
1. each block made by its kind (`blocks/makers.ts`), at its values and settings as they start;
2. a block it can't make a placeholder, a gain at 1, its sound passed straight through, a source with nothing coming in silent, said by its address;
3. each composite opened, no node of its own: its wires made by names, its inputs the children's inputs and params they lead to, its outputs the children's outputs that lead to them (`wiring.ts`);
4. its inputs fed from where they come from, its main output into where it goes.

| | |
|---|---|
| `WebAudioBuilder`, `WebAudioOptions`, `WebAudioWhere` | made with the context, the beat's length now, the random its noise is drawn from; `build(plan, { into, from })` (`builder.ts`) |
| `WebAudioBuilt` | what it hands back: its placeholders by address; disposed, its sources stopped, its nodes disconnected (`built.ts`, its parts `parts.ts`) |
| the blocks (`blocks/`) | an oscillator and a noise running from the moment they're built, what they play into gating them; a gain; a filter, biquads in series, one at 12 dB an octave, two at 24, their Qs the filter block's, a lowpass's and a highpass's in Web Audio's dB, its frequency and resonance each one param on every stage; a pan by its law, a stereo panner up-mixed or a pan pot, a gain where the context can't pan; a delay made for its longest time, its time by the beat, synced or free; a reverb's impulse by its length; a limiter, drive into a compressor and back, its makeup taken back |
| `Making`, `valueOf()`, `settingOf()`, `atValues()` | what a block's maker is handed: the context, its buffers, the beat, whether it can pan, and the hands that keep what it makes and start a source; a block's values and settings read from its node, set on what's built (`making.ts`) |
| `BuiltNode` | a node built, one of Web Audio's or one made of several, in one shape: its way in and out, its params by the plan's names, the Web Audio params a sound cabled into one goes into, several where one param moves several (`built-node.ts`) |
| `ParamInUnits`, `Automatable` | a param in a plan's units, each change made to every Web Audio param behind it in its own (`param-units.ts`) |
| `Buffers`, `noise()`, `impulse()` | the buffers a noise or a reverb plays, each made once by what it is and how long; their samples, pure (`buffers.ts`) |
| `biquadOf()`, `panOf()`, `limiterNodes()`, `makeupOf()` | a biquad its Q a plain ratio, a pan by its law, a limiter from several, Web Audio's makeup taken back; the engine's too (`blocks/`) |

Tested in node, in its `test/` folder, on the stand-in for Web Audio there (`test/audio-stand-in.js`, which the engine's tests and those on it reach through the engine's `test/audio-stand-in.js`): the Utility built between a source and where it goes; each block made by its kind; a placeholder, the format's desk's channels with no inside among them; what's built taken apart (`test/builder.test.js`).
