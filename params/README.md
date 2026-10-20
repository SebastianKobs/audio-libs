# params

A param as a plugin describes its own, apart from any view, and where its value lies on a control. It imports only `libs/util/`.

```ts
import { positionOf, valueAt, type ParamSpec } from './index.ts';
const level: ParamSpec = { name: 'level', range: [-60, 6, 0.1], dB: true, taper: 'fader' };
positionOf(level, 1);   // 2/3: unity two thirds up, by the fader law
valueAt(level, 1);      // 2: +6 dB at the top
```

| File | What it does |
|---|---|
| [`spec.ts`](spec.ts) | `ParamSpec`: a param's name, unit, range, choices, default, whether a gain shown in dB, its taper, whether it's set at its time, never glided (`glides: false`, a delay line's time); `specAt()`, a value's spec by its path; `isParamSpec()`, a param's, not a part's; a choice by its index, as a controller carries it, and back (`choiceAt()`, `choiceIndex()`) |
| `ParamSpecs`, `RangedSpec`, `Taper` (`spec.ts`) | a module's params, or a part's, by their keys, a nested part's under its own; a param on a control, one with its range; a taper, how a position on a control, a lane or a CC maps to its value: `fader`, `octaves`, `line` |
| [`taper.ts`](taper.ts) | A position on a knob, a lane or a CC turned into a value and back, by the param's taper: the fader law, octaves or a line; a param with choices a step each, by its index |
| `faderGain(position, top)`, `faderPosition(gain, top)` (`taper.ts`) | the fader law: a position, 0 to 1, to its gain by dB, unity two thirds up with a top of 2, the bottom silence; and back |
| [`decibels.ts`](decibels.ts) | A gain in dB and back (`gainOf()`, `dBOf()`), and the floor of silence, -80 dB (`SILENCE`): what the engine's limiter, the synth's ramps and the views' meters and knobs share |
| [`time.ts`](time.ts) | A time with a sync switch, as Ableton's: synced, a note value following the tempo, free, in ms for a length or Hz for a rate, both kept, the switch choosing (`Time`); declared as three params side by side, each its own control and lane, `sync` a switch, `note` the note values it steps through (`NOTE_VALUES`, shortest first, a 16th triplet to a dotted half), its free one named by its unit, `ms` or `hz`, by octaves (`timeSpecs()`); its seconds by a beat's length (`note-values.ts`'s `timeSeconds()`), a note value in beats (`noteValueBeats()`), a synced time's free value where its note is at a beat (`freeAt()`); its three found among a part's keys (`timeParamsIn()`, `TimeParams`), as the device view draws them |
| `FreeUnit`, `TimeSpecs` (`time.ts`) | what a time's free value is in, ms or Hz; a time's three params by their names |
| [`common.ts`](common.ts) | The specs the packages share, each spreading its own copy under its own name: a fader's gain (`FADER_GAIN`), a pan (`PAN`), a switch (`SWITCH`); a desk's strip and the blocks' gain and pan |
| `isSwitch(spec)` (`common.ts`) | whether a param is a switch, off 0 or on 1, whatever its name |
| [`strip.ts`](strip.ts) | A channel strip's own params (`STRIP_PARAMS`): its volume by the fader law, its pan, its mute and solo, each at its start; a send's amount (`SEND_PARAM`), 0 until turned up. |

Its tests, in `test/`, run in node.
