# midi/note-map

A note map as data, for any sampler with articulations: instrument → articulation → variant → a MIDI note, with a controller's value to send with it where the sampler needs one. A variant is a hand, `right`, `left` or `either`, or a direction, `up` or `down`. Each level falls back: an articulation to another of its instrument, a variant to `either`, an instrument to another. A map read from JSON is checked at the edge and refused with clear messages, and a lookup says which fallbacks it took.

Depends on: `base/util`.

```ts
import { loadNoteMap } from './index.ts';

// an example: a drum kit, as a drum sampler maps it
const data: unknown = JSON.parse(`{
  "instruments": {
    "snare": { "articulations": {
      "center": { "variants": { "right": { "note": 38 }, "either": { "note": 38 } } },
      "rimshot": { "fallback": "center" } } },
    "hi-hat": { "articulations": {
      "open": { "variants": { "either": { "note": 46, "controller": { "number": 4, "value": 0 } } } } } }
  }
}`);
const map = loadNoteMap(data, 'kit.json'); // refused with every problem, under kit.json, where it's wrong
map.lookup('snare', 'rimshot', 'left'); // note 38, from rimshot to center, then left to either
map.lookup('hi-hat', 'open'); // note 46, with controller 4 at 0
```

How a lookup looks:

1. In the instrument asked for, along its articulation's fallbacks, each tried with the variant asked for and then `either`.
2. Then along the instrument's fallbacks, each the same way. Nothing found, the lookup gives none.
3. Its fallbacks are listed by level: the instruments followed, then the articulations, then the variant.

| Export | What it does |
|---|---|
| `loadNoteMap()` | A note map from data read at the edge, and the file it came from, as a refusal names it. It refuses every field it doesn't know, notes and controller values outside 0 to 127, fallbacks to entries the map lacks and fallbacks in a loop, saying each where it is (`loader.ts`). |
| `NoteMap`: `lookup()` | `lookup(instrument, articulation, variant)`: the note found, where it was found and the fallbacks taken to it, or none; the variant `either` where none is given (`note-map.ts`). |
| `FoundNote`, `Fallback` | A note found: its `note`, its `controller` where the map gives one, its `instrument`, `articulation` and `variant`, and its `fallbacks`. A fallback is its `level` and its `from` and `to` (`note-map.ts`). |
| `NoteMapData`, `NoteController`, `Variant` | The map as a file holds it: `instruments` by name, each its `articulations` and `fallback`, each articulation its `variants` and `fallback`. A controller's `number` and `value`; a variant's name (`map-data.ts`). |

Tests: `test/lookup.test.js`, notes found and the fallbacks taken, on a drum kit and a strummed instrument as examples; `test/loader.test.js`, the checks at the edge, each refusal and its message.
