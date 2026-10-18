# clock

The one clock: everything asks it what time it is, and nothing reads another time source. A package of its own since R12, moved out of `sound/`: music time for anything, a sound, an animation synced to the beat, an event quantized to the grid; the sound system uses it as the garden and the tool do. One timeline, in seconds of page time, the browser's own steady clock, which pointer events and frames already arrive on.

```js
import { Clock } from './index.ts';
const clock = new Clock({ settings: { bpm: 72, swing: 0, swingOn: '16ths', quantize: '1/16' } });   // read live: change them, and it follows
clock.start();                                   // the ticks, from a worker, so they keep going in a hidden tab
clock.onStep((i, t) => { /* the 16th i sounds at t, swung, scheduled a little ahead */ });
clock.useAudio(audioContext);                    // the grid starts with the audio, standing at its first 16th until then, and clock.audio.toContext(t) maps onto its time
const { at, on } = clock.snap(clock.now(), { nearest: true, late: 0.05 });   // a tap: when it sounds, and the step it belongs to
```

| | |
|---|---|
| `new Clock({ settings })` | the clock (`clock.ts`, `Clock`; `index.ts` its entry), with an object it reads live: `bpm`; `swing`, 0 straight, 1 a triplet swing, 2 twice as late; `swingOn`, `'16ths'` or `'8ths'`; `quantize`, the grid `snap()` uses unless told another; `meter` |
| `now()`, `fromEvent(ms)` | the time; a pointer event's `timeStamp` on the same timeline |
| `grid.hold(t)`, `grid.release(t)`, `grid.held`, `grid.heldAt` | the transport's stop (P1): the grid's place, the song position, kept while the clock's time runs on, `straightAt()` giving it from the time held on, a time before it where it was (P2), no 16th handed out; the place the first 16th not handed out yet, those before it already played, so nothing jumps; released, going on from there, its next 16th at once; `grid.holdFrom(t)` holding it from a time on, the 16ths before it handed out, none from it (P3b) |
| `grid.songTime(t)`, `grid.timeOfSong(song)`, `grid.song` | a clock time's song time, the time the music played up to it, the grid's holds taken out, a stop's or the live garden's while the arrangement played back, its holds kept for the `HISTORY`, half an hour, and a minute more; within a hold, where the music stood, at the 16th it was held at, those handed out before it playing on; held now, all from it at it; never, never; and back (P3b); `grid.song` the same as a `TimeMap`, `{ toTimeline(t), fromTimeline(along) }`, for what plays along a timeline (DRY2) |
| `start()`, `onTick(fn(t))` | the ticks, about every 25 ms |
| `new Cues({ timeOf, handOn, lead })`: `hold(item)`, `cue(item, now)`, `tick(now)` | items held until a tick brings their time, less a `lead` where one's given, then handed on in their order, those at one time as they came (`cues.ts`, LAY2): held even if its time has come, or cued, handed on at once if it has; the ticks the owner's, the clock's (the desk's changes) or a frame's (the garden's visuals). On util's `DueQueue` |
| `onStep(fn(i, t))` | every 16th of the grid, with its swung time, `LOOKAHEAD` (0.12 s) ahead. Missed steps are skipped, and the grid keeps its place |
| `grid`: `stepDuration()`, `swingAt(i)`, `straightAt(t)`, `stepAt(t)`, `timeAt(s)`, `straightTime(s)`, `meter()`, `nextStepTime`, `nextStepNumber`, `running` | the beat grid (`beat-grid.ts`, `BeatGrid`): places on it are kept straight, and played with the swing as it is now; it runs once the audio starts it, and until then stands at its first 16th, where the music will start, whatever the time |
| `grid`: `stepsPerBeat()`, `stepsPerBar()`, `beatDuration()`, `secondsOf(ticks)`, `ticksIn(seconds)`, `ticksAt(t, { straight })`, `timeOfTicks(ticks, { straight })`, `nextLine(t, steps)` | a beat and a bar by the meter, 16ths to each and a beat's length; ticks at the tempo in seconds and back; a time near now as whole ticks on the grid, swung or straight, and back; the next line of so many 16ths at or after a time, the next beat or bar (DRY2) |
| `PPQ`, `STEP`, `COMMON_TIME`, `barTicks(meter)`, `beatTicks(meter)`, `startsBar(i, meter)` | time in ticks (`ticks.ts`): 96 to a quarter, 24 to a 16th, as a MIDI file's; 4/4, the time signature with none given; a bar's and a beat's length in ticks, whether a 16th starts a bar (DRY2, from `libs/sequencer/`) |
| `timeSeconds(time, beat)` | a time with a sync switch (`libs/params/`'s `Time`) in seconds, by the beat's length (`note-values.ts`, LAY3a): synced, its note value at the beat; free, its milliseconds, or a rate's one turn at its hertz |
| `noteValueBeats(written)` | a note value as written, `'1/4'`, dotted `'1/8.'`, a triplet `'1/8t'`, in beats (`note-values.ts`): the tap grids' steps, the synth's times (DRY2) |
| `snap(t, { straight, nearest, late, grid })`, `quantize()` | where a time lands on a grid (`quantizer.ts`, `GRIDS`: off, 1/4, 1/4t, 1/8, 1/8t, 1/16, 1/16t; triplets always straight): `{ at, on }` |
| `TempoMessage`, `{ type: 'tempo', bpm }` | the tempo told, as the app's bus carries it: the beat grid's tempo now, as the settings it reads have it; what follows the tempo follows it as it hears it (`messages.ts`, SHAPE3a) |
| `useAudio(context)`; `audio`: `started()`, `toContext(t)`, `fromContext(c)`, `contextNow()`, `soonest()`, `latency()`, `settled()` | the edge to Web Audio (`audio-clock.ts`, `AudioClock`), from when its context is handed over: the offset to the context's time, found on every tick, never mapping into the audio's past; while the context doesn't run, its time standing still, mapping to where it stands |
| `useFake(t0)`, `advance(s, { ticks })`, `faking()` | fake mode, for tests: time moves only when told, and every tick and step of the time passed runs in order |

A frame time is the caller's: the tool's (`tool/clock.ts`, `FrameClock`) keeps `time` and `step`, set each frame by `advance(ms)`, and hands them to the garden's (`garden-surface/frame-time.ts`), which has its motion time and visuals on a note's time (`garden-surface/visuals.ts`). Tested in node, in its `test/` folder, on a clock and settings of its own (`test/clock.test.js`), with vectors in `shared/test-vectors/clock/`; the frame times and a note's visuals in the tool's tests (`mockup/test/unit/frame-time.test.js`). How it works: `mockup/architecture/clock-and-gestures.md`.
