# params

A param as a plugin describes its own, apart from any view, and where its value lies on a control. A package of its own since U2c4a2, out of `libs/synth/`; it imports nothing.

```ts
import { positionOf, valueAt, type ParamSpec } from './index.ts';
const level: ParamSpec = { name: 'level', range: [-60, 6, 0.1], dB: true, taper: 'fader' };
positionOf(level, 1);   // 2/3: unity two thirds up, by the fader law
valueAt(level, 1);      // 2: +6 dB at the top
```

| File | What it does |
|---|---|
| [`spec.ts`](spec.ts) | `ParamSpec`: a param's name, unit, range, choices, default, whether a gain shown in dB, its taper; `specAt()`, a value's spec by its path |
| [`taper.ts`](taper.ts) | A position on a knob, a lane or a CC turned into a value and back, by the param's taper: the fader law, octaves or a line |

Its tests, in `test/`, run in node.
