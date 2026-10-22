# build/desk/mixing

A desk built and set by address: what a desk does as it plays, on what any builder hands back (the contract's `Built`, `libs/modular-audio/build/contract/`), beyond it its ways in (`DeskBuilt`), with no clock and no sequencer; the desk's automation (`libs/modular-audio/build/desk/automation/`) is fitted to it, not part of it. Its owner plans it (`libs/modular-audio/plan/desk/`), makes it once with its setup's rules, and hands it a function that builds the plan where it wants it: a builder of its owner's choice, the Web Audio builder (`libs/modular-audio/build/web-audio/`) among them. It knows no setup's names: a setup hands in its rules (`DeskSetup`). It imports `libs/base/automation/`, `libs/modular-audio/build/contract/`, `libs/base/params/`, `libs/modular-audio/plan/desk/`, `libs/modular-audio/plan/format/` and `libs/base/util/`.

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
| `MixingDesk` | the desk built, set by address and mixed, no clock and no sequencer: its state's; `build()`, the mix applied; `channelOf()`, a track's channel added, the mix applied to it; `inputOf()`, where a track's instrument plugs into the desk: its channel's way in, made once (`ChannelInput`); `mute()`, `solo()`, the live mix's; `mixState()`, the strips muted and soloed now (`mixing-desk.ts`) |
| `ChannelInput` | where a track's instrument plugs into the desk: its channel's way in (`WayIn`), from `inputOf()` (`mixing-desk.ts`, its entry's) |
| `DeskState`, `DeskBuilt`, `WayIn`, `Wiring` | what the parts work on: its plan, built by the function handed in, its settings changed before in it; a way into each of its own inputs (`bus`); every value set by its address and kept, a choice by its index kept as its choice, told what's built where it plays; a track's channel its pool's copy, added the first time it's asked for once built, what was set on it before told; its copies, its wiring with them; settings as a preset; the tempo, one unchanged passed over; whether a strip is one of its own channels (`desk-state.ts`; `DeskState` not exported, `MixingDesk` extends it) |
| `Mix` | the live mix's mute and solo, as Ableton's, on every track by its key: a mute taking along what feeds the strip muted, its sends among them, a solo keeping what a soloed strip needs to be heard, never an FX bus (`libs/modular-audio/plan/desk/`'s `silenced()`); what's silenced cut on its channel, gliding, as the desk is built and as each track's channel is added (`mix.ts`, the mixing desk's own, not exported) |
| `DeskSetup` | what a setup hands in: whether a track is set live or by its notes, by its name; what sets a param on a track by its notes, in words a view shows, none where its notes don't (`setBy()`); what a slot does and how it's set worked out from these and the plan (`setup.ts`) |

Tested in node, in its `test/` folder, through the mixing desk alone, as its owner uses it, on a stand-in for what's built (`test/built.js`) and the desk library's small studio (`libs/modular-audio/plan/desk/test/desks.js`): the desk built by the function handed in, its ways in, the values set before told; a track's channel added once, what was set on it before told; a track's instrument's way into its channel, once; a value kept and told, a choice kept as its choice; settings as a preset, the tempo, one unchanged passed over (`test/desk.test.js`); the mix, a mute, a bus's taking along what feeds it, a solo, a track's channel cut as it's added (`test/mix.test.js`).
