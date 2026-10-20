# build/desk

A desk built and set by address, a package of its own since SHAPE1b2: what a desk does as it plays, on what any builder hands back (the contract's `Built`, `libs/build/contract/`), beyond it its ways in (`DeskBuilt`), with no clock and no sequencer. The view models read it through a desk's readout (`libs/view/mixer/readout/`'s `deskReadout()`). Its owner plans it (`libs/plan/desk/`), makes it once with its setup's rules, and hands it a function that builds the plan where it wants it: the app's builds it with the Web Audio builder, into an output that fades in (`libs/build/web-audio-engine/`'s `AudioPower`). It knows no setup's names: a setup hands in its rules (`DeskSetup`). Played from a sequencer, on the clock, it is `libs/build/sequenced-desk/`'s `SequencedDesk`, which extends `MixingDesk`.

```ts
import { MixingDesk } from './index.ts';
const desk = new MixingDesk<WebAudioBuilt>({ plan });
desk.set(['tap', 'volume'], 0.5); // kept, told what's built once it is
desk.build((planned) => builder.build(planned, { into: output.node })); // the settings changed before in it, the mix applied
desk.mute('tap', true); // the live mix's, a mute taking along what feeds the strip
desk.mixState(); // { muted: Set {'tap'}, soloed: Set {} }
```

| | |
|---|---|
| `MixingDesk` | the desk built, set by address and mixed, no clock and no sequencer: its state's; `build()`, the mix applied; `channelOf()`, a track's channel added, the mix applied to it; `mute()`, `solo()`, the live mix's; `mixState()`, the strips muted and soloed now (`mixing-desk.ts`) |
| `DeskState`, `DeskBuilt`, `WayIn`, `Wiring` | what the parts work on: its plan, built by the function handed in, its settings changed before in it; a way into each of its own inputs (`bus`); every value set by its address and kept, a choice by its index kept as its choice, told what's built where it plays; a track's channel its pool's copy, added the first time it's asked for once built, what was set on it before told; its copies, its wiring with them; settings as a preset; the tempo, one unchanged passed over; whether a strip is one of its own channels (`desk-state.ts`, `Desk` itself until SHAPE1b2's recomposing; `DeskState` not exported, `MixingDesk` extends it) |
| `Mix` | the live mix's mute and solo, as Ableton's, on every track by its key: a mute taking along what feeds the strip muted, its sends among them, a solo keeping what a soloed strip needs to be heard, never an FX bus (`libs/plan/desk/`'s `silenced()`); what's silenced cut on its channel, gliding, as the desk is built and as each track's channel is added (`mix.ts`, the mixing desk's own, not exported) |
| `DeskSetup` | what a setup hands in: whether a track is set live or by its notes, by its name; what sets a param on a track by its notes, in words a view shows, none where its notes don't (`setBy()`, SHAPE5a0c4b, was `setByNotes()` and the setup's `roleOf()`, `SlotRole` gone); what a slot does and how it's set worked out from these and the plan (`libs/view/mixer/readout/`'s `deskReadout()`) (`setup.ts`) |
| `DeskMessage` | a desk's edit by address, as the app's message: a param's value or a setting (`desk-edit.ts`) |

Tested in node, in its `test/` folder, through the mixing desk alone, as its owner uses it, on a stand-in for what's built (`test/built.js`) and the desk library's small studio (`libs/plan/desk/test/desks.js`): the desk built by the function handed in, its ways in, the values set before told; a track's channel added once, what was set on it before told; a value kept and told, a choice kept as its choice; settings as a preset, the tempo, one unchanged passed over (`test/desk.test.js`); the mix, a mute, a bus's taking along what feeds it, a solo, a track's channel cut as it's added (`test/mix.test.js`).
