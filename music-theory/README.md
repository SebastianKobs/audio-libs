# music-theory

Notes and keys, as numbers: a note is a MIDI note number, a key its root, a note, and its scale, its steps in semitones from the root in one octave. A package of its own since W1b, moved out of `sound/`: music, not sound, so the synth, the garden and the tool use it alike. It imports nothing.

```ts
import { SCALES, chordNote, degreeNote, mtof, type Key } from './index.ts';
const dMajor: Key = { root: 62, scale: SCALES.majorPentatonic };
degreeNote(5, dMajor);              // 62: a degree counts the scale from an octave below the root
chordNote({ semi: -24 }, dMajor);   // 38: a chord's note, semitones from the root, or else a degree
mtof(69);                           // 440
```

| | |
|---|---|
| `mtof(note)` | a note's frequency, equal temperament on A 440 (`pitch.ts`) |
| `chordNote(note, key)`, `ChordNote` | a chord's note in a key: `{ semi }`, semitones from the root, or else `{ degree }`, a degree of its scale (`pitch.ts`) |
| `Key` | a key: its `root`, a MIDI note, and its `scale` (`scales.ts`) |
| `SCALES` | scales as their steps: major and minor pentatonic, Lydian, and a harmonic pentatonic, partials 8, 9, 10, 12 and 14 in pure intervals, after Stockhausen's "Stimmung" (`scales.ts`) |
| `degreeNote(degree, key)` | a degree's note: degree 0 is the root an octave down, one scale's length on the root itself, a negative degree on down (`scales.ts`) |

Tested in node, in its `test/` folder (`test/theory.test.js`). The garden's own use of it, a degree's note held under its highest and a height's degree, is the garden's (`garden-surface/music.ts`); the moods, each a key, are the tool's (`tool/config/moods.ts`).
