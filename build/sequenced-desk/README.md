# build/sequenced-desk

A mixing desk (`libs/build/desk/`) played from a sequencer, on the clock: its strips' controllers set on time, its tracks' channels, its own control surface. Its owner plans the desk (`libs/plan/desk/`), makes it once with its setup's rules and the clock, and hands it a function that builds the plan where it wants it. It knows no setup's names: a setup hands in its rules (`DeskSetup`, `libs/build/desk/`). As a console, it has its own parts, made with it: its strips' controls, its tracks' channels; its owner talks to the desk alone. It imports `libs/automation/`, `libs/build/desk/`, `libs/build/desk-channels/`, `libs/clock/`, `libs/midi/`, `libs/params/`, `libs/plan/desk/`, `libs/plan/format/` and `libs/util/`.

```ts
import { SequencedDesk } from './index.ts';
const desk = new SequencedDesk<WebAudioBuilt>({ plan, setup, clock, at });
desk.set(['tap', 'volume'], 0.5); // kept, told what's built once it is
desk.build((planned) => builder.build(planned, { into: output.node })); // the settings changed before in it, the mix applied
desk.inputOf('lead/3'); // a track's instrument's way in, its channel its pool's copy, added the first time
desk.control('tap', { type: 'controller', controller: 'volume', value: 0.4, t }); // on time, gliding
desk.control('tap', { type: 'controller', controller: 'mute', value: 1, t }); // the live mix's, at its time
desk.mixState(); // { muted: Set {'tap'}, soloed: Set {} }
```

| | |
|---|---|
| `SequencedDesk` | the desk as its owner holds it, made as `DeskMaking` says (not exported), made with its plan, its setup's rules, the clock, a time on what's built's clock: a mixing desk (`libs/build/desk/`'s `MixingDesk`), and its own parts; `control()`, `glides()`, `isStripTrack()`, its strips' controls; `inputOf()`, a track's channel (`sequenced-desk.ts`) |
| `CuedControls` | its strips' controls: a controller set as its param's address on the strip (`libs/plan/desk/`'s `controlAddress()`), a track's channel's where its notes set it, a strip's mute and solo the live mix's, any other the desk's, checked as it comes, one no strip has refused, naming it; held on the clock's cues (`libs/clock/`'s `Cues`), one that glides its lead ahead of its time, a switch, a choice and a param its spec says never glides (a delay line's time) at their time; whether a control glides there, as a knob's move is smoothed; which tracks are its own strips (`cued-controls.ts`, the sequenced desk's own, not exported) |
| `DeskSurface` | the desk's own control surface: a strip's control moved by hand, a view's fader or a panel's knob, played into the input handed in (a sequencer) as a controller on the strip's track, now, so it's recorded as every controller is: gliding there where the desk says (`glides()`), a switch, a choice or a delay line's time at once; the stream's label for the track handed in, none for a strip of the desk's own; each move told (`onControl()`), the playback passing that lane over while it plays back (`desk-surface.ts`); a desk's edit by address as a message on a bus (`edit()`, the `DeskMessage` of `libs/build/desk/`): a param played in as its strip's controller, a choice by its index, a setting the desk built again with it |

Tested in node, in its `test/` folder, through the sequenced desk, as its owner uses it, on the desk library's stand-in for what's built (`libs/build/desk/test/built.js`) and small studio (`libs/plan/desk/test/desks.js`): a strip's controller to a track's channel or held for the desk, ahead or at its time, a mute and a solo the mix's, one no strip has refused, whether a control glides (`test/cued-controls.test.js`); a move by hand played in as a controller, gliding where the desk says, with its label, told (`test/desk-surface.test.js`).