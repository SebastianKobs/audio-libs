# params

A param as a plugin describes its own, apart from any view, and where its value lies on a control. A package of its own since U2c4a2, out of `libs/synth/`; it imports only `libs/util/`.

```ts
import { positionOf, valueAt, type ParamSpec } from './index.ts';
const level: ParamSpec = { name: 'level', range: [-60, 6, 0.1], dB: true, taper: 'fader' };
positionOf(level, 1);   // 2/3: unity two thirds up, by the fader law
valueAt(level, 1);      // 2: +6 dB at the top
```

| File | What it does |
|---|---|
| [`spec.ts`](spec.ts) | `ParamSpec`: a param's name, unit, range, choices, default, whether a gain shown in dB, its taper; `specAt()`, a value's spec by its path; `isParamSpec()`, a param's, not a part's; a choice by its index, as a controller carries it, and back (`choiceAt()`, `choiceIndex()`, LAY3b) |
| [`taper.ts`](taper.ts) | A position on a knob, a lane or a CC turned into a value and back, by the param's taper: the fader law, octaves or a line; a param with choices a step each, by its index (LAY3c) |
| [`decibels.ts`](decibels.ts) | A gain in dB and back (`gainOf()`, `dBOf()`), and the floor of silence, -80 dB (`SILENCE`): what the engine's limiter, the synth's ramps and the views' meters and knobs share (DRY3) |
| [`time.ts`](time.ts) | A time with a sync switch, as Ableton's (LAY3a): synced, a note value following the tempo, free, in ms for a length or Hz for a rate, both kept, the switch choosing (`Time`); declared as three params side by side, each its own control and lane, `sync` a switch, `note` the note values it steps through (`NOTE_VALUES`, shortest first, a 16th triplet to a dotted half), its free one named by its unit, `ms` or `hz`, by octaves (`timeSpecs()`); its seconds the clock's (`libs/clock/`'s `timeSeconds()`); its three found among a part's keys (`timeParamsIn()`, `TimeParams`, LAY3c), as the device view draws them |
| [`common.ts`](common.ts) | The specs modules share, each spreading its own copy under its own name: a fader's gain (`FADER_GAIN`), a pan (`PAN`), a switch (`SWITCH`); a desk's strip, the FX modules and the synth's pan (DRY3) |
| [`strip.ts`](strip.ts) | A channel strip's own params (`STRIP_PARAMS`): its volume by the fader law, its pan, its mute and solo, each at its start; a send's amount (`SEND_PARAM`), 0 until turned up. Shared by `libs/plan/desk/`'s channels and `libs/desk-plan/`'s keys, moved here in LAY10b2 |

Its tests, in `test/`, run in node.
