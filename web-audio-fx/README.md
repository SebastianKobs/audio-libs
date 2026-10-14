# web-audio-fx

FX modules in Web Audio, chained between two points of the mixer's (`libs/web-audio-mixer/`): an FX channel's, a strip's inserts, the master's. A package of its own since X2, moved out of `sound/`, on the synth, the audio plan and the engine (`libs/synth/`, `libs/audio-plan/`, `libs/web-audio-engine/`); it makes no node itself, but connects the nodes the engine built, so another engine needs its own. An FX module is a patch (`libs/synth/`, with `effect: true`) with an input and an output: one effect. So it's data until the engine builds it, it can be drawn by the editor's flow, and it goes to another platform as data.

The blocks it's made of are the synth's: a delay line (`delay`: its time, a note value, its feedback, and its tone, a lowpass in its loop), a reverb (`reverb`: a convolver with an impulse response the engine makes), and the synth's others, such as an `lfo` wobbling a delay's time.

The inserts' modules, one of each kind (`inserts.ts`): `GAIN`, the gain block, at 1, and `PAN`, the pan block, a mono sound up-mixed to stereo first, centred, which the mixer's stages are built from (F5); `PAN_POT`, a Pan whose pan is a pan pot, a mono sound panned as it comes, a voice's pan (`sound/space/`, F6c); `UTILITY`, the two combined, as data, a gain and a pan, centred; `FILTER`, a lowpass, its Q and cutoff params; `LIMITER`, as Ableton's on the master, its gain in dB, its ceiling in dBFS and its release in s, starting at `LIMITER_SETTINGS` (16 dB, −0.3 dBFS, 0.3 s). How each one's device shows its params, as a plugin describes its own, is `INSERTS`: each param's name, unit, range and step, a gain shown in dB (F4c), declared beside its module's patch, the Utility's the Gain's and the Pan's combined as its patch is, their defaults the patch's params (I1a2); and the port each param is set at on its chain, by the param's name (`ports`), none for one set only as it's built, a Filter's resonance.

One module built on its own into where its sound goes, as the mixer's sum and master are (`module.ts`, `BuiltModule`): `new BuiltModule(engine, { patch, params, into })`, its way in and out (`input`, `output`), a port glided through its plan's controls (`set(port, value, tc, from)`, from a time to come where it's given one, since V3), set at a time (`setAt(port, value, at)`) or now (`setNow(port, value)`), as an `FxChain`'s, so it's a stage an emitter sets (`sound/space/`, F6b), a port it hasn't left alone; or given events of its own (`automate(port, events)`); a port's value now read back (`value(port)`); let go of once nothing plays into it (`letGo()`), a note's own stages' (`NoteStages`, `libs/web-audio-synth/`, `sound/space/`'s until V3; a spot's, F6c, until G0c3).

As they play, as `libs/web-audio-synth/`'s `Patches` has the instruments: `FxModules` (`modules.ts`), copies of the modules handed in, by name, an edit rebuilding every chain that plays one (`playedBy(chain, names)`), a reset bringing back the one it started from; and `DeviceParams` (`device-params.ts`), each device by its name, its params a live copy of its start (`add(device, { start, ports, specs })`), read as its chain is built (`paramsOf(device)`) and set by param on the chain that plays it (`playedBy(device, chain)`, `set(device, param, value)`): at the port its module declares, gliding, or the chain rebuilt where it has none (a delay's time, a Filter's resonance); a param declared in beats (`TEMPO_TIME`) played as the note length it matches, or seconds at the beat; `current(device)` and `start(device)` handed out as copies, a reset the start played again.

```ts
import { FxChain } from './index.ts';
const ch = mixer.fx('delay 1', { level: 0.8, pan: -0.45, sends: { reverb: 0.4 } });
const chain = new FxChain(engine, {
  between: ch,
  modules: [{ name: 'delay', patch: delayPatch, params: () => ({ time: '1/8', feedback: settings.feedback }) }],
  context: { beat: 60 / bpm, random: Math.random },
});
chain.tempo(60 / newBpm);                      // its time follows the beat, gliding
chain.set('delay.feedback', 0.6);              // a port of every module that has it, gliding
chain.rebuild();                               // after its patch was changed: the old one rings out first
```

| | |
|---|---|
| `new FxChain(engine, { between, modules, context })` | plans each module (`modules`: `{ name, patch, params }`, `params` a function, read each time it's built) and builds them between two points (`between`): where it starts (`input`) and its way out (`chainOut`), an FX channel's `input` and its inserts or `level`, or any other two, each into the next. `context`: a beat's length, for note values, and `random()`; a module plays no note |
| `tempo(beat)` | what follows the beat glides there: a delay line's time (its patch's `handle.tempo`, with its `tc`) |
| `set(port, value, timeConstant)` | glides a port of every module that has it (0.05 s) |
| `setAt(port, value, at)` | sets a port of every module that has it at a time, at once: a tower's cutoff at a phrase's first note |
| `setNow(port, value)` | sets it now, as a param's value is set: a replay track's air and Utility, as its emitter is made |
| `points()`, `readings()` | what its modules' nodes offer to read, as built: the points a meter reads inside them, by name (a limiter's `in`, after its gain, and `out`), and what they say of themselves, by name, each read as the chain is built now (a limiter's `reduction`); none where no node offers one |
| `paramOf(port)`, `nodeOf(port)` | the param and the node offering a port, as they were built, the first module's that has it, or none: for what shows it, records it or reads it (the master's limiter's points and reduction) |
| `time()`, `feedback()` | the first delay line's time now, in seconds, and its feedback |
| `rebuild()` | plans and builds the chain again, from its patches as they are now: the new one beside the old, the input moved over to it, and the old one let go once it has rung out (`RING_OUT`, 8 s), its LFOs stopped |
| `plans()` | its modules' plans, for an editor's flow |

Times start at the context's now. Tested in node (`test/fx.test.js`, on the engine's stand-in for Web Audio; those on a theme's modules, or built into the mixer's FX channels, in `mockup/test/unit/fx.test.js`); what the garden builds with it is held to the recordings (`shared/test-vectors/instruments/`).
