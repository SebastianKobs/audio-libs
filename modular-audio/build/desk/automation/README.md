# modular-audio/build/desk/automation

The desk's automation, a package fitted to a mixing desk, as a copy of whoever operates it: a strip's controllers set on time, as motors turn the faders; a note's own controllers on its track's channel among them; a move by hand sent out to be recorded, as touch sensing does. The desk works without it. Its owner makes the desk, then fits the automation to it with the setup's rules and the clock.

Depends on: `base/automation`, `base/params`, `base/util`, `midi/protocol`, `modular-audio/build/desk/mixing`, `modular-audio/plan/desk`, `modular-audio/plan/format`, `sequencing/clock`.

```ts
import { DeskAutomation } from './index.ts';
// plan, setup, clock, at, builder, output and t are the desk owner's
const desk = new MixingDesk<WebAudioBuilt>({ plan });
const automation = new DeskAutomation({ desk, setup, clock, at }); // fitted to the desk
desk.build((planned) => builder.build(planned, { into: output.node })); // built where its owner wants it
automation.control('tap', { type: 'controller', controller: 'volume', value: 0.4, t }); // on time, gliding
automation.control('tap', { type: 'controller', controller: 'mute', value: 1, t }); // the live mix's, at its time
desk.mixState(); // { muted: Set {'tap'}, soloed: Set {} }
```

How a controller reaches the desk:

1. It is set as its param's address on the strip (`controlAddress()` in `modular-audio/plan/desk/`), or on a track's channel where the setup says its notes set it (`setBy()`).
2. A strip's mute and solo are the live mix's, any other controller the desk's. One no strip has is refused, naming it.
3. It is held on the clock's cues. A change that glides is set its lead ahead of its time; a switch, a choice and a param its spec says never glides (a delay line's time) are set at their time.

| Export | What it does |
|---|---|
| `new DeskAutomation({ desk, setup, clock, at })`: `control()`, `glides()`, `isStripTrack()` | A strip's controls set on time. `control(strip, controller)` holds a controller on the clock's cues; `glides()` says whether a control glides there, as a knob's move is smoothed; `isStripTrack()` whether a track is one of the desk's own strips (`desk-automation.ts`). |
| `Change`, `whenOf()` | A change to a param by its address: its value, when it lands, gliding where it says. `whenOf()` puts it on the audio's clock, at its time if it's to come, else now (`change.ts`). |
| `new DeskSurface({ desk, automation, clock, input, label })`: `control()`, `edit()`, `onControl()` | The desk's own control surface: a strip's control moved by hand, played into the input handed in (a sequencer) as a controller on the strip's track, so it's recorded as every controller is. `edit()` takes a desk's edit by address as a message on a bus; `onControl()` tells each move, so the playback can pass that lane over (`desk-surface.ts`). |

Tests: `test/desk-automation.test.js` and `test/desk-surface.test.js`, on a mixing desk, the stand-in for what's built in `modular-audio/build/desk/mixing/test/built.js` and the desk library's small studio in `modular-audio/plan/desk/test/desks.js`.
