# build/desk/automation

The desk's automation, a package fitted to a mixing desk (`libs/modular-audio/build/desk/mixing/`), as a copy of whoever operates it: a strip's controllers set on time, the motors; a note's own controllers on its track's channel among them; a move by hand sent out to be recorded, the touch sensing. The desk works without it. Its owner plans the desk (`libs/modular-audio/plan/desk/`), makes it, then fits the automation to it with the setup's rules and the clock. It knows no setup's names: a setup hands in its rules (`DeskSetup`, `libs/modular-audio/build/desk/mixing/`). It imports `libs/base/automation/`, `libs/modular-audio/build/desk/mixing/`, `libs/sequencing/clock/`, `libs/midi/protocol/`, `libs/base/params/`, `libs/modular-audio/plan/desk/`, `libs/modular-audio/plan/format/` and `libs/base/util/`.

```ts
import { DeskAutomation } from './index.ts';
const desk = new MixingDesk<WebAudioBuilt>({ plan });
const automation = new DeskAutomation({ desk, setup, clock, at }); // fitted to the desk
desk.build((planned) => builder.build(planned, { into: output.node })); // built where its owner wants it
automation.control('tap', { type: 'controller', controller: 'volume', value: 0.4, t }); // on time, gliding
automation.control('tap', { type: 'controller', controller: 'mute', value: 1, t }); // the live mix's, at its time
desk.mixState(); // { muted: Set {'tap'}, soloed: Set {} }
```

| | |
|---|---|
| `DeskAutomation` | a strip's controls: a controller set as its param's address on the strip (`libs/modular-audio/plan/desk/`'s `controlAddress()`), a track's channel's where its notes set it (the setup's `setBy()`), its channel added as it comes but a live track's, a strip's mute and solo the live mix's, any other the desk's, checked as it comes, one no strip has refused, naming it; held on the clock's cues (`libs/sequencing/clock/`'s `Cues`), one that glides its lead ahead of its time, a switch, a choice and a param its spec says never glides (a delay line's time) at their time; whether a control glides there, as a knob's move is smoothed; which tracks are the desk's own strips (`desk-automation.ts`) |
| `Change`, `whenOf()` | a change to a param by its address: its value, when it lands, gliding where it says; `whenOf()` puts it on the audio's clock, at its time if it's to come, else now (`change.ts`) |
| `DeskSurface` | the desk's own control surface: a strip's control moved by hand, a view's fader or a panel's knob, played into the input handed in (a sequencer) as a controller on the strip's track, now, so it's recorded as every controller is: gliding there where the automation says (`glides()`), a switch, a choice or a delay line's time at once; the stream's label for the track handed in, none for a strip of the desk's own; each move told (`onControl()`), the playback passing that lane over while it plays back (`desk-surface.ts`); a desk's edit by address as a message on a bus (`edit()`, the `DeskMessage` of `libs/modular-audio/plan/desk/`): a param played in as its strip's controller, a choice by its index, a setting the desk built again with it |

Tested in node, in its `test/` folder, on a mixing desk and the desk library's stand-in for what's built (`libs/modular-audio/build/desk/mixing/test/built.js`) and small studio (`libs/modular-audio/plan/desk/test/desks.js`): a strip's controller to a track's channel where its notes set it, or held for the desk, ahead or at its time, a mute and a solo the mix's, one no strip has refused, whether a control glides (`test/desk-automation.test.js`); a move by hand played in as a controller, gliding where the automation says, with its label, told (`test/desk-surface.test.js`).
